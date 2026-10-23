import path from 'path';
import crypto from 'crypto';
import { executeCommandSafe } from './runner.js';
import { detectScanner } from './detector.js';
import { Finding, FindingCategory, ScannerExecutionResult, Severity } from '../types/finding.js';
import { redactText, redactFinding } from '../sanitization/redactor.js';

interface SemgrepResultRaw {
  check_id: string;
  path: string;
  start: { line: number; col: number; offset: number };
  end: { line: number; col: number; offset: number };
  extra: {
    message: string;
    severity: string;
    metadata?: {
      cwe?: string[] | string;
      owasp?: string[] | string;
      references?: string[];
      category?: string;
      confidence?: string;
    };
    lines: string;
  };
}

interface SemgrepOutputRaw {
  results: SemgrepResultRaw[];
  errors: any[];
}

function normalizeSemgrepSeverity(rawSev: string): Severity {
  const s = (rawSev || '').toUpperCase();
  if (s === 'ERROR') return 'high';
  if (s === 'WARNING') return 'medium';
  if (s === 'INFO') return 'low';
  return 'medium';
}

function categorizeSemgrepRule(checkId: string): FindingCategory {
  const id = checkId.toLowerCase();
  if (id.includes('secret') || id.includes('key') || id.includes('token') || id.includes('password')) {
    return 'Hardcoded Secret';
  }
  if (id.includes('sql') || id.includes('eval') || id.includes('injection') || id.includes('xss') || id.includes('command')) {
    return 'Injection / XSS';
  }
  if (id.includes('auth') || id.includes('jwt') || id.includes('session') || id.includes('csrf') || id.includes('access')) {
    return 'Broken Access Control';
  }
  if (id.includes('cors') || id.includes('header') || id.includes('config') || id.includes('tls') || id.includes('ssl')) {
    return 'Insecure Configuration';
  }
  return 'Insecure Configuration';
}

export async function runSemgrepScan(
  targetDir: string,
  scanId: string
): Promise<{ execution: ScannerExecutionResult; findings: Finding[] }> {
  const binaryInfo = await detectScanner('semgrep');
  if (!binaryInfo.installed || !binaryInfo.path) {
    return {
      execution: {
        scanner: 'semgrep',
        available: false,
        executed: false,
        executionTimeMs: 0,
        exitCode: null,
        error: 'Semgrep binary is not installed on the host system. Install via `brew install semgrep` or `pip install semgrep`.',
        findingsCount: 0,
      },
      findings: [],
    };
  }

  // Use local rules / auto config with JSON output
  const args = [
    'scan',
    '--config',
    'auto',
    '--json',
    '--metrics=off',
    '--disable-version-check',
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
      const output: SemgrepOutputRaw = JSON.parse(cmdResult.stdout);
      if (Array.isArray(output.results)) {
        findings = output.results.map((r) => {
          const relativePath = path.isAbsolute(r.path)
            ? path.relative(targetDir, r.path)
            : r.path;

          const snippet = r.extra.lines || '';
          const fingerprint = crypto
            .createHash('sha256')
            .update(`semgrep:${r.check_id}:${relativePath}:${r.start.line}`)
            .digest('hex')
            .substring(0, 16);

          const category = categorizeSemgrepRule(r.check_id);
          const normalizedSev = normalizeSemgrepSeverity(r.extra.severity);

          // References
          let refs: string[] = [];
          if (r.extra.metadata?.references) {
            refs = Array.isArray(r.extra.metadata.references)
              ? r.extra.metadata.references
              : [r.extra.metadata.references];
          }

          const finding: Finding = {
            id: `fnd-sg-${crypto.randomUUID().substring(0, 8)}`,
            fingerprint,
            scanner: 'semgrep',
            ruleId: r.check_id,
            category,
            title: r.extra.message ? r.extra.message.split('\n')[0].substring(0, 120) : `Security Issue in ${relativePath}`,
            severity: normalizedSev,
            originalSeverity: r.extra.severity,
            confidence: (r.extra.metadata?.confidence?.toLowerCase() as any) || 'medium',
            filePath: relativePath,
            startLine: r.start.line,
            endLine: r.end.line,
            snippet: redactText(snippet),
            technicalExplanation: `Semgrep static rule [${r.check_id}] flagged this pattern. ${r.extra.message}`,
            plainLanguageImpact: 'This pattern may allow an attacker to bypass security constraints, execute arbitrary code, or access sensitive program structures.',
            recommendedRemediation: 'Refactor the highlighted code to use parameterized inputs, safe native APIs, or strict input validation instead of dynamic evaluation.',
            references: refs.length > 0 ? refs : ['https://semgrep.dev/explore'],
            firstSeenScanId: scanId,
            status: 'new',
            verificationEvidence: `Semgrep detected [${r.check_id}] at line ${r.start.line}`,
          };

          return redactFinding(finding);
        });
      }
    } else if (cmdResult.exitCode !== 0) {
      executionError = cmdResult.stderr || `Semgrep exited with status code ${cmdResult.exitCode}`;
    }
  } catch (err: any) {
    executionError = `Failed to parse Semgrep output: ${err?.message}`;
  }

  return {
    execution: {
      scanner: 'semgrep',
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
