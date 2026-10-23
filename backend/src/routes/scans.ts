import { Router, Request, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { safelyExtractZip, ZipIntakeError } from '../intake/zipHandler.js';
import { parseAndValidateGitHubUrl, downloadGitHubRepoArchive, GitHubIntakeError } from '../intake/githubHandler.js';
import { runAllScanners } from '../scanners/orchestrator.js';
import {
  initScanTracker,
  updateScanStage,
  finishScanTracker,
  getScanTrackerState,
  LiveScanState,
  StageStatus,
} from '../scanners/scanTracker.js';
import { saveScan, getScan, listScans, deleteScan, saveComparison } from '../storage/db.js';
import { compareScans } from '../comparison/comparator.js';
import { ScanRecord } from '../types/scan.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.MAX_UPLOAD_SIZE_MB || '25', 10)) * 1024 * 1024,
  },
});

export const scansRouter = Router();

// Upload and execute scan from ZIP archive
scansRouter.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No source-code ZIP archive uploaded' });
  }

  const projectName = (req.body.projectName as string)?.trim() || req.file.originalname.replace(/\.zip$/i, '') || 'Source-Project';
  const targetUrl = (req.body.targetUrl as string)?.trim() || undefined;
  const authorizedConsent = req.body.authorizedConsent === 'true' || req.body.authorizedConsent === true;
  const baselineScanId = (req.body.baselineScanId as string)?.trim() || undefined;

  const scanId = `scn-${crypto.randomUUID().substring(0, 8)}`;
  const createdAt = new Date().toISOString();

  // Initialize live telemetry tracker
  initScanTracker(scanId, projectName, Boolean(targetUrl));
  updateScanStage(scanId, 'unpacking', 'running');

  try {
    const tExtract = Date.now();
    // 1. Safely extract ZIP
    const extraction = safelyExtractZip(req.file.buffer, scanId);
    updateScanStage(scanId, 'unpacking', 'completed', {
      durationMs: Date.now() - tExtract,
    });

    // 2. Execute all scanners
    const scanResult = await runAllScanners({
      scanId,
      targetDir: extraction.extractDir,
      relativeFiles: extraction.relativeFiles,
      targetUrl,
      authorizedConsent,
    });

    // 3. Create and persist scan record
    const scanRecord: ScanRecord = {
      id: scanId,
      projectName,
      status: 'completed',
      createdAt,
      completedAt: new Date().toISOString(),
      targetUrl,
      archiveFileName: req.file.originalname,
      fileCount: extraction.fileCount,
      totalSizeBytes: extraction.totalSizeBytes,
      scannersRun: scanResult.scannersRun,
      summary: scanResult.summary,
      findings: scanResult.findings,
      baselineScanId,
    };

    saveScan(scanRecord);

    if (baselineScanId) {
      const baselineScan = getScan(baselineScanId);
      if (baselineScan) {
        const comparison = compareScans(baselineScan, scanRecord);
        saveComparison(comparison);
      }
    }

    finishScanTracker(scanId, 'completed', scanRecord);

    res.status(201).json(scanRecord);
  } catch (err: any) {
    finishScanTracker(scanId, 'failed', undefined, err.message);
    if (err instanceof ZipIntakeError) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    console.error('[Scan Engine Error]', err);
    res.status(500).json({ error: 'Internal scanning failure', details: err?.message });
  }
});

// Intake and execute scan from a public GitHub repository
scansRouter.post('/github', async (req: Request, res: Response) => {
  const repoUrl = req.body.repoUrl;
  const branch = req.body.branch;
  const targetUrl = (req.body.targetUrl as string)?.trim() || undefined;
  const authorizedConsent = req.body.authorizedConsent === true || req.body.authorizedConsent === 'true';

  let githubInfo;
  try {
    githubInfo = parseAndValidateGitHubUrl(repoUrl, branch);
  } catch (err: any) {
    return res.status(400).json({ error: err.message, code: err.code || 'INVALID_GITHUB_URL' });
  }

  const projectName = (req.body.projectName as string)?.trim() || `${githubInfo.owner}/${githubInfo.repo}`;
  const scanId = `scn-${crypto.randomUUID().substring(0, 8)}`;
  const createdAt = new Date().toISOString();

  // Initialize live tracker
  initScanTracker(scanId, projectName, Boolean(targetUrl));
  updateScanStage(scanId, 'unpacking', 'running');

  try {
    // 1. Download repository archive from GitHub
    const tDownload = Date.now();
    const download = await downloadGitHubRepoArchive(githubInfo);

    // 2. Safely extract downloaded ZIP
    const extraction = safelyExtractZip(download.buffer, scanId);
    updateScanStage(scanId, 'unpacking', 'completed', {
      durationMs: Date.now() - tDownload,
    });

    // 3. Execute scanners
    const scanResult = await runAllScanners({
      scanId,
      targetDir: extraction.extractDir,
      relativeFiles: extraction.relativeFiles,
      targetUrl,
      authorizedConsent,
    });

    // 4. Create and persist scan record
    const scanRecord: ScanRecord = {
      id: scanId,
      projectName,
      status: 'completed',
      createdAt,
      completedAt: new Date().toISOString(),
      targetUrl,
      archiveFileName: `${githubInfo.owner}-${githubInfo.repo}-${download.branchUsed}.zip`,
      fileCount: extraction.fileCount,
      totalSizeBytes: extraction.totalSizeBytes,
      scannersRun: scanResult.scannersRun,
      summary: scanResult.summary,
      findings: scanResult.findings,
    };

    saveScan(scanRecord);
    finishScanTracker(scanId, 'completed', scanRecord);

    res.status(201).json(scanRecord);
  } catch (err: any) {
    finishScanTracker(scanId, 'failed', undefined, err.message);
    if (err instanceof GitHubIntakeError) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    if (err instanceof ZipIntakeError) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    console.error('[GitHub Scan Error]', err);
    res.status(500).json({ error: 'GitHub repository scanning failure', details: err?.message });
  }
});

