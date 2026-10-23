import crypto from 'crypto';
import { Finding, ScannerName, VerificationStatus } from '../types/finding.js';
import { ScanRecord } from '../types/scan.js';
import { ComparisonItem, ComparisonResult } from '../types/comparison.js';

/**
 * Generates a stable matching key across rescans.
 * Does not rely on brittle line numbers alone, since edits shift line numbers.
 */
export function generateStableFingerprint(f: Finding): string {
  // Normalize path (standardize slashes, remove leading ./ or /)
  const normPath = f.filePath.replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();

  // Normalize code token (strip all whitespace and linebreaks)
  const cleanSnippet = (f.snippet || '').replace(/\s+/g, '').substring(0, 80);

  const rawKey = `${f.scanner}:${f.ruleId}:${normPath}:${cleanSnippet}`;
  return crypto.createHash('sha256').update(rawKey).digest('hex').substring(0, 16);
}

/**
 * Determines whether two findings match across scans using fuzzy and exact heuristics.
 */
function areFindingsMatching(baseline: Finding, current: Finding): boolean {
  // 1. Exact fingerprint match
  if (baseline.fingerprint === current.fingerprint) {
    return true;
  }

  // 2. Same scanner, same ruleId, same normalized file path
  const bPath = baseline.filePath.replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();
  const cPath = current.filePath.replace(/\\/g, '/').replace(/^\.?\//, '').toLowerCase();

  if (baseline.scanner === current.scanner && baseline.ruleId === current.ruleId && bPath === cPath) {
    // If lines are close (within 15 lines) or snippets share meaningful characters
    if (baseline.startLine !== undefined && current.startLine !== undefined) {
      if (Math.abs(baseline.startLine - current.startLine) <= 15) {
        return true;
      }
    } else {
      return true;
    }
  }

  return false;
}

/**
 * Compares a baseline scan against a rescan to verify fixes.
 * Honors scanner error states: a failed scanner NEVER resolves a baseline finding.
 */
export function compareScans(baselineScan: ScanRecord, currentScan: ScanRecord): ComparisonResult {
  const comparisonId = `cmp-${baselineScan.id.substring(0, 8)}-${currentScan.id.substring(0, 8)}`;
  const items: ComparisonItem[] = [];
  const scannerCoverageNotes: string[] = [];

  // Map scanner execution status in current scan
  const currentScanners = new Map<ScannerName, { executed: boolean; available: boolean; error?: string }>();
  for (const s of currentScan.scannersRun) {
    currentScanners.set(s.scanner, {
      executed: s.executed,
      available: s.available,
      error: s.error,
    });
  }

  // Keep track of matched current finding IDs so we can flag 'new' findings
  const matchedCurrentFindingIds = new Set<string>();

  // 1. Process Baseline Findings
  for (const bFinding of baselineScan.findings) {
    const scannerState = currentScanners.get(bFinding.scanner);

    // CRITICAL: If the scanner failed or was not executed in the rescan, the status is INCONCLUSIVE!
    if (!scannerState || !scannerState.executed || scannerState.error) {
      const reason = scannerState?.error
        ? `Scanner [${bFinding.scanner}] encountered an error in the rescan: "${scannerState.error}". Cannot reliably determine if finding was resolved.`
        : `Scanner [${bFinding.scanner}] was not executed in the rescan. Status cannot be verified.`;

      scannerCoverageNotes.push(`Scanner [${bFinding.scanner}] coverage incomplete in rescan.`);

      items.push({
        id: `ci-${crypto.randomUUID().substring(0, 8)}`,
        fingerprint: bFinding.fingerprint,
        status: 'inconclusive',
        category: bFinding.category,
        title: bFinding.title,
        severity: bFinding.severity,
        scanner: bFinding.scanner,
        filePath: bFinding.filePath,
        startLine: bFinding.startLine,
        baselineFinding: bFinding,
        reason,
        confidence: 'low',
      });
      continue;
    }

    // Scanner ran successfully. Look for a matching finding in the new scan
    const matchedCurrent = currentScan.findings.find((cf) => areFindingsMatching(bFinding, cf));

    if (matchedCurrent) {
      matchedCurrentFindingIds.add(matchedCurrent.id);
      items.push({
        id: `ci-${crypto.randomUUID().substring(0, 8)}`,
        fingerprint: bFinding.fingerprint,
        status: 'still_present',
        category: bFinding.category,
        title: bFinding.title,
        severity: bFinding.severity,
        scanner: bFinding.scanner,
        filePath: bFinding.filePath,
        startLine: matchedCurrent.startLine ?? bFinding.startLine,
        baselineFinding: bFinding,
        currentFinding: matchedCurrent,
        reason: `Vulnerability pattern [${bFinding.ruleId}] remains detected in ${matchedCurrent.filePath}${
          matchedCurrent.startLine ? ` at line ${matchedCurrent.startLine}` : ''
        }.`,
        confidence: 'high',
      });
    } else {
      // The finding disappeared in a successfully executed scan!
      items.push({
        id: `ci-${crypto.randomUUID().substring(0, 8)}`,
        fingerprint: bFinding.fingerprint,
        status: 'resolved',
        category: bFinding.category,
        title: bFinding.title,
        severity: bFinding.severity,
        scanner: bFinding.scanner,
        filePath: bFinding.filePath,
        startLine: bFinding.startLine,
        baselineFinding: bFinding,
        reason: `Verified Fix: Scanner [${bFinding.scanner}] ran successfully and no longer detected pattern [${bFinding.ruleId}] in ${bFinding.filePath}.`,
        confidence: 'high',
      });
    }
  }

  // 2. Process Current Findings that were not in Baseline (NEW findings)
  for (const cFinding of currentScan.findings) {
    if (!matchedCurrentFindingIds.has(cFinding.id)) {
      items.push({
        id: `ci-${crypto.randomUUID().substring(0, 8)}`,
        fingerprint: cFinding.fingerprint,
        status: 'new',
        category: cFinding.category,
        title: cFinding.title,
        severity: cFinding.severity,
        scanner: cFinding.scanner,
        filePath: cFinding.filePath,
        startLine: cFinding.startLine,
        currentFinding: cFinding,
        reason: `Newly introduced or discovered finding detected by [${cFinding.scanner}] in rescan.`,
        confidence: 'high',
      });
    }
  }

  const resolvedCount = items.filter((i) => i.status === 'resolved').length;
  const stillPresentCount = items.filter((i) => i.status === 'still_present').length;
  const newCount = items.filter((i) => i.status === 'new').length;
  const inconclusiveCount = items.filter((i) => i.status === 'inconclusive').length;

  return {
    id: comparisonId,
    baselineScanId: baselineScan.id,
    currentScanId: currentScan.id,
    comparedAt: new Date().toISOString(),
    summary: {
      resolvedCount,
      stillPresentCount,
      newCount,
      inconclusiveCount,
      totalBaseline: baselineScan.findings.length,
      totalCurrent: currentScan.findings.length,
      scannerCoverageNotes: Array.from(new Set(scannerCoverageNotes)),
    },
    items,
  };
}
