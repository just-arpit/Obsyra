export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type Confidence = 'high' | 'medium' | 'low';
export type ScannerName = 'gitleaks' | 'semgrep' | 'trivy' | 'url-inspector' | 'rule-engine';
export type VerificationStatus = 'resolved' | 'still_present' | 'new' | 'inconclusive';

export interface Finding {
  id: string;
  fingerprint: string;
  scanner: ScannerName;
  ruleId: string;
  category: string;
  title: string;
  severity: Severity;
  originalSeverity?: string;
  confidence: Confidence;
  filePath: string;
  startLine?: number;
  endLine?: number;
  snippet?: string;
  technicalExplanation: string;
  plainLanguageImpact: string;
  recommendedRemediation: string;
  references: string[];
  firstSeenScanId: string;
  status: VerificationStatus;
  verificationEvidence?: string;
  aiHypothesis?: boolean;
}

export interface ScannerExecutionResult {
  scanner: ScannerName;
  available: boolean;
  executed: boolean;
  executionTimeMs: number;
  exitCode: number | null;
  error?: string;
  findingsCount: number;
}

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
  status: string;
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
  baselineScanId?: string;
}

export interface ScannerReadiness {
  gitleaks: { installed: boolean; version?: string; path?: string };
  semgrep: { installed: boolean; version?: string; path?: string };
  trivy: { installed: boolean; version?: string; path?: string };
  urlInspector: { installed: boolean; version?: string; path?: string };
}

export interface PrioritizedStep {
  stepNumber: number;
  title: string;
  severity: Severity;
  targetFiles: string[];
  rationale: string;
  instructions: string;
}

export interface CredentialRotationAction {
  credentialType: string;
  detectedFile: string;
  provider: string;
  immediateActions: string[];
}

export interface RemediationPlan {
  executiveSummary: string;
  riskScore: number;
  prioritizedSteps: PrioritizedStep[];
  securityConstraints: string[];
  credentialRotations: CredentialRotationAction[];
  regressionTestingGuidance: string[];
  verificationCommands: string[];
  readyToPasteRepairPrompt: string;
  generatedBy: 'gemini' | 'deterministic-engine';
  modelUsed?: string;
}

export interface ComparisonItem {
  id: string;
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
  reason: string;
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

