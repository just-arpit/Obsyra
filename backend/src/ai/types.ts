import { Severity } from '../types/finding.js';

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
  riskScore: number; // 0 - 100
  prioritizedSteps: PrioritizedStep[];
  securityConstraints: string[];
  credentialRotations: CredentialRotationAction[];
  regressionTestingGuidance: string[];
  verificationCommands: string[];
  readyToPasteRepairPrompt: string;
  generatedBy: 'gemini' | 'deterministic-engine';
  modelUsed?: string;
}

export interface AIServiceInterface {
  isConfigured(): boolean;
  generateRemediationPlan(findings: any[], projectName: string): Promise<RemediationPlan>;
}
