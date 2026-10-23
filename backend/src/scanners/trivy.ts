import path from 'path';
import crypto from 'crypto';
import { executeCommandSafe } from './runner.js';
import { detectScanner } from './detector.js';
import { Finding, FindingCategory, ScannerExecutionResult, Severity } from '../types/finding.js';
import { redactText, redactFinding, getCredentialRemediationNotice } from '../sanitization/redactor.js';

interface TrivyVulnRaw {
  VulnerabilityID: string;
  PkgName: string;
  InstalledVersion: string;
  FixedVersion?: string;
  Severity: string;
  Title?: string;
  Description?: string;
  PrimaryURL?: string;
  References?: string[];
}

interface TrivySecretRaw {
  RuleID: string;
  Category: string;
  Severity: string;
  Title: string;
  StartLine: number;
  EndLine: number;
  Match: string;
}

interface TrivyMisconfigRaw {
  ID: string;
  Title: string;
  Description: string;
  Message: string;
  Resolution: string;
  Severity: string;
  PrimaryURL?: string;
  References?: string[];
}

interface TrivyResultRaw {
  Target: string;
  Class?: string;
  Type?: string;
  Vulnerabilities?: TrivyVulnRaw[];
  Secrets?: TrivySecretRaw[];
  Misconfigurations?: TrivyMisconfigRaw[];
}

interface TrivyOutputRaw {
  SchemaVersion: number;
  Results?: TrivyResultRaw[];
}

function normalizeTrivySeverity(raw: string): Severity {
  const s = (raw || '').toUpperCase();
  if (s === 'CRITICAL') return 'critical';
  if (s === 'HIGH') return 'high';
  if (s === 'MEDIUM') return 'medium';
  if (s === 'LOW') return 'low';
  return 'info';
}

