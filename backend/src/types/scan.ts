import { Finding, ScannerExecutionResult, Severity } from './finding.js';

export type ScanStatus = 'pending' | 'scanning' | 'analyzing' | 'completed' | 'failed';

export interface ScanSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  byCategory: Record<string, number>;
  byScanner: Record<string, number>;
}

export interface ScanRecord {
  id: string;
  projectName: string;
  status: ScanStatus;
  createdAt: string;
  completedAt?: string;
  targetUrl?: string;
  archiveFileName?: string;
  fileCount: number;
  totalSizeBytes: number;
  scannersRun: ScannerExecutionResult[];
  summary: ScanSummary;
  findings: Finding[];
  error?: string;
  baselineScanId?: string; // If this was a rescan
}

export interface ScannerReadiness {
  gitleaks: { installed: boolean; version?: string; path?: string };
  semgrep: { installed: boolean; version?: string; path?: string };
  trivy: { installed: boolean; version?: string; path?: string };
  urlInspector: { installed: boolean; version?: string; path?: string };
}
