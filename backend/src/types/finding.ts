export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type Confidence = 'high' | 'medium' | 'low';

export type ScannerName = 'gitleaks' | 'semgrep' | 'trivy' | 'url-inspector' | 'rule-engine';

export type FindingCategory =
  | 'Hardcoded Secret'
  | 'Injection / XSS'
  | 'Broken Access Control'
  | 'Insecure Configuration'
  | 'Vulnerable Dependency'
  | 'Missing Security Header'
  | 'Insecure Cookie'
  | 'Cryptographic Weakness'
  | 'Information Disclosure';

export type VerificationStatus = 'resolved' | 'still_present' | 'new' | 'inconclusive';

export interface Finding {
  id: string; // Unique finding ID (e.g., fnd-uuid)
  fingerprint: string; // Stable hash for matching across rescans
  scanner: ScannerName;
  ruleId: string;
  category: FindingCategory;
  title: string;
  severity: Severity;
  originalSeverity?: string; // Scanner-specific severity before normalization
  confidence: Confidence;
  filePath: string; // Normalized relative file path
  startLine?: number;
  endLine?: number;
  snippet?: string; // Redacted code evidence
  technicalExplanation: string;
  plainLanguageImpact: string;
  recommendedRemediation: string;
  references: string[];
  firstSeenScanId: string;
  status: VerificationStatus;
  verificationEvidence?: string;
  aiHypothesis?: boolean; // True if suggested by AI without direct scanner finding
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
