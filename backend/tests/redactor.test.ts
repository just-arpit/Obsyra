import { describe, it, expect } from 'vitest';
import { redactText, redactFinding, getCredentialRemediationNotice } from '../src/sanitization/redactor.js';
import { Finding } from '../src/types/finding.js';

describe('Secret Redaction Engine', () => {
  it('should redact Google Gemini API keys', () => {
    const raw = 'const key = "AIzaSyB1234567890abcdefghijklmnopqrstuv";';
    const clean = redactText(raw);
    expect(clean).not.toContain('AIzaSyB1234567890abcdefghijklmnopqrstuv');
    expect(clean).toContain('[REDACTED_GEMINI_API_KEY]');
  });

  it('should redact AWS Access Key IDs', () => {
    const raw = 'AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE';
    const clean = redactText(raw);
    expect(clean).not.toContain('AKIAIOSFODNN7EXAMPLE');
    expect(clean).toContain('[REDACTED_AWS_KEY_ID]');
  });

  it('should redact generic passwords and secrets', () => {
    const raw = 'const password = "SuperSecretPassword123!";';
    const clean = redactText(raw);
    expect(clean).not.toContain('SuperSecretPassword123!');
    expect(clean).toContain('[REDACTED_SECRET]');
  });

  it('should redact JWT tokens', () => {
    const raw = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const clean = redactText(raw);
    expect(clean).not.toContain('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
  });

  it('should redact database credentials in URIs', () => {
    const raw = 'postgres://admin:secretPass123@db.example.com:5432/mydb';
    const clean = redactText(raw);
    expect(clean).not.toContain('secretPass123');
    expect(clean).toContain('[REDACTED_PASSWORD]');
  });

  it('should clean all fields in a Finding object', () => {
    const finding: Finding = {
      id: 'fnd-1',
      fingerprint: 'fp-1',
      scanner: 'gitleaks',
      ruleId: 'gemini-key',
      category: 'Hardcoded Secret',
      title: 'Found key AIzaSyD1234567890123456789012345678901',
      severity: 'critical',
      confidence: 'high',
      filePath: 'src/config.ts',
      snippet: 'const GEMINI_KEY = "AIzaSyD1234567890123456789012345678901";',
      technicalExplanation: 'Key AIzaSyD1234567890123456789012345678901 was hardcoded',
      plainLanguageImpact: 'Leaked AIzaSyD1234567890123456789012345678901 key',
      recommendedRemediation: 'Revoke key',
      references: [],
      firstSeenScanId: 's1',
      status: 'new',
    };

    const sanitized = redactFinding(finding);
    expect(sanitized.snippet).not.toContain('AIzaSyD1234567890123456789012345678901');
    expect(sanitized.title).not.toContain('AIzaSyD1234567890123456789012345678901');
    expect(sanitized.technicalExplanation).not.toContain('AIzaSyD1234567890123456789012345678901');
  });

  it('should explicitly note in remediation notice that deleting code does not revoke key', () => {
    const notice = getCredentialRemediationNotice('API key');
    expect(notice).toContain('Simply removing the credential from source code does NOT invalidate the token');
    expect(notice).toContain('Revoke / Rotate');
  });
});
