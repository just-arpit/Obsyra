import {
  ScanRecord,
  ScannerReadiness,
  RemediationPlan,
  ComparisonResult,
} from '../types';

const BASE_URL = '/api';

export async function fetchHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchScanners(): Promise<ScannerReadiness> {
  const res = await fetch(`${BASE_URL}/scanners`);
  if (!res.ok) throw new Error('Failed to retrieve scanner status');
  return res.json();
}

export async function fetchScans(): Promise<ScanRecord[]> {
  const res = await fetch(`${BASE_URL}/scans`);
  if (!res.ok) throw new Error('Failed to fetch scan history');
  return res.json();
}

export async function fetchScan(id: string): Promise<ScanRecord> {
  const res = await fetch(`${BASE_URL}/scans/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch scan ${id}`);
  return res.json();
}

export async function deleteScan(id: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/scans/${id}`, { method: 'DELETE' });
  return res.ok;
}

export async function uploadScan(formData: FormData): Promise<ScanRecord> {
  const res = await fetch(`${BASE_URL}/scans/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upload failed with HTTP ${res.status}`);
  }
  return res.json();
}

export async function submitGitHubScan(data: {
  repoUrl: string;
  branch?: string;
  projectName?: string;
  targetUrl?: string;
  authorizedConsent?: boolean;
}): Promise<ScanRecord> {
  const res = await fetch(`${BASE_URL}/scans/github`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `GitHub scan failed with HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchScanStatus(scanId: string) {
  const res = await fetch(`${BASE_URL}/scans/${scanId}/status`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch scan status (${res.status})`);
  }
  return res.json();
}

export async function rescanProject(
  baselineId: string,
  formData: FormData
): Promise<{ scan: ScanRecord; comparison: ComparisonResult }> {
  const res = await fetch(`${BASE_URL}/scans/${baselineId}/rescan`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Rescan failed with HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchRemediation(scanId: string): Promise<RemediationPlan> {
  const res = await fetch(`${BASE_URL}/scans/${scanId}/remediation`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate remediation guidance');
  }
  return res.json();
}

export async function fetchPromptText(scanId: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/scans/${scanId}/prompt`);
  if (!res.ok) throw new Error('Failed to fetch prompt');
  return res.text();
}

export async function fetchComparison(id: string): Promise<ComparisonResult> {
  const res = await fetch(`${BASE_URL}/comparisons/${id}`);
  if (!res.ok) throw new Error(`Failed to load comparison ${id}`);
  return res.json();
}

export async function runDemoScan(
  mode: 'vulnerable' | 'corrected',
  baselineId?: string
): Promise<{ scan: ScanRecord; comparison?: ComparisonResult }> {
  const res = await fetch(`${BASE_URL}/fixtures/scan-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, baselineId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Demo fixture scan failed');
  }
  return res.json();
}
