import { ScanRecord } from '../types/scan.js';

export type StageStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface ScanStageInfo {
  id: string;
  name: string;
  label: string;
  description: string;
  status: StageStatus;
  startedAt?: string;
  durationMs?: number;
  findingsCount?: number;
  error?: string;
}

export interface LiveScanState {
  scanId: string;
  projectName: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  currentStage: string;
  startedAt: string;
  completedAt?: string;
  elapsedMs: number;
  stages: ScanStageInfo[];
  findingsCount: number;
  error?: string;
  completedScan?: ScanRecord;
}

// In-memory active scan trackers
const activeScans = new Map<string, LiveScanState>();

export function initScanTracker(scanId: string, projectName: string, hasUrlTarget: boolean): LiveScanState {
  const stages: ScanStageInfo[] = [
    {
      id: 'unpacking',
      name: 'Archive Extraction',
      label: 'Secure Extraction & ZipSlip Defense',
      description: 'Isolating temporary workspace, validating directory bounds and extracting AST files.',
      status: 'pending',
    },
    {
      id: 'gitleaks',
      name: 'Gitleaks Secret Audit',
      label: 'High-entropy Secret & Credential Detection',
      description: 'Detecting exposed API keys, private tokens, passwords, and cryptographic secrets.',
      status: 'pending',
    },
    {
      id: 'semgrep',
      name: 'Semgrep Static Analysis',
      label: 'Security-rule Static AST Analysis',
      description: 'Auditing code patterns for SQL injection, XSS, SSRF, and command injection.',
      status: 'pending',
    },
    {
      id: 'trivy',
      name: 'Trivy Dependency Scanner',
      label: 'Software Supply Chain & CVE Vulnerabilities',
      description: 'Checking package manifests (package.json, lockfiles) against known vulnerability databases.',
      status: 'pending',
    },
    {
      id: 'rule-engine',
      name: 'Heuristic AST Rule Engine',
      label: 'Targeted Web Application Security Verification',
      description: 'Verifying CORS configurations, session flags, exposed debug endpoints, and hardcoded secrets.',
      status: 'pending',
    },
  ];

  if (hasUrlTarget) {
    stages.push({
      id: 'url-inspector',
      name: 'URL Header & Config Auditor',
      label: 'Passive HTTP Header & Security Header Analysis',
      description: 'Auditing live headers (CSP, HSTS, X-Frame-Options, Referrer-Policy, Cookie flags).',
      status: 'pending',
    });
  }

  stages.push({
    id: 'synthesizing',
    name: 'Synthesis & Normalization',
    label: 'Deduplication, Evidence Masking & AI Readiness',
    description: 'Normalizing scanner findings, masking credentials, calculating fingerprints and metrics.',
    status: 'pending',
  });

  const state: LiveScanState = {
    scanId,
    projectName,
    status: 'pending',
    currentStage: 'unpacking',
    startedAt: new Date().toISOString(),
    elapsedMs: 0,
    stages,
    findingsCount: 0,
  };

  activeScans.set(scanId, state);
  return state;
}

export function updateScanStage(
  scanId: string,
  stageId: string,
  status: StageStatus,
  extra?: { durationMs?: number; findingsCount?: number; error?: string }
): void {
  const state = activeScans.get(scanId);
  if (!state) return;

  const stage = state.stages.find((s) => s.id === stageId);
  if (stage) {
    stage.status = status;
    if (extra?.durationMs !== undefined) stage.durationMs = extra.durationMs;
    if (extra?.findingsCount !== undefined) {
      stage.findingsCount = extra.findingsCount;
      state.findingsCount = state.stages.reduce((sum, s) => sum + (s.findingsCount || 0), 0);
    }
    if (extra?.error) stage.error = extra.error;
    if (status === 'running') {
      stage.startedAt = new Date().toISOString();
      state.currentStage = stageId;
      state.status = 'scanning';
    }
  }

  state.elapsedMs = Date.now() - new Date(state.startedAt).getTime();
}

export function finishScanTracker(
  scanId: string,
  status: 'completed' | 'failed',
  completedScan?: ScanRecord,
  error?: string
): void {
  const state = activeScans.get(scanId);
  if (!state) return;

  state.status = status;
  state.completedAt = new Date().toISOString();
  state.elapsedMs = Date.now() - new Date(state.startedAt).getTime();
  if (completedScan) {
    state.completedScan = completedScan;
    state.findingsCount = completedScan.summary.total;
  }
  if (error) {
    state.error = error;
  }

  // Keep in memory for 15 minutes before cleanup
  setTimeout(() => {
    activeScans.delete(scanId);
  }, 15 * 60 * 1000);
}

export function getScanTrackerState(scanId: string): LiveScanState | null {
  const active = activeScans.get(scanId);
  if (active) {
    if (active.status === 'scanning' || active.status === 'pending') {
      active.elapsedMs = Date.now() - new Date(active.startedAt).getTime();
    }
    return active;
  }
  return null;
}
