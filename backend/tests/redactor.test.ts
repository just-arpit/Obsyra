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

  it('should redact generic passwords and secrets in JS, JSON, ENV, and YAML formats', () => {
    // JS assignment
    const rawJs = 'const password = "SuperSecretPassword123!";';
    expect(redactText(rawJs)).toContain('[REDACTED_SECRET]');
    expect(redactText(rawJs)).not.toContain('SuperSecretPassword123!');

    // JSON format with quoted property name
    const rawJson = '{"password": "SuperSecretPassword123!", "api_key": "secretTokenABC123"}';
    const cleanJson = redactText(rawJson);
    expect(cleanJson).toContain('[REDACTED_SECRET]');
    expect(cleanJson).not.toContain('SuperSecretPassword123!');
    expect(cleanJson).not.toContain('secretTokenABC123');

    // .env format without quotes
    const rawEnv = 'PASSWORD=SuperSecretPassword123!\nAPI_KEY=mySecretApiKey987';
    const cleanEnv = redactText(rawEnv);
    expect(cleanEnv).toContain('PASSWORD=[REDACTED_SECRET]');
    expect(cleanEnv).toContain('API_KEY=[REDACTED_SECRET]');
    expect(cleanEnv).not.toContain('SuperSecretPassword123!');

    // YAML format
    const rawYaml = 'password: SuperSecretPassword123!';
    expect(redactText(rawYaml)).toContain('password: [REDACTED_SECRET]');
    expect(redactText(rawYaml)).not.toContain('SuperSecretPassword123!');
  });

  it('should redact AWS Secret Access Keys in config and JSON formats', () => {
    const raw = 'AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"';
    const clean = redactText(raw);
    expect(clean).toContain('[REDACTED_AWS_SECRET_KEY]');
    expect(clean).not.toContain('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');

    const rawJson = '{"AWS_SECRET_ACCESS_KEY": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"}';
    const cleanJson = redactText(rawJson);
    expect(cleanJson).toContain('[REDACTED_AWS_SECRET_KEY]');
    expect(cleanJson).not.toContain('wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
  });

  it('should redact OpenAI and Anthropic API keys', () => {
    const rawOpenAI = 'const key = "sk-proj-abc1234567890abcdefghijklmnopqrstuvwxyz123456";';
    const cleanOpenAI = redactText(rawOpenAI);
    expect(cleanOpenAI).toContain('[REDACTED_OPENAI_API_KEY]');
    expect(cleanOpenAI).not.toContain('sk-proj-abc1234567890abcdefghijklmnopqrstuvwxyz123456');

    const rawAnthropic = 'const ant = "sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890";';
    const cleanAnthropic = redactText(rawAnthropic);
    expect(cleanAnthropic).toContain('[REDACTED_ANTHROPIC_API_KEY]');
    expect(cleanAnthropic).not.toContain('sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890');
  });

  it('should redact JWT tokens and standalone Bearer tokens', () => {
    const rawJwt = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
    const cleanJwt = redactText(rawJwt);
    expect(cleanJwt).not.toContain('SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c');
    expect(cleanJwt).toContain('[REDACTED_JWT_TOKEN]');

    const rawBearer = 'Bearer someRandomAuthTokenString12345';
    const cleanBearer = redactText(rawBearer);
    expect(cleanBearer).toContain('[REDACTED_BEARER_TOKEN]');
    expect(cleanBearer).not.toContain('someRandomAuthTokenString12345');
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
