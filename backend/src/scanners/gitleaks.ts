import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { executeCommandSafe } from './runner.js';
import { detectScanner } from './detector.js';
import { Finding, ScannerExecutionResult } from '../types/finding.js';
import { redactText, redactFinding, getCredentialRemediationNotice } from '../sanitization/redactor.js';

interface GitleaksFindingRaw {
  Description: string;
  StartLine: number;
  EndLine: number;
  StartColumn: number;
  EndColumn: number;
  Match: string;
  Secret: string;
  File: string;
  SymlinkFile: string;
  Commit: string;
  Entropy: number;
  Author: string;
  Email: string;
  Date: string;
  Message: string;
  Tags: string[];
  RuleID: string;
  Fingerprint: string;
}

export async function runGitleaksScan(
  targetDir: string,
  scanId: string
): Promise<{ execution: ScannerExecutionResult; findings: Finding[] }> {
  const binaryInfo = await detectScanner('gitleaks');
  if (!binaryInfo.installed || !binaryInfo.path) {
    return {
      execution: {
        scanner: 'gitleaks',
        available: false,
        executed: false,
        executionTimeMs: 0,
        exitCode: null,
        error: 'Gitleaks binary is not installed on the host system. Install via `brew install gitleaks`.',
        findingsCount: 0,
      },
      findings: [],
    };
  }

  const reportPath = path.join(os.tmpdir(), `gitleaks-report-${scanId}-${Date.now()}.json`);
  const args = [
    'dir',
    '--report-format',
    'json',
    '--report-path',
    reportPath,
    '--redact',
    targetDir,
  ];

  const startTime = Date.now();
  // Gitleaks returns exit code 0 when no leaks found, exit code 1 or 2 when leaks are found or error
  const cmdResult = await executeCommandSafe(binaryInfo.path, args, targetDir, 60000);
  const executionTimeMs = Date.now() - startTime;

  let findings: Finding[] = [];
  let executionError: string | undefined = cmdResult.error;

  try {
    if (fs.existsSync(reportPath)) {
      const content = fs.readFileSync(reportPath, 'utf8');
      if (content.trim().length > 0) {
        const rawFindings: GitleaksFindingRaw[] = JSON.parse(content);
        findings = rawFindings.map((raw) => {
          // Normalize relative path
          const relativePath = path.isAbsolute(raw.File)
            ? path.relative(targetDir, raw.File)
            : raw.File;

          const snippet = raw.Match || `***REDACTED_SECRET***`;
          const fingerprint = crypto
            .createHash('sha256')
            .update(`gitleaks:${raw.RuleID}:${relativePath}:${snippet}`)
            .digest('hex')
            .substring(0, 16);

          const finding: Finding = {
            id: `fnd-gl-${crypto.randomUUID().substring(0, 8)}`,
            fingerprint,
            scanner: 'gitleaks',
            ruleId: raw.RuleID || 'generic-secret',
            category: 'Hardcoded Secret',
            title: `Hardcoded ${raw.Description || raw.RuleID || 'Secret'} Detected`,
            severity: 'critical',
            originalSeverity: 'HIGH',
            confidence: 'high',
            filePath: relativePath,
            startLine: raw.StartLine,
            endLine: raw.EndLine,
            snippet: redactText(snippet),
            technicalExplanation: `Gitleaks detected a secret signature matching rule [${raw.RuleID}]. Storing plaintext tokens, private keys, or API credentials in code exposes systems to unauthorized access and supply-chain compromise.`,
            plainLanguageImpact: 'An attacker with read access to the repository can extract this credential to impersonate the service, read private user data, or perform unauthorized cloud operations.',
            recommendedRemediation: getCredentialRemediationNotice(raw.Description || 'API key'),
            references: [
              'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html',
              'https://cwe.mitre.org/data/definitions/798.html',
            ],
            firstSeenScanId: scanId,
            status: 'new',
            verificationEvidence: `Detected pattern [${raw.RuleID}] in ${relativePath}:${raw.StartLine}`,
          };

          return redactFinding(finding);
        });
      }
    } else if (cmdResult.exitCode !== 0 && cmdResult.exitCode !== 1) {
      executionError = cmdResult.stderr || `Gitleaks exited with status ${cmdResult.exitCode}`;
    }
  } catch (err: any) {
    executionError = `Failed to parse Gitleaks JSON output: ${err?.message}`;
  } finally {
    try {
      if (fs.existsSync(reportPath)) {
        fs.unlinkSync(reportPath);
      }
    } catch {
      // ignore
    }
  }

  return {
    execution: {
      scanner: 'gitleaks',
      available: true,
      executed: true,
      executionTimeMs,
      exitCode: cmdResult.exitCode,
      error: executionError,
      findingsCount: findings.length,
    },
    findings,
  };
}
