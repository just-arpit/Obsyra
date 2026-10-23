import { Router, Request, Response } from 'express';
import { getComparison, getComparisonByScans, getScan, saveComparison } from '../storage/db.js';
import { compareScans } from '../comparison/comparator.js';

export const compareRouter = Router();

compareRouter.get('/:id', (req: Request, res: Response) => {
  const comp = getComparison(req.params.id);
  if (!comp) {
    return res.status(404).json({ error: `Comparison not found: ${req.params.id}` });
  }
  res.json(comp);
});

compareRouter.get('/', (req: Request, res: Response) => {
  const baselineId = req.query.baseline as string;
  const currentId = req.query.current as string;

  if (!baselineId || !currentId) {
    return res.status(400).json({ error: 'Both "baseline" and "current" query parameters are required' });
  }

  // Check if comparison already saved
  let comp = getComparisonByScans(baselineId, currentId);
  if (comp) {
    return res.json(comp);
  }

  // Compute dynamically if both scans exist
  const bScan = getScan(baselineId);
  const cScan = getScan(currentId);

  if (!bScan || !cScan) {
    return res.status(404).json({ error: 'One or both scan IDs not found in history' });
  }

  comp = compareScans(bScan, cScan);
  saveComparison(comp);
  res.json(comp);
});
