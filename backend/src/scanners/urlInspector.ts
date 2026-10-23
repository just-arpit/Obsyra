import dns from 'dns/promises';
import http from 'http';
import https from 'https';
import { URL } from 'url';
import crypto from 'crypto';
import { Finding, ScannerExecutionResult } from '../types/finding.js';

export class SsrfBlockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfBlockError';
  }
}

/**
 * Checks if an IP string is within a private, loopback, or metadata address range.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 Loopback (127.0.0.0/8)
  if (/^127\./.test(ip)) return true;
  // Link-local / AWS / GCP metadata (169.254.0.0/16)
  if (/^169\.254\./.test(ip)) return true;
  // 10.0.0.0/8
  if (/^10\./.test(ip)) return true;
  // 172.16.0.0/12
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return true;
  // 192.168.0.0/16
  if (/^192\.168\./.test(ip)) return true;
  // 0.0.0.0
  if (ip === '0.0.0.0') return true;

  // IPv6
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fe80:') || normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  return false;
}

/**
 * Validates a target URL against SSRF and port abuse before connecting.
 */
export async function validateSafeTargetUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new SsrfBlockError('Invalid target URL structure');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfBlockError(`Disallowed URL protocol: ${parsed.protocol}. Only http and https are allowed.`);
  }

  const hostname = parsed.hostname;
  if (!hostname || hostname.toLowerCase() === 'localhost' || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new SsrfBlockError('Local and internal domains (localhost, .local, .internal) are prohibited for SSRF protection.');
  }

  // Resolve DNS to verify IP addresses
  let addresses: string[] = [];
  try {
    const lookup = await dns.lookup(hostname, { all: true });
    addresses = lookup.map((r) => r.address);
  } catch (err: any) {
    throw new SsrfBlockError(`DNS resolution failed for hostname "${hostname}": ${err?.message}`);
  }

  if (addresses.length === 0) {
    throw new SsrfBlockError(`Hostname "${hostname}" did not resolve to any IP address.`);
  }

  for (const addr of addresses) {
    if (isPrivateOrReservedIp(addr)) {
      throw new SsrfBlockError(`Prohibited internal/private IP address: ${addr} for host "${hostname}".`);
    }
  }

  return parsed;
}

