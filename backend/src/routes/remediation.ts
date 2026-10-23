import { Router, Request, Response } from 'express';
import { getScan } from '../storage/db.js';
import { geminiProvider } from '../ai/geminiProvider.js';
import { buildReadyToPastePrompt } from '../ai/promptGenerator.js';

export const remediationRouter = Router();

remediationRouter.get('/:id/remediation', async (req: Request, res: Response) => {
  const scan = getScan(req.params.id);
  if (!scan) {
    return res.status(404).json({ error: `Scan not found: ${req.params.id}` });
  }

  try {
    const plan = await geminiProvider.generateRemediationPlan(scan.findings, scan.projectName);
    res.json(plan);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate remediation plan', details: err?.message });
  }
});

remediationRouter.get('/:id/prompt', (req: Request, res: Response) => {
  const scan = getScan(req.params.id);
  if (!scan) {
    return res.status(404).json({ error: `Scan not found: ${req.params.id}` });
  }

  const promptText = buildReadyToPastePrompt(scan.projectName, scan.findings);

  if (req.query.download === 'true') {
    res.setHeader('Content-Disposition', `attachment; filename="obsyra-remediation-${scan.id}.md"`);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.send(promptText);
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(promptText);
});
