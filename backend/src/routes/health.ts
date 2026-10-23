import { Router, Request, Response } from 'express';
import { getScannerReadiness } from '../scanners/detector.js';
import { geminiProvider } from '../ai/geminiProvider.js';

export const healthRouter = Router();

healthRouter.get('/health', async (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Obsyra AI Security Reviewer Backend',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    ai: {
      configured: geminiProvider.isConfigured(),
      model: geminiProvider.getModelName(),
    },
  });
});

healthRouter.get('/scanners', async (req: Request, res: Response) => {
  try {
    const readiness = await getScannerReadiness();
    res.json(readiness);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to inspect scanner status', details: err?.message });
  }
});
