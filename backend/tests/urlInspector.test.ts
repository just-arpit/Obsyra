import { describe, it, expect } from 'vitest';
import { isPrivateOrReservedIp, validateSafeTargetUrl, inspectAuthorizedUrl, SsrfBlockError } from '../src/scanners/urlInspector.js';

describe('URL Inspector and SSRF Protection Boundary', () => {
  it('should flag loopback and private IPs as reserved', () => {
    expect(isPrivateOrReservedIp('127.0.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('127.1.2.3')).toBe(true);
    expect(isPrivateOrReservedIp('10.0.0.5')).toBe(true);
    expect(isPrivateOrReservedIp('172.16.0.1')).toBe(true);
    expect(isPrivateOrReservedIp('172.31.255.255')).toBe(true);
    expect(isPrivateOrReservedIp('192.168.1.1')).toBe(true);
    expect(isPrivateOrReservedIp('169.254.169.254')).toBe(true); // AWS / Cloud metadata
    expect(isPrivateOrReservedIp('::1')).toBe(true); // IPv6 loopback
    expect(isPrivateOrReservedIp('0.0.0.0')).toBe(true);
  });

  it('should allow public IP addresses', () => {
    expect(isPrivateOrReservedIp('8.8.8.8')).toBe(false);
    expect(isPrivateOrReservedIp('1.1.1.1')).toBe(false);
    expect(isPrivateOrReservedIp('142.250.190.46')).toBe(false);
  });

  it('should reject URLs with localhost or internal domains', async () => {
    await expect(validateSafeTargetUrl('http://localhost:8080')).rejects.toThrowError(SsrfBlockError);
    await expect(validateSafeTargetUrl('http://127.0.0.1:3000')).rejects.toThrowError(SsrfBlockError);
    await expect(validateSafeTargetUrl('http://internal-service.local')).rejects.toThrowError(SsrfBlockError);
  });

  it('should reject non-HTTP/HTTPS schemes', async () => {
    await expect(validateSafeTargetUrl('file:///etc/passwd')).rejects.toThrowError(/Disallowed URL protocol/);
    await expect(validateSafeTargetUrl('ftp://ftp.example.com')).rejects.toThrowError(/Disallowed URL protocol/);
    await expect(validateSafeTargetUrl('javascript:alert(1)')).rejects.toThrowError(/Disallowed URL protocol/);
  });

  it('should refuse execution if user authorization consent is false', async () => {
    const res = await inspectAuthorizedUrl('https://example.com', 'test-scan', false);
    expect(res.execution.executed).toBe(false);
    expect(res.execution.error).toContain('explicit confirmation');
    expect(res.findings).toHaveLength(0);
  });
});
