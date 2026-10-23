import crypto from 'crypto';
import { Finding, ScannerExecutionResult } from '../types/finding.js';
import { ScanSummary } from '../types/scan.js';
import { runGitleaksScan } from './gitleaks.js';
import { runSemgrepScan } from './semgrep.js';
import { runTrivyScan } from './trivy.js';
import { runRuleEngineScan } from './ruleEngine.js';
import { inspectAuthorizedUrl } from './urlInspector.js';
import { cleanupScanDirectory } from '../intake/zipHandler.js';
import { updateScanStage } from './scanTracker.js';

export interface OrchestrationOptions {
  scanId: string;
  targetDir: string;
  relativeFiles: string[];
  targetUrl?: string;
  authorizedConsent?: boolean;
}

export interface OrchestrationResult {
  findings: Finding[];
  scannersRun: ScannerExecutionResult[];
  summary: ScanSummary;
}

/**
 * Executes all available security scanners and aggregates findings with safe deduplication.
 */
export async function runAllScanners(options: OrchestrationOptions): Promise<OrchestrationResult> {
  const { scanId, targetDir, relativeFiles, targetUrl, authorizedConsent } = options;
  const scannersRun: ScannerExecutionResult[] = [];
  const rawFindings: Finding[] = [];

  // Run in parallel for high performance
  const scanPromises: Promise<void>[] = [];

  // 1. Gitleaks
  updateScanStage(scanId, 'gitleaks', 'running');
  scanPromises.push(
    (async () => {
      const t0 = Date.now();
      try {
        const res = await runGitleaksScan(targetDir, scanId);
        scannersRun.push(res.execution);
        rawFindings.push(...res.findings);
        updateScanStage(scanId, 'gitleaks', 'completed', {
          durationMs: Date.now() - t0,
          findingsCount: res.findings.length,
        });
      } catch (err: any) {
        scannersRun.push({
          scanner: 'gitleaks',
          available: false,
          executed: false,
          executionTimeMs: Date.now() - t0,
          exitCode: null,
          error: `Execution error: ${err.message}`,
          findingsCount: 0,
        });
        updateScanStage(scanId, 'gitleaks', 'failed', {
          durationMs: Date.now() - t0,
          findingsCount: 0,
          error: err.message,
        });
      }
    })()
  );

  // 2. Semgrep
  updateScanStage(scanId, 'semgrep', 'running');
  scanPromises.push(
    (async () => {
      const t0 = Date.now();
      try {
        const res = await runSemgrepScan(targetDir, scanId);
        scannersRun.push(res.execution);
        rawFindings.push(...res.findings);
        updateScanStage(scanId, 'semgrep', 'completed', {
          durationMs: Date.now() - t0,
          findingsCount: res.findings.length,
        });
      } catch (err: any) {
        scannersRun.push({
          scanner: 'semgrep',
          available: false,
          executed: false,
          executionTimeMs: Date.now() - t0,
          exitCode: null,
          error: `Execution error: ${err.message}`,
          findingsCount: 0,
        });
        updateScanStage(scanId, 'semgrep', 'failed', {
          durationMs: Date.now() - t0,
          findingsCount: 0,
          error: err.message,
        });
      }
    })()
  );

  // 3. Trivy
  updateScanStage(scanId, 'trivy', 'running');
  scanPromises.push(
    (async () => {
      const t0 = Date.now();
      try {
        const res = await runTrivyScan(targetDir, scanId);
        scannersRun.push(res.execution);
        rawFindings.push(...res.findings);
        updateScanStage(scanId, 'trivy', 'completed', {
          durationMs: Date.now() - t0,
          findingsCount: res.findings.length,
        });
      } catch (err: any) {
        scannersRun.push({
          scanner: 'trivy',
          available: false,
          executed: false,
          executionTimeMs: Date.now() - t0,
          exitCode: null,
          error: `Execution error: ${err.message}`,
          findingsCount: 0,
        });
        updateScanStage(scanId, 'trivy', 'failed', {
          durationMs: Date.now() - t0,
          findingsCount: 0,
          error: err.message,
        });
      }
    })()
  );

  // 4. Built-in Security Rule Engine
  updateScanStage(scanId, 'rule-engine', 'running');
  scanPromises.push(
    (async () => {
      const t0 = Date.now();
      try {
        const res = await runRuleEngineScan(targetDir, scanId, relativeFiles);
        scannersRun.push(res.execution);
        rawFindings.push(...res.findings);
        updateScanStage(scanId, 'rule-engine', 'completed', {
          durationMs: Date.now() - t0,
          findingsCount: res.findings.length,
        });
      } catch (err: any) {
        scannersRun.push({
          scanner: 'rule-engine',
          available: true,
          executed: false,
          executionTimeMs: Date.now() - t0,
          exitCode: null,
          error: `Execution error: ${err.message}`,
          findingsCount: 0,
        });
        updateScanStage(scanId, 'rule-engine', 'failed', {
          durationMs: Date.now() - t0,
          findingsCount: 0,
          error: err.message,
        });
      }
    })()
  );

  // 5. URL Inspector (if URL provided)
  if (targetUrl) {
    updateScanStage(scanId, 'url-inspector', 'running');
    scanPromises.push(
      (async () => {
        const t0 = Date.now();
        try {
          const res = await inspectAuthorizedUrl(targetUrl, scanId, Boolean(authorizedConsent));
          scannersRun.push(res.execution);
          rawFindings.push(...res.findings);
          updateScanStage(scanId, 'url-inspector', 'completed', {
            durationMs: Date.now() - t0,
            findingsCount: res.findings.length,
          });
        } catch (err: any) {
          scannersRun.push({
            scanner: 'url-inspector',
            available: true,
            executed: false,
            executionTimeMs: Date.now() - t0,
            exitCode: null,
            error: `URL inspection error: ${err.message}`,
            findingsCount: 0,
          });
          updateScanStage(scanId, 'url-inspector', 'failed', {
            durationMs: Date.now() - t0,
            findingsCount: 0,
            error: err.message,
          });
        }
      })()
    );
  }

  await Promise.all(scanPromises);

  updateScanStage(scanId, 'synthesizing', 'running');

  // Clean up temporary extraction folder
  cleanupScanDirectory(targetDir);

  // Safe deduplication:
  // If multiple scanners report the exact same secret/vulnerability on the exact same line of the same file,
  // we merge the scanner source in verificationEvidence without hiding the discovery.
  const deduplicated: Finding[] = [];
  const seenKeys = new Map<string, Finding>();

  for (const f of rawFindings) {
    const key = `${f.category}:${f.filePath}:${f.startLine || 0}`;
    const existing = seenKeys.get(key);

    if (existing) {
      // If one of the scanners is gitleaks or semgrep (dedicated scanner), prefer its description
      if (f.scanner === 'gitleaks' && existing.scanner === 'rule-engine') {
        const idx = deduplicated.indexOf(existing);
        if (idx !== -1) {
          f.verificationEvidence = `${f.verificationEvidence} (also matched by ${existing.scanner})`;
          deduplicated[idx] = f;
          seenKeys.set(key, f);
        }
      } else {
        existing.verificationEvidence = `${existing.verificationEvidence} (also verified by ${f.scanner})`;
      }
    } else {
      seenKeys.set(key, f);
      deduplicated.push(f);
    }
  }

  // Calculate summary counts
  const summary: ScanSummary = {
    total: deduplicated.length,
    critical: deduplicated.filter((f) => f.severity === 'critical').length,
    high: deduplicated.filter((f) => f.severity === 'high').length,
    medium: deduplicated.filter((f) => f.severity === 'medium').length,
    low: deduplicated.filter((f) => f.severity === 'low').length,
    info: deduplicated.filter((f) => f.severity === 'info').length,
    byCategory: {},
    byScanner: {},
  };

  for (const f of deduplicated) {
    summary.byCategory[f.category] = (summary.byCategory[f.category] || 0) + 1;
    summary.byScanner[f.scanner] = (summary.byScanner[f.scanner] || 0) + 1;
  }

  updateScanStage(scanId, 'synthesizing', 'completed', {
    findingsCount: deduplicated.length,
  });

  return {
    findings: deduplicated,
    scannersRun,
    summary,
  };
}
