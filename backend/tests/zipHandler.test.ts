import { describe, it, expect } from 'vitest';
import AdmZip from 'adm-zip';
import { safelyExtractZip, ZipIntakeError, cleanupScanDirectory } from '../src/intake/zipHandler.js';

describe('ZIP Intake and Security Boundary', () => {
  it('should reject invalid or non-ZIP buffer', () => {
    const corruptBuffer = Buffer.from('NOT_A_VALID_ZIP_ARCHIVE');
    expect(() => safelyExtractZip(corruptBuffer, 'test-corrupt')).toThrowError(ZipIntakeError);
  });

  it('should reject empty zip archives', () => {
    const zip = new AdmZip();
    const emptyBuffer = zip.toBuffer();
    expect(() => safelyExtractZip(emptyBuffer, 'test-empty')).toThrowError(/empty/i);
  });

  it('should block ZipSlip / directory traversal attempts', () => {
    const zip = new AdmZip();
    zip.addFile('placeholder.txt', Buffer.from('malicious content'));
    zip.getEntries()[0].entryName = '../../etc/passwd';
    const traversalBuffer = zip.toBuffer();

    expect(() => safelyExtractZip(traversalBuffer, 'test-traversal')).toThrowError(
      /Path traversal attempt detected/i
    );
  });

  it('should block null bytes in paths', () => {
    const zip = new AdmZip();
    zip.addFile('evil\0file.js', Buffer.from('alert(1)'));
    const buffer = zip.toBuffer();

    expect(() => safelyExtractZip(buffer, 'test-nullbyte')).toThrowError(/null byte/i);
  });

  it('should successfully extract valid files and exclude node_modules', () => {
    const zip = new AdmZip();
    zip.addFile('src/index.js', Buffer.from('console.log("hello");'));
    zip.addFile('package.json', Buffer.from('{"name": "test-app"}'));
    zip.addFile('node_modules/heavy/index.js', Buffer.from('module.exports = {};'));

    const buffer = zip.toBuffer();
    const result = safelyExtractZip(buffer, 'test-valid');

    try {
      expect(result.fileCount).toBe(2);
      expect(result.relativeFiles).toContain('src/index.js');
      expect(result.relativeFiles).toContain('package.json');
      expect(result.relativeFiles).not.toContain('node_modules/heavy/index.js');
    } finally {
      cleanupScanDirectory(result.extractDir);
    }
  });
});