export async function inspectAuthorizedUrl(
  rawUrl: string,
  scanId: string,
  isConfirmedAuthorized: boolean
): Promise<{ execution: ScannerExecutionResult; findings: Finding[] }> {
  const startTime = Date.now();

  if (!isConfirmedAuthorized) {
    return {
      execution: {
        scanner: 'url-inspector',
        available: true,
        executed: false,
        executionTimeMs: 0,
        exitCode: null,
        error: 'Target URL inspection requires explicit confirmation that you are authorized to review the site.',
        findingsCount: 0,
      },
      findings: [],
    };
  }

  let parsedUrl: URL;
  try {
    parsedUrl = await validateSafeTargetUrl(rawUrl);
  } catch (err: any) {
    return {
      execution: {
        scanner: 'url-inspector',
        available: true,
        executed: true,
        executionTimeMs: Date.now() - startTime,
        exitCode: 1,
        error: `SSRF Validation Blocked: ${err.message}`,
        findingsCount: 0,
      },
      findings: [],
    };
  }

  const findings: Finding[] = [];
  let executionError: string | undefined;

  try {
    const client = parsedUrl.protocol === 'https:' ? https : http;
    const headers = await new Promise<http.IncomingHttpHeaders>((resolve, reject) => {
      const req = client.request(
        parsedUrl,
        {
          method: 'GET',
          timeout: 10000,
          headers: {
            'User-Agent': 'VantaScan-Security-Auditor/1.0 (+https://vantascan.dev/passive-audit)',
            Accept: 'text/html,application/xhtml+xml,application/json,*/*',
          },
        },
        (res) => {
          // Bounded response: discard data, we only need passive headers
          res.resume();
          resolve(res.headers);
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Connection timed out after 10000ms'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.end();
    });

    const targetHost = parsedUrl.origin;

    // Check 1: Content-Security-Policy
    if (!headers['content-security-policy']) {
      const fingerprint = crypto.createHash('sha256').update(`url:csp:${targetHost}`).digest('hex').substring(0, 16);
      findings.push({
        id: `fnd-url-${crypto.randomUUID().substring(0, 8)}`,
        fingerprint,
        scanner: 'url-inspector',
        ruleId: 'missing-csp',
        category: 'Missing Security Header',
        title: 'Missing Content-Security-Policy (CSP) Header',
        severity: 'medium',
        confidence: 'high',
        filePath: targetHost,
        snippet: 'HTTP Response Headers do not include Content-Security-Policy',
        technicalExplanation: 'The web server does not specify a Content-Security-Policy header. CSP restricts the origins from which scripts, styles, and other resources can be loaded, acting as a crucial defense-in-depth barrier against Cross-Site Scripting (XSS).',
        plainLanguageImpact: 'If an attacker finds an input injection vulnerability on the site, the absence of CSP allows arbitrary external scripts and exfiltration endpoints to execute in visitors\' browsers.',
        recommendedRemediation: 'Configure the web server or reverse proxy to serve a strict Content-Security-Policy, e.g.: Content-Security-Policy: default-src \'self\'; script-src \'self\'; object-src \'none\';',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP', 'https://owasp.org/www-project-secure-headers/'],
        firstSeenScanId: scanId,
        status: 'new',
        verificationEvidence: `Inspected HTTP response headers from ${targetHost}`,
      });
    }

    // Check 2: Strict-Transport-Security (HSTS)
    if (parsedUrl.protocol === 'https:' && !headers['strict-transport-security']) {
      const fingerprint = crypto.createHash('sha256').update(`url:hsts:${targetHost}`).digest('hex').substring(0, 16);
      findings.push({
        id: `fnd-url-${crypto.randomUUID().substring(0, 8)}`,
        fingerprint,
        scanner: 'url-inspector',
        ruleId: 'missing-hsts',
        category: 'Missing Security Header',
        title: 'Missing HTTP Strict-Transport-Security (HSTS) Header',
        severity: 'medium',
        confidence: 'high',
        filePath: targetHost,
        snippet: 'HTTP Response Headers do not include Strict-Transport-Security',
        technicalExplanation: 'HSTS instructs modern browsers to only connect to this website using secure HTTPS, protecting against SSL-stripping and man-in-the-middle downgrade attacks.',
        plainLanguageImpact: 'An attacker positioned on an insecure Wi-Fi network could strip HTTPS and downgrade the user to unencrypted HTTP.',
        recommendedRemediation: 'Add the header: Strict-Transport-Security: max-age=63072000; includeSubDomains; preload',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Strict-Transport-Security'],
        firstSeenScanId: scanId,
        status: 'new',
        verificationEvidence: `Inspected HTTP response headers from ${targetHost}`,
      });
    }

    // Check 3: X-Frame-Options
    if (!headers['x-frame-options'] && !headers['content-security-policy']?.toString().includes('frame-ancestors')) {
      const fingerprint = crypto.createHash('sha256').update(`url:xfo:${targetHost}`).digest('hex').substring(0, 16);
      findings.push({
        id: `fnd-url-${crypto.randomUUID().substring(0, 8)}`,
        fingerprint,
        scanner: 'url-inspector',
        ruleId: 'missing-x-frame-options',
        category: 'Missing Security Header',
        title: 'Missing X-Frame-Options Header (Clickjacking Risk)',
        severity: 'low',
        confidence: 'high',
        filePath: targetHost,
        snippet: 'HTTP Response Headers do not include X-Frame-Options or frame-ancestors',
        technicalExplanation: 'X-Frame-Options prevents the website from being rendered inside an <iframe> on a malicious third-party site, mitigating UI redressing (clickjacking).',
        plainLanguageImpact: 'An attacker could embed your application in a hidden iframe and trick authenticated users into clicking buttons or triggering transactions unintentionally.',
        recommendedRemediation: 'Add the header: X-Frame-Options: DENY or X-Frame-Options: SAMEORIGIN',
        references: ['https://owasp.org/www-community/attacks/Clickjacking'],
        firstSeenScanId: scanId,
        status: 'new',
        verificationEvidence: `Inspected HTTP response headers from ${targetHost}`,
      });
    }

    // Check 4: X-Content-Type-Options
    if (!headers['x-content-type-options'] || headers['x-content-type-options'] !== 'nosniff') {
      const fingerprint = crypto.createHash('sha256').update(`url:xcto:${targetHost}`).digest('hex').substring(0, 16);
      findings.push({
        id: `fnd-url-${crypto.randomUUID().substring(0, 8)}`,
        fingerprint,
        scanner: 'url-inspector',
        ruleId: 'missing-nosniff',
        category: 'Missing Security Header',
        title: 'Missing or Incomplete X-Content-Type-Options Header',
        severity: 'low',
        confidence: 'high',
        filePath: targetHost,
        snippet: 'HTTP Response Headers missing: X-Content-Type-Options: nosniff',
        technicalExplanation: 'Without X-Content-Type-Options: nosniff, older or lenient browsers may attempt to guess (sniff) the MIME type of a file regardless of the Content-Type header, which can lead to unexpected script execution.',
        plainLanguageImpact: 'Non-executable file uploads (like user avatars or logs) might be treated as executable HTML/JavaScript in certain browsers.',
        recommendedRemediation: 'Set the HTTP header: X-Content-Type-Options: nosniff',
        references: ['https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Content-Type-Options'],
        firstSeenScanId: scanId,
        status: 'new',
        verificationEvidence: `Inspected HTTP response headers from ${targetHost}`,
      });
    }

    // Check 5: Insecure Cookies
    const setCookie = headers['set-cookie'];
    if (setCookie) {
      const cookieList = Array.isArray(setCookie) ? setCookie : [setCookie];
      for (const c of cookieList) {
        const lower = c.toLowerCase();
        const cookieName = c.split('=')[0]?.trim() || 'cookie';
        const missingFlags: string[] = [];
        if (!lower.includes('secure') && parsedUrl.protocol === 'https:') missingFlags.push('Secure');
        if (!lower.includes('httponly')) missingFlags.push('HttpOnly');
        if (!lower.includes('samesite')) missingFlags.push('SameSite');

        if (missingFlags.length > 0) {
          const fingerprint = crypto.createHash('sha256').update(`url:cookie:${targetHost}:${cookieName}`).digest('hex').substring(0, 16);
          findings.push({
            id: `fnd-url-${crypto.randomUUID().substring(0, 8)}`,
            fingerprint,
            scanner: 'url-inspector',
            ruleId: 'insecure-cookie-flags',
            category: 'Insecure Cookie',
            title: `Cookie "${cookieName}" Missing Security Attributes (${missingFlags.join(', ')})`,
            severity: missingFlags.includes('HttpOnly') ? 'medium' : 'low',
            confidence: 'high',
            filePath: targetHost,
            snippet: `Set-Cookie: ${cookieName}=***; ${missingFlags.map(f => `[MISSING ${f}]`).join(' ')}`,
            technicalExplanation: `The server set cookie "${cookieName}" without the following recommended flags: ${missingFlags.join(', ')}. HttpOnly protects cookies from JavaScript access (XSS token theft); Secure prevents transmission over unencrypted HTTP; SameSite defends against CSRF.`,
            plainLanguageImpact: 'Session tokens or sensitive identifiers stored in this cookie may be stolen via XSS or leaked across unauthorized origins.',
            recommendedRemediation: `Ensure your session or cookie configuration sets Secure, HttpOnly, and SameSite=Lax (or Strict).`,
            references: ['https://owasp.org/www-community/controls/SecureCookieAttribute'],
            firstSeenScanId: scanId,
            status: 'new',
            verificationEvidence: `Passive inspection of Set-Cookie header for ${cookieName}`,
          });
        }
      }
    }
  } catch (err: any) {
    executionError = `Passive inspection error: ${err?.message || 'Connection failed'}`;
  }

  return {
    execution: {
      scanner: 'url-inspector',
      available: true,
      executed: true,
      executionTimeMs: Date.now() - startTime,
      exitCode: executionError ? 1 : 0,
      error: executionError,
      findingsCount: findings.length,
    },
    findings,
  };
}
