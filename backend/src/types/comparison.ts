import { Finding, ScannerName, VerificationStatus } from './finding.js';

export interface ComparisonItem {
  id: string; // unique item id in this comparison
  fingerprint: string;
  status: VerificationStatus;
  category: string;
  title: string;
  severity: string;
  scanner: ScannerName;
  filePath: string;
  startLine?: number;
  baselineFinding?: Finding;
  currentFinding?: Finding;
  reason: string; // Plain-language explanation for this transition status
  confidence: 'high' | 'medium' | 'low';
}

export interface ComparisonResult {
  id: string;
  baselineScanId: string;
  currentScanId: string;
  comparedAt: string;
  summary: {
    resolvedCount: number;
    stillPresentCount: number;
    newCount: number;
    inconclusiveCount: number;
    totalBaseline: number;
    totalCurrent: number;
    scannerCoverageNotes: string[];
  };
  items: ComparisonItem[];
}