// Live scan stage telemetry endpoint (polled by /scanner/:scanId)
scansRouter.get('/:id/status', (req: Request, res: Response) => {
  const scanId = req.params.id;

  // 1. Check in-memory live tracker first
  const live = getScanTrackerState(scanId);
  if (live) {
    return res.json(live);
  }

  // 2. Check persistent database
  const scan = getScan(scanId);
  if (!scan) {
    return res.status(404).json({ error: `Scan not found: ${scanId}` });
  }

  // Synthesize completed stages representation from persisted record
  const synthesizedStages = scan.scannersRun.map((sr) => ({
    id: sr.scanner,
    name: sr.scanner.toUpperCase(),
    label: `${sr.scanner} verification`,
    description: `Execution completed in ${sr.executionTimeMs}ms`,
    status: (sr.executed ? (sr.exitCode === 0 || sr.findingsCount >= 0 ? 'completed' : 'failed') : 'skipped') as StageStatus,
    durationMs: sr.executionTimeMs,
    findingsCount: sr.findingsCount,
    error: sr.error,
  }));

  const persistedState: LiveScanState = {
    scanId: scan.id,
    projectName: scan.projectName,
    status: scan.status === 'completed' ? 'completed' : scan.status === 'failed' ? 'failed' : 'completed',
    currentStage: 'synthesizing',
    startedAt: scan.createdAt,
    completedAt: scan.completedAt,
    elapsedMs: scan.completedAt
      ? new Date(scan.completedAt).getTime() - new Date(scan.createdAt).getTime()
      : 0,
    stages: [
      {
        id: 'unpacking',
        name: 'Archive Extraction',
        label: 'Secure Extraction & Isolation',
        description: `Verified ${scan.fileCount} source files (${(scan.totalSizeBytes / 1024).toFixed(1)} KB)`,
        status: 'completed',
      },
      ...synthesizedStages,
    ],
    findingsCount: scan.summary.total,
    completedScan: scan,
    error: scan.error,
  };

  res.json(persistedState);
});

// List all scans
scansRouter.get('/', (req: Request, res: Response) => {
  try {
    const scans = listScans();
    res.json(scans);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve scan history', details: err?.message });
  }
});

// Get scan by ID
scansRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const scan = getScan(req.params.id);
    if (!scan) {
      return res.status(404).json({ error: `Scan not found: ${req.params.id}` });
    }
    res.json(scan);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve scan', details: err?.message });
  }
});

// Delete scan by ID
scansRouter.delete('/:id', (req: Request, res: Response) => {
  try {
    const deleted = deleteScan(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: `Scan not found: ${req.params.id}` });
    }
    res.json({ success: true, id: req.params.id });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete scan', details: err?.message });
  }
});

// Rescan with corrected ZIP and compare against baseline
scansRouter.post('/:id/rescan', upload.single('file'), async (req: Request, res: Response) => {
  const baselineId = req.params.id;
  const baselineScan = getScan(baselineId);

  if (!baselineScan) {
    return res.status(404).json({ error: `Baseline scan not found: ${baselineId}` });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No corrected source-code ZIP archive uploaded' });
  }

  const projectName = (req.body.projectName as string)?.trim() || `${baselineScan.projectName} (Rescan)`;
  const rescanId = `scn-${crypto.randomUUID().substring(0, 8)}`;
  const createdAt = new Date().toISOString();

  // Initialize live tracker
  initScanTracker(rescanId, projectName, Boolean(baselineScan.targetUrl));
  updateScanStage(rescanId, 'unpacking', 'running');

  try {
    const tExtract = Date.now();
    // 1. Safely extract corrected ZIP
    const extraction = safelyExtractZip(req.file.buffer, rescanId);
    updateScanStage(rescanId, 'unpacking', 'completed', {
      durationMs: Date.now() - tExtract,
    });

    // 2. Execute scanners on corrected code
    const scanResult = await runAllScanners({
      scanId: rescanId,
      targetDir: extraction.extractDir,
      relativeFiles: extraction.relativeFiles,
      targetUrl: baselineScan.targetUrl,
      authorizedConsent: true,
    });

    const rescanRecord: ScanRecord = {
      id: rescanId,
      projectName,
      status: 'completed',
      createdAt,
      completedAt: new Date().toISOString(),
      targetUrl: baselineScan.targetUrl,
      archiveFileName: req.file.originalname,
      fileCount: extraction.fileCount,
      totalSizeBytes: extraction.totalSizeBytes,
      scannersRun: scanResult.scannersRun,
      summary: scanResult.summary,
      findings: scanResult.findings,
      baselineScanId: baselineScan.id,
    };

    saveScan(rescanRecord);

    // 3. Perform Rescan Verification Comparison
    const comparison = compareScans(baselineScan, rescanRecord);
    saveComparison(comparison);
    finishScanTracker(rescanId, 'completed', rescanRecord);

    res.status(201).json({
      scan: rescanRecord,
      comparison,
    });
  } catch (err: any) {
    finishScanTracker(rescanId, 'failed', undefined, err.message);
    if (err instanceof ZipIntakeError) {
      return res.status(400).json({ error: err.message, code: err.code });
    }
    console.error('[Rescan Error]', err);
    res.status(500).json({ error: 'Rescan execution failure', details: err?.message });
  }
});
