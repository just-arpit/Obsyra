import { Finding } from '../types/finding.js';
import { redactText } from '../sanitization/redactor.js';

/**
 * Builds the consolidated, ready-to-paste repair prompt for AI coding agents
 * (e.g. Gemini, Claude, Cursor, Copilot) containing the 10 mandated requirements.
 */
export function buildReadyToPastePrompt(projectName: string, findings: Finding[]): string {
  const secretFindings = findings.filter((f) => f.category === 'Hardcoded Secret');
  const codeFindings = findings.filter((f) => f.category !== 'Hardcoded Secret');

  const lines: string[] = [];

  lines.push(`# SECURITY REMEDIATION INSTRUCTIONS FOR AI CODING AGENT`);
  lines.push(`**Target Project:** ${projectName}`);
  lines.push(`**Reviewer:** VantaScan Multi-Scanner AI Security Reviewer`);
  lines.push(`**Date Generated:** ${new Date().toISOString()}`);
  lines.push(`**Total Findings Detected:** ${findings.length}`);
  lines.push('');

  // 1. Project Context
  lines.push(`## 1. PROJECT CONTEXT & MISSION`);
  lines.push(
    `You are acting as an expert application security engineer and principal developer. The project "${projectName}" has been scanned by automated SAST, secret, and configuration scanners. Your objective is to refactor the code to eliminate all confirmed vulnerabilities without breaking existing functional behavior.`
  );
  lines.push('');

  // 2. Confirmed and Likely Findings
  lines.push(`## 2. CONFIRMED FINDINGS OVERVIEW`);
  if (findings.length === 0) {
    lines.push(`No critical automated findings were detected. Review general defensive guidelines below.`);
  } else {
    findings.forEach((f, idx) => {
      const typeLabel = f.aiHypothesis ? '[UNVERIFIED HYPOTHESIS]' : '[CONFIRMED SCANNER FINDING]';
      lines.push(`${idx + 1}. **${f.title}** (${f.severity.toUpperCase()}) — ${typeLabel}`);
      lines.push(`   - **Scanner / Rule:** ${f.scanner} :: \`${f.ruleId}\``);
      lines.push(`   - **Category:** ${f.category}`);
      lines.push(`   - **File Location:** \`${f.filePath}${f.startLine ? `:${f.startLine}` : ''}\``);
      lines.push(`   - **Impact:** ${f.plainLanguageImpact}`);
    });
  }
  lines.push('');

  // 3. Affected Files and Redacted Evidence
  lines.push(`## 3. AFFECTED FILES & REDACTED EVIDENCE`);
  findings.forEach((f, idx) => {
    lines.push(`### Finding #${idx + 1}: \`${f.filePath}\` (Line ${f.startLine ?? 'N/A'})`);
    if (f.snippet) {
      lines.push('```');
      lines.push(redactText(f.snippet));
      lines.push('```');
    }
    lines.push(`*Technical Context:* ${f.technicalExplanation}`);
    lines.push('');
  });

  // 4. Prioritised Required Changes
  lines.push(`## 4. PRIORITISED REQUIRED CHANGES`);
  lines.push(`Execute fixes in strict priority order:`);
  lines.push(`1. **Immediate P0 (Secrets & Credentials):** Purge hardcoded tokens and migrate to runtime environment variables.`);
  lines.push(`2. **High P1 (RCE / Injection / Auth):** Eliminate \`eval()\`, sanitize unescaped HTML, and attach authentication/authorization guards.`);
  lines.push(`3. **Medium P2 (Configuration & Headers):** Tighten CORS policies and enforce security headers (CSP, HSTS, X-Content-Type-Options, HttpOnly cookies).`);
  lines.push('');

  // 5. Architecture and Compatibility Constraints
  lines.push(`## 5. ARCHITECTURE & COMPATIBILITY CONSTRAINTS`);
  lines.push(`- Do NOT break existing public API contracts or route request/response shapes.`);
  lines.push(`- Do NOT add unnecessary heavy third-party dependencies when native runtime APIs suffice.`);
  lines.push(`- Preserve existing TypeScript types and function signatures where possible.`);
  lines.push(`- Keep configuration backwards-compatible via sensible environment variable defaults.`);
  lines.push('');

  // 6. Secret Rotation & Revocation Requirements
  lines.push(`## 6. CREDENTIAL REVOCATION & ROTATION DIRECTIVES`);
  if (secretFindings.length > 0) {
    lines.push(`> [!WARNING]`);
    lines.push(`> **CRITICAL SECRET POLICY**: Merely deleting or replacing the secret string in this file DOES NOT secure the system. The secret was exposed in plaintext.`);
    lines.push(`> 1. Log in to the respective cloud provider / service dashboard immediately.`);
    lines.push(`> 2. Revoke the exposed API token / key.`);
    lines.push(`> 3. Generate a fresh key and inject it solely via local \`.env\` (ensure \`.env\` is in \`.gitignore\`).`);
    lines.push(`> 4. Audit recent cloud audit logs for unauthorized API activity during the exposure window.`);
  } else {
    lines.push(`No active hardcoded secrets were detected. Maintain strict secrets isolation.`);
  }
  lines.push('');

  // 7. Regression Tests
  lines.push(`## 7. REGRESSION TESTS TO ADD OR UPDATE`);
  lines.push(`Write unit or integration tests that prove the vulnerability is eliminated:`);
  lines.push(`- Test that unauthenticated calls to protected routes return HTTP 401/403.`);
  lines.push(`- Test that malicious payload strings (e.g. \`<script>\`, \`eval\` payloads) are neutralized and safely escaped.`);
  lines.push(`- Test that server startups fail gracefully if required environment variables are absent.`);
  lines.push('');

  // 8. Verification Commands
  lines.push(`## 8. COMMANDS TO RUN FOR VERIFICATION & SCANNING`);
  lines.push('```bash');
  lines.push('# 1. Run local test suite');
  lines.push('npm test');
  lines.push('');
  lines.push('# 2. Rescan locally with Gitleaks (if installed)');
  lines.push('gitleaks dir --source . --verbose');
  lines.push('');
  lines.push('# 3. Rescan locally with Semgrep (if installed)');
  lines.push('semgrep scan --config auto .');
  lines.push('');
  lines.push('# 4. Rescan with Trivy (if installed)');
  lines.push('trivy fs .');
  lines.push('```');
  lines.push('');

  // 9. Instructions Not to Weaken Security Controls
  lines.push(`## 9. HARDENED DEFENSIVE CONSTRAINTS`);
  lines.push(`- Do NOT resolve security warnings by disabling scanner rules (e.g., adding \`// nosemgrep\` or \`// gitleaks:allow\`) unless explicitly proven to be a true false positive with documented justification.`);
  lines.push(`- Do NOT disable TypeScript strict mode or suppress linter errors with \`@ts-ignore\` as a shortcut.`);
  lines.push(`- Do NOT use wildcard CORS (\`Access-Control-Allow-Origin: *\`) in production.`);
  lines.push('');

  // 10. Honesty Directive
  lines.push(`## 10. HONEST REPORTING MANDATE`);
  lines.push(
    `When reporting your completed changes, clearly state what was resolved, what was left unresolved, and any architectural trade-offs introduced. Never claim a system is 100% secure.`
  );

  return lines.join('\n');
}
