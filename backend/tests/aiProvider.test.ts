import { describe, it, expect } from 'vitest';
import { GeminiProvider } from '../src/ai/geminiProvider.js';
import { buildReadyToPastePrompt } from '../src/ai/promptGenerator.js';
import { Finding } from '../src/types/finding.js';

describe('AI Remediation Engine and Prompt Generator', () => {
  const sampleFindings: Finding[] = [
    {
      id: 'fnd-1',
      fingerprint: 'fp-1',
      scanner: 'gitleaks',
      ruleId: 'gemini-api-key',
      category: 'Hardcoded Secret',
      title: 'Hardcoded Google Gemini API Key in Source',
      severity: 'critical',
      confidence: 'high',
      filePath: 'src/config.ts',
      startLine: 5,
      snippet: 'const KEY = "[REDACTED_GEMINI_API_KEY]";',
      technicalExplanation: 'Exposed API token',
      plainLanguageImpact: 'Quota and cloud billing compromise',
      recommendedRemediation: 'Revoke key and inject via environment variables',
      references: ['https://ai.google.dev'],
      firstSeenScanId: 's1',
      status: 'new',
    },
    {
      id: 'fnd-2',
      fingerprint: 'fp-2',
      scanner: 'semgrep',
      ruleId: 'detect-eval-with-expression',
      category: 'Injection / XSS',
      title: 'Arbitrary Code Execution via eval()',
      severity: 'high',
      confidence: 'high',
      filePath: 'src/calculator.ts',
      startLine: 18,
      snippet: 'mathParser.parse(req.query.expression);',
      technicalExplanation: 'Unsanitized input passed to eval',
      plainLanguageImpact: 'Remote Code Execution',
      recommendedRemediation: 'Parse mathematical expressions with safe AST parser',
      references: ['https://cwe.mitre.org/data/definitions/94.html'],
      firstSeenScanId: 's1',
      status: 'new',
    },
  ];

  it('should format ready-to-paste prompt with all 10 mandated sections', () => {
    const prompt = buildReadyToPastePrompt('DemoApp', sampleFindings);

    expect(prompt).toContain('## 1. PROJECT CONTEXT & MISSION');
    expect(prompt).toContain('## 2. CONFIRMED FINDINGS OVERVIEW');
    expect(prompt).toContain('## 3. AFFECTED FILES & REDACTED EVIDENCE');
    expect(prompt).toContain('## 4. PRIORITISED REQUIRED CHANGES');
    expect(prompt).toContain('## 5. ARCHITECTURE & COMPATIBILITY CONSTRAINTS');
    expect(prompt).toContain('## 6. CREDENTIAL REVOCATION & ROTATION DIRECTIVES');
    expect(prompt).toContain('## 7. REGRESSION TESTS TO ADD OR UPDATE');
    expect(prompt).toContain('## 8. COMMANDS TO RUN FOR VERIFICATION & SCANNING');
    expect(prompt).toContain('## 9. HARDENED DEFENSIVE CONSTRAINTS');
    expect(prompt).toContain('## 10. HONEST REPORTING MANDATE');
  });

  it('should fall back gracefully to deterministic plan when API key is unconfigured', async () => {
    const provider = new GeminiProvider();
    // In test environment without key, it must not throw and must return structured plan
    const plan = await provider.generateRemediationPlan(sampleFindings, 'TestProject');

    expect(plan).toBeDefined();
    expect(plan.riskScore).toBeGreaterThan(0);
    expect(plan.prioritizedSteps.length).toBeGreaterThan(0);
    expect(plan.credentialRotations.length).toBeGreaterThan(0);
    expect(plan.readyToPasteRepairPrompt).toContain('## 1. PROJECT CONTEXT');
    expect(plan.readyToPasteRepairPrompt).not.toContain('AIzaSy'); // Redaction preserved
  });
});
