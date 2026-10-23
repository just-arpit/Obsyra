import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { ScanRecord } from '../types/scan.js';
import { ComparisonResult } from '../types/comparison.js';

const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'vantascan.sqlite');

let dbInstance: DatabaseSync | null = null;

export function getDatabase(): DatabaseSync {
  if (!dbInstance) {
    const dbDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    dbInstance = new DatabaseSync(DB_PATH);

    // Initialize Schema
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS scans (
        id TEXT PRIMARY KEY,
        project_name TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        target_url TEXT,
        archive_file_name TEXT,
        file_count INTEGER DEFAULT 0,
        total_size_bytes INTEGER DEFAULT 0,
        scanners_run TEXT NOT NULL,
        summary TEXT NOT NULL,
        findings TEXT NOT NULL,
        baseline_scan_id TEXT,
        error TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);

      CREATE TABLE IF NOT EXISTS comparisons (
        id TEXT PRIMARY KEY,
        baseline_scan_id TEXT NOT NULL,
        current_scan_id TEXT NOT NULL,
        compared_at TEXT NOT NULL,
        summary TEXT NOT NULL,
        items TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_comparisons_pair ON comparisons(baseline_scan_id, current_scan_id);
    `);
  }
  return dbInstance;
}

export function saveScan(scan: ScanRecord): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO scans (
      id, project_name, status, created_at, completed_at, target_url, archive_file_name,
      file_count, total_size_bytes, scanners_run, summary, findings, baseline_scan_id, error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      status = excluded.status,
      completed_at = excluded.completed_at,
      scanners_run = excluded.scanners_run,
      summary = excluded.summary,
      findings = excluded.findings,
      error = excluded.error
  `);

  stmt.run(
    scan.id,
    scan.projectName,
    scan.status,
    scan.createdAt,
    scan.completedAt || null,
    scan.targetUrl || null,
    scan.archiveFileName || null,
    scan.fileCount,
    scan.totalSizeBytes,
    JSON.stringify(scan.scannersRun),
    JSON.stringify(scan.summary),
    JSON.stringify(scan.findings),
    scan.baselineScanId || null,
    scan.error || null
  );
}

export function getScan(id: string): ScanRecord | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM scans WHERE id = ?');
  const row: any = stmt.get(id);
  if (!row) return null;

  return {
    id: row.id,
    projectName: row.project_name,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    targetUrl: row.target_url,
    archiveFileName: row.archive_file_name,
    fileCount: row.file_count,
    totalSizeBytes: row.total_size_bytes,
    scannersRun: JSON.parse(row.scanners_run),
    summary: JSON.parse(row.summary),
    findings: JSON.parse(row.findings),
    baselineScanId: row.baseline_scan_id,
    error: row.error,
  };
}

export function listScans(): ScanRecord[] {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM scans ORDER BY created_at DESC');
  const rows: any[] = stmt.all();

  return rows.map((row) => ({
    id: row.id,
    projectName: row.project_name,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
    targetUrl: row.target_url,
    archiveFileName: row.archive_file_name,
    fileCount: row.file_count,
    totalSizeBytes: row.total_size_bytes,
    scannersRun: JSON.parse(row.scanners_run),
    summary: JSON.parse(row.summary),
    findings: JSON.parse(row.findings),
    baselineScanId: row.baseline_scan_id,
    error: row.error,
  }));
}

export function deleteScan(id: string): boolean {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM scans WHERE id = ?');
  const res: any = stmt.run(id);
  return (res.changes ?? 0) > 0;
}

export function saveComparison(comp: ComparisonResult): void {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO comparisons (
      id, baseline_scan_id, current_scan_id, compared_at, summary, items
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      compared_at = excluded.compared_at,
      summary = excluded.summary,
      items = excluded.items
  `);

  stmt.run(
    comp.id,
    comp.baselineScanId,
    comp.currentScanId,
    comp.comparedAt,
    JSON.stringify(comp.summary),
    JSON.stringify(comp.items)
  );
}

export function getComparison(id: string): ComparisonResult | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM comparisons WHERE id = ?');
  const row: any = stmt.get(id);
  if (!row) return null;

  return {
    id: row.id,
    baselineScanId: row.baseline_scan_id,
    currentScanId: row.current_scan_id,
    comparedAt: row.compared_at,
    summary: JSON.parse(row.summary),
    items: JSON.parse(row.items),
  };
}

export function getComparisonByScans(baselineId: string, currentId: string): ComparisonResult | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM comparisons WHERE baseline_scan_id = ? AND current_scan_id = ?');
  const row: any = stmt.get(baselineId, currentId);
  if (!row) return null;

  return {
    id: row.id,
    baselineScanId: row.baseline_scan_id,
    currentScanId: row.current_scan_id,
    comparedAt: row.compared_at,
    summary: JSON.parse(row.summary),
    items: JSON.parse(row.items),
  };
}
