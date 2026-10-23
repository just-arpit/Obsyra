import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { safelyExtractZip } from '../intake/zipHandler.js';
import { runAllScanners } from '../scanners/orchestrator.js';
import { saveScan, getScan, saveComparison } from '../storage/db.js';
import { compareScans } from '../comparison/comparator.js';
import { ScanRecord } from '../types/scan.js';

export const fixturesRouter = Router();

const candidateFixtureDirs = [
  path.resolve(process.cwd(), 'fixtures'),
  path.resolve(process.cwd(), '..', 'fixtures'),
];
const FIXTURES_DIR = candidateFixtureDirs.find((d) => fs.existsSync(d)) || candidateFixtureDirs[0];

fixturesRouter.post('/scan-demo', async (req: Request, res: Response) => {
  const mode = (req.body.mode || req.query.mode || 'vulnerable') as 'vulnerable' | 'corrected';
  const baselineId = req.body.baselineId || (req.query.baselineId as string);

  const zipFileName = mode === 'corrected' ? 'corrected-app.zip' : 'vulnerable-app.zip';
  const zipFilePath = path.join(FIXTURES_DIR, zipFileName);

  if (!fs.existsSync(zipFilePath)) {
    return res.status(404).json({ error: `Demo fixture archive not found: ${zipFileName}` });
  }

  const scanId = `scn-demo-${crypto.randomUUID().substring(0, 8)}`;
  const projectName = mode === 'corrected' ? 'Demo Shop (Corrected Verification)' : 'Demo Shop (Vulnerable Baseline)';
  const zipBuffer = fs.readFileSync(zipFilePath);

  try {
    const extraction = safelyExtractZip(zipBuffer, scanId);

    const scanResult = await runAllScanners({
      scanId,
      targetDir: extraction.extractDir,
      relativeFiles: extraction.relativeFiles,
    });

    const scanRecord: ScanRecord = {
      id: scanId,
      projectName,
      status: 'completed',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      archiveFileName: zipFileName,
      fileCount: extraction.fileCount,
      totalSizeBytes: extraction.totalSizeBytes,
      scannersRun: scanResult.scannersRun,
      summary: scanResult.summary,
      findings: scanResult.findings,
      baselineScanId: mode === 'corrected' ? baselineId : undefined,
    };

    saveScan(scanRecord);

    // If this was a corrected rescan and baseline exists, compute comparison
    let comparison = null;
    if (mode === 'corrected' && baselineId) {
      const baselineScan = getScan(baselineId);
      if (baselineScan) {
        comparison = compareScans(baselineScan, scanRecord);
        saveComparison(comparison);
      }
    }

    res.status(201).json({
      scan: scanRecord,
      comparison,
    });
  } catch (err: any) {
    console.error('[Demo Scan Error]', err);
    res.status(500).json({ error: 'Demo scan failed', details: err?.message });
  }
});
