import { describe, it, expect } from 'vitest';
import { compareScans, generateStableFingerprint } from '../src/comparison/comparator.js';
import { Finding } from '../src/types/finding.js';
import { ScanRecord } from '../src/types/scan.js';

describe('Rescan Comparator and Fingerprint Stability', () => {
  const baseFinding1: Finding = {
    id: 'fnd-1',
    fingerprint: 'fp-1',
    scanner: 'gitleaks',
    ruleId: 'generic-secret',
    category: 'Hardcoded Secret',
    title: 'Hardcoded API Key',
    severity: 'critical',
    confidence: 'high',
    filePath: 'src/config.ts',
    startLine: 12,
    snippet: 'const KEY = "[REDACTED]";',
    technicalExplanation: 'Key detected',
    plainLanguageImpact: 'Leak',
    recommendedRemediation: 'Rotate key',
    references: [],
    firstSeenScanId: 'scan-base',
    status: 'new',
  };

  const baseFinding2: Finding = {
    id: 'fnd-2',
    fingerprint: 'fp-2',
    scanner: 'semgrep',
    ruleId: 'detect-eval',
    category: 'Injection / XSS',
    title: 'Arbitrary Code Execution via eval',
    severity: 'high',
    confidence: 'high',
    filePath: 'src/routes/calc.ts',
    startLine: 45,
    snippet: 'eval(userInput);',
    technicalExplanation: 'eval call detected',
    plainLanguageImpact: 'RCE',
    recommendedRemediation: 'Remove eval',
    references: [],
    firstSeenScanId: 'scan-base',
    status: 'new',
  };

  const baselineScan: ScanRecord = {
    id: 'scan-base',
    projectName: 'DemoApp',
    status: 'completed',
    createdAt: new Date().toISOString(),
    fileCount: 5,
    totalSizeBytes: 2000,
    scannersRun: [
      { scanner: 'gitleaks', available: true, executed: true, executionTimeMs: 100, exitCode: 0, findingsCount: 1 },
      { scanner: 'semgrep', available: true, executed: true, executionTimeMs: 200, exitCode: 0, findingsCount: 1 },
    ],
    summary: { total: 2, critical: 1, high: 1, medium: 0, low: 0, info: 0, byCategory: {}, byScanner: {} },
    findings: [baseFinding1, baseFinding2],
  };

  it('should mark findings as resolved when scanner ran successfully and finding disappeared', () => {
    // In rescan, baseFinding1 (secret) was fixed and removed! baseFinding2 remains at a slightly shifted line (line 48 instead of 45)
    const shiftedFinding2: Finding = {
      ...baseFinding2,
      id: 'fnd-2-new',
      startLine: 48,
      firstSeenScanId: 'scan-rescan-1',
    };

    const rescan: ScanRecord = {
      id: 'scan-rescan-1',
      projectName: 'DemoApp',
      status: 'completed',
      createdAt: new Date().toISOString(),
      fileCount: 5,
      totalSizeBytes: 1900,
      scannersRun: [
        { scanner: 'gitleaks', available: true, executed: true, executionTimeMs: 90, exitCode: 0, findingsCount: 0 },
        { scanner: 'semgrep', available: true, executed: true, executionTimeMs: 180, exitCode: 0, findingsCount: 1 },
      ],
      summary: { total: 1, critical: 0, high: 1, medium: 0, low: 0, info: 0, byCategory: {}, byScanner: {} },
      findings: [shiftedFinding2],
      baselineScanId: 'scan-base',
    };

    const comp = compareScans(baselineScan, rescan);
    expect(comp.summary.resolvedCount).toBe(1);
    expect(comp.summary.stillPresentCount).toBe(1);
    expect(comp.summary.newCount).toBe(0);
    expect(comp.summary.inconclusiveCount).toBe(0);

    const resolvedItem = comp.items.find((i) => i.status === 'resolved');
    expect(resolvedItem?.title).toBe('Hardcoded API Key');
    expect(resolvedItem?.reason).toContain('Verified Fix');

    const stillPresentItem = comp.items.find((i) => i.status === 'still_present');
    expect(stillPresentItem?.title).toBe('Arbitrary Code Execution via eval');
  });

  it('CRITICAL: should NOT mark finding resolved if the responsible scanner errored in rescan', () => {
    // Gitleaks failed with an error in rescan
    const failedRescan: ScanRecord = {
      id: 'scan-rescan-err',
      projectName: 'DemoApp',
      status: 'completed',
      createdAt: new Date().toISOString(),
      fileCount: 5,
      totalSizeBytes: 1900,
      scannersRun: [
        { scanner: 'gitleaks', available: true, executed: true, executionTimeMs: 90, exitCode: 2, error: 'Process crashed unexpectedly', findingsCount: 0 },
        { scanner: 'semgrep', available: true, executed: true, executionTimeMs: 180, exitCode: 0, findingsCount: 0 },
      ],
      summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0, info: 0, byCategory: {}, byScanner: {} },
      findings: [],
      baselineScanId: 'scan-base',
    };

    const comp = compareScans(baselineScan, failedRescan);
    // The gitleaks finding MUST be inconclusive, NOT resolved!
    const gitleaksItem = comp.items.find((i) => i.scanner === 'gitleaks');
    expect(gitleaksItem?.status).toBe('inconclusive');
    expect(gitleaksItem?.reason).toContain('encountered an error in the rescan');

    // The semgrep finding is resolved because semgrep ran with 0 errors
    const semgrepItem = comp.items.find((i) => i.scanner === 'semgrep');
    expect(semgrepItem?.status).toBe('resolved');
  });

  it('should identify newly introduced findings in rescan', () => {
    const newFinding: Finding = {
      id: 'fnd-new-3',
      fingerprint: 'fp-new',
      scanner: 'semgrep',
      ruleId: 'detect-sql-injection',
      category: 'Injection / XSS',
      title: 'SQL Injection in User Lookup',
      severity: 'critical',
      confidence: 'high',
      filePath: 'src/db.ts',
      startLine: 33,
      snippet: 'db.query("SELECT * FROM users WHERE id = " + req.id);',
      technicalExplanation: 'String concat in SQL',
      plainLanguageImpact: 'Data breach',
      recommendedRemediation: 'Use parameterized queries',
      references: [],
      firstSeenScanId: 'scan-rescan-new',
      status: 'new',
    };

    const rescanWithNew: ScanRecord = {
      id: 'scan-rescan-new',
      projectName: 'DemoApp',
      status: 'completed',
      createdAt: new Date().toISOString(),
      fileCount: 6,
      totalSizeBytes: 2200,
      scannersRun: [
        { scanner: 'gitleaks', available: true, executed: true, executionTimeMs: 100, exitCode: 0, findingsCount: 0 },
        { scanner: 'semgrep', available: true, executed: true, executionTimeMs: 200, exitCode: 0, findingsCount: 1 },
      ],
      summary: { total: 1, critical: 1, high: 0, medium: 0, low: 0, info: 0, byCategory: {}, byScanner: {} },
      findings: [newFinding],
      baselineScanId: 'scan-base',
    };

    const comp = compareScans(baselineScan, rescanWithNew);
    expect(comp.summary.newCount).toBe(1);
    const item = comp.items.find((i) => i.status === 'new');
    expect(item?.title).toBe('SQL Injection in User Lookup');
  });
});
