import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import os from 'os';

export interface ExtractionResult {
  extractDir: string;
  fileCount: number;
  totalSizeBytes: number;
  relativeFiles: string[];
}

export class ZipIntakeError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'ZipIntakeError';
  }
}

const DEFAULT_MAX_FILES = parseInt(process.env.MAX_EXTRACTED_FILES || '500', 10);
const DEFAULT_MAX_BYTES = (parseInt(process.env.MAX_EXTRACTED_BYTES_MB || '50', 10)) * 1024 * 1024;

// Directories to skip extracting to prevent huge junk/dependency bloat
const IGNORED_DIR_PATTERNS = [
  /^(?:.*\/)?node_modules\//i,
  /^(?:.*\/)?\.git\//i,
  /^(?:.*\/)?dist\//i,
  /^(?:.*\/)?build\//i,
  /^(?:.*\/)?\.next\//i,
  /^(?:.*\/)?vendor\//i,
  /^(?:.*\/)?\.cache\//i,
];

/**
 * Validates and safely extracts a ZIP archive into a dedicated temporary scan directory.
 * Prevents ZipSlip / directory traversal vulnerabilities, zip bombs, and excludes dependency bloat.
 */
export function safelyExtractZip(
  zipBuffer: Buffer,
  scanId: string,
  options?: { maxFiles?: number; maxBytes?: number }
): ExtractionResult {
  const maxFiles = options?.maxFiles || DEFAULT_MAX_FILES;
  const maxBytes = options?.maxBytes || DEFAULT_MAX_BYTES;

  let zip: AdmZip;
  try {
    zip = new AdmZip(zipBuffer);
  } catch (err: any) {
    throw new ZipIntakeError(
      `Corrupted or invalid ZIP file archive: ${err?.message || 'unknown archive error'}`,
      'INVALID_ZIP_ARCHIVE'
    );
  }

  const entries = zip.getEntries();
  if (!entries || entries.length === 0) {
    throw new ZipIntakeError('The uploaded ZIP archive is empty', 'EMPTY_ARCHIVE');
  }

  // Create isolated temp directory
  const baseTempDir = path.join(os.tmpdir(), 'vantascan-scans');
  if (!fs.existsSync(baseTempDir)) {
    fs.mkdirSync(baseTempDir, { recursive: true, mode: 0o700 });
  }

  const targetDir = path.join(baseTempDir, `scan-${scanId}`);
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true, mode: 0o700 });

  const resolvedTargetDir = path.resolve(targetDir);
  let totalBytes = 0;
  let fileCount = 0;
  const extractedFiles: string[] = [];

  for (const entry of entries) {
    const rawName = entry.entryName;

    // Check for null bytes or suspicious characters
    if (rawName.includes('\0')) {
      cleanupScanDirectory(targetDir);
      throw new ZipIntakeError('Archive contains forbidden null bytes in path', 'SUSPICIOUS_PATH');
    }

    // ZipSlip / Path Traversal validation: reject '..' or absolute paths
    if (rawName.includes('..') || path.isAbsolute(rawName) || rawName.startsWith('/') || rawName.startsWith('\\')) {
      cleanupScanDirectory(targetDir);
      throw new ZipIntakeError(
        `Path traversal attempt detected in entry: ${rawName}`,
        'ZIP_SLIP_ATTEMPT'
      );
    }

    const fullDestinationPath = path.resolve(resolvedTargetDir, rawName);

    // Verify destination strictly stays within the sandbox targetDir
    if (!fullDestinationPath.startsWith(resolvedTargetDir + path.sep) && fullDestinationPath !== resolvedTargetDir) {
      cleanupScanDirectory(targetDir);
      throw new ZipIntakeError(
        `Path traversal attempt detected in entry: ${rawName}`,
        'ZIP_SLIP_ATTEMPT'
      );
    }

    // Skip ignored directories (e.g. node_modules, .git)
    if (IGNORED_DIR_PATTERNS.some(pat => pat.test(rawName))) {
      continue;
    }

    if (entry.isDirectory) {
      if (!fs.existsSync(fullDestinationPath)) {
        fs.mkdirSync(fullDestinationPath, { recursive: true, mode: 0o700 });
      }
      continue;
    }

    // Size limit check
    totalBytes += entry.header.size;
    if (totalBytes > maxBytes) {
      cleanupScanDirectory(targetDir);
      throw new ZipIntakeError(
        `Archive uncompressed size exceeds limit of ${maxBytes / (1024 * 1024)}MB`,
        'ZIP_BOMB_SIZE_LIMIT'
      );
    }

    // File count limit check
    fileCount++;
    if (fileCount > maxFiles) {
      cleanupScanDirectory(targetDir);
      throw new ZipIntakeError(
        `Archive file count exceeds limit of ${maxFiles} files`,
        'ZIP_BOMB_FILE_LIMIT'
      );
    }

    // Ensure parent directory exists
    const parentDir = path.dirname(fullDestinationPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true, mode: 0o700 });
    }

    // Extract file content safely without executing
    fs.writeFileSync(fullDestinationPath, entry.getData(), { mode: 0o600 });
    extractedFiles.push(path.relative(resolvedTargetDir, fullDestinationPath));
  }

  return {
    extractDir: targetDir,
    fileCount,
    totalSizeBytes: totalBytes,
    relativeFiles: extractedFiles,
  };
}

/**
 * Safely removes temporary scan directory and all extracted files.
 */
export function cleanupScanDirectory(dirPath: string): void {
  try {
    if (dirPath && fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    // Non-fatal, but avoid crashing
    console.warn(`[Intake] Warning: Failed to clean up temp scan directory: ${dirPath}`, err);
  }
}