export async function runTrivyScan(
  targetDir: string,
  scanId: string
): Promise<{ execution: ScannerExecutionResult; findings: Finding[] }> {
  const binaryInfo = await detectScanner('trivy');
  if (!binaryInfo.installed || !binaryInfo.path) {
    return {
      execution: {
        scanner: 'trivy',
        available: false,
        executed: false,
        executionTimeMs: 0,
        exitCode: null,
        error: 'Trivy binary is not installed on the host system. Install via `brew install trivy`.',
        findingsCount: 0,
      },
      findings: [],
    };
  }

  // Trivy fs scanning with JSON format and skip DB update for fast responsiveness
  const args = [
    'fs',
    '--format',
    'json',
    '--scanners',
    'vuln,secret,misconfig',
    '--skip-db-update',
    '--quiet',
    targetDir,
  ];

  const startTime = Date.now();
  const cmdResult = await executeCommandSafe(binaryInfo.path, args, targetDir, 90000);
  const executionTimeMs = Date.now() - startTime;

  let findings: Finding[] = [];
  let executionError: string | undefined = cmdResult.error;

  try {
    if (cmdResult.stdout && cmdResult.stdout.trim().startsWith('{')) {
      const output: TrivyOutputRaw = JSON.parse(cmdResult.stdout);
      if (Array.isArray(output.Results)) {
        for (const res of output.Results) {
          const relativePath = path.isAbsolute(res.Target)
            ? path.relative(targetDir, res.Target)
            : res.Target;

          // 1. Dependency Vulnerabilities
          if (Array.isArray(res.Vulnerabilities)) {
            for (const v of res.Vulnerabilities) {
              const fingerprint = crypto
                .createHash('sha256')
                .update(`trivy:${v.VulnerabilityID}:${relativePath}:${v.PkgName}`)
                .digest('hex')
                .substring(0, 16);

              const finding: Finding = {
                id: `fnd-tv-${crypto.randomUUID().substring(0, 8)}`,
                fingerprint,
                scanner: 'trivy',
                ruleId: v.VulnerabilityID,
                category: 'Vulnerable Dependency',
                title: `${v.VulnerabilityID} in ${v.PkgName}@${v.InstalledVersion}`,
                severity: normalizeTrivySeverity(v.Severity),
                originalSeverity: v.Severity,
                confidence: 'high',
                filePath: relativePath,
                snippet: `Package: ${v.PkgName}\nInstalled: ${v.InstalledVersion}\nFixed in: ${v.FixedVersion || 'No known fix yet'}`,
                technicalExplanation: v.Description || `Known CVE vulnerability ${v.VulnerabilityID} affecting dependency ${v.PkgName}.`,
                plainLanguageImpact: 'Using dependencies with publicly disclosed vulnerabilities may permit remote code execution, denial of service, or unauthorized data exposure.',
                recommendedRemediation: v.FixedVersion
                  ? `Upgrade ${v.PkgName} to version ${v.FixedVersion} or higher in package.json / lockfile.`
                  : `Monitor ${v.PkgName} for security patches or consider replacing it with an actively maintained alternative.`,
                references: v.References || (v.PrimaryURL ? [v.PrimaryURL] : []),
                firstSeenScanId: scanId,
                status: 'new',
                verificationEvidence: `Trivy identified ${v.VulnerabilityID} in manifest ${relativePath}`,
              };
              findings.push(redactFinding(finding));
            }
          }

          // 2. Secret Leaks
          if (Array.isArray(res.Secrets)) {
            for (const s of res.Secrets) {
              const fingerprint = crypto
                .createHash('sha256')
                .update(`trivy:${s.RuleID}:${relativePath}:${s.StartLine}`)
                .digest('hex')
                .substring(0, 16);

              const finding: Finding = {
                id: `fnd-ts-${crypto.randomUUID().substring(0, 8)}`,
                fingerprint,
                scanner: 'trivy',
                ruleId: s.RuleID,
                category: 'Hardcoded Secret',
                title: s.Title || `Exposed Secret (${s.RuleID})`,
                severity: normalizeTrivySeverity(s.Severity),
                originalSeverity: s.Severity,
                confidence: 'high',
                filePath: relativePath,
                startLine: s.StartLine,
                endLine: s.EndLine,
                snippet: redactText(s.Match || '***REDACTED***'),
                technicalExplanation: `Trivy detected an exposed credential or sensitive token matching rule ${s.RuleID}.`,
                plainLanguageImpact: 'Leaked tokens allow malicious actors to compromise downstream services without authentication.',
                recommendedRemediation: getCredentialRemediationNotice(s.Title || 'Secret token'),
                references: ['https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html'],
                firstSeenScanId: scanId,
                status: 'new',
                verificationEvidence: `Trivy detected ${s.RuleID} at line ${s.StartLine}`,
              };
              findings.push(redactFinding(finding));
            }
          }

          // 3. Misconfigurations
          if (Array.isArray(res.Misconfigurations)) {
            for (const m of res.Misconfigurations) {
              const fingerprint = crypto
                .createHash('sha256')
                .update(`trivy:${m.ID}:${relativePath}`)
                .digest('hex')
                .substring(0, 16);

              const finding: Finding = {
                id: `fnd-tm-${crypto.randomUUID().substring(0, 8)}`,
                fingerprint,
                scanner: 'trivy',
                ruleId: m.ID,
                category: 'Insecure Configuration',
                title: m.Title || `Misconfiguration ${m.ID}`,
                severity: normalizeTrivySeverity(m.Severity),
                originalSeverity: m.Severity,
                confidence: 'medium',
                filePath: relativePath,
                snippet: m.Message,
                technicalExplanation: m.Description || m.Message,
                plainLanguageImpact: 'Insecure baseline configurations can leave open ports, disable authentication, or bypass runtime protections.',
                recommendedRemediation: m.Resolution || 'Update configuration to adhere to least-privilege security benchmarks.',
                references: m.References || (m.PrimaryURL ? [m.PrimaryURL] : []),
                firstSeenScanId: scanId,
                status: 'new',
                verificationEvidence: `Trivy misconfiguration ${m.ID}`,
              };
              findings.push(redactFinding(finding));
            }
          }
        }
      }
    } else if (cmdResult.exitCode !== 0) {
      executionError = cmdResult.stderr || `Trivy exited with status code ${cmdResult.exitCode}`;
    }
  } catch (err: any) {
    executionError = `Failed to parse Trivy output: ${err?.message}`;
  }

  return {
    execution: {
      scanner: 'trivy',
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
