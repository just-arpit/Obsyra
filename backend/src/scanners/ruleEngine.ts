import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Finding, FindingCategory, ScannerExecutionResult, Severity } from '../types/finding.js';
import { redactText, redactFinding, getCredentialRemediationNotice } from '../sanitization/redactor.js';

interface RuleDefinition {
  id: string;
  category: FindingCategory;
  title: string;
  severity: Severity;
  pattern: RegExp;
  fileFilter?: RegExp;
  explanation: string;
  impact: string;
  remediation: string;
  references: string[];
}

const STATIC_RULES: RuleDefinition[] = [
  // 1. Google Gemini / Cloud API Key
  {
    id: 'SEC-SECRET-001',
    category: 'Hardcoded Secret',
    title: 'Hardcoded Google Gemini / Cloud API Key Exposed in Source',
    severity: 'critical',
    pattern: /(?:GEMINI_API_KEY|GOOGLE_API_KEY|api_key|apiKey)\s*[:=]\s*["'](AIza[0-9A-Za-z-_]{35}|AQ\.[0-9A-Za-z_-]{40,64})["']/i,
    explanation: 'A plaintext Gemini or Google Cloud API credential was found hardcoded in application source code. Credentials hardcoded in repositories can be extracted by anyone with source access or embedded into client bundles.',
    impact: 'Unauthorized third parties can use your API quota, incur unexpected LLM inference costs, or access fine-tuned models and datasets.',
    remediation: getCredentialRemediationNotice('Google Gemini API Key'),
    references: ['https://ai.google.dev/gemini-api/docs/api-key', 'https://cwe.mitre.org/data/definitions/798.html'],
  },
  // 2. Generic API Token / AWS / Stripe
  {
    id: 'SEC-SECRET-002',
    category: 'Hardcoded Secret',
    title: 'Hardcoded Cloud or Payment Secret Key in Source',
    severity: 'critical',
    pattern: /(?:AWS_SECRET_ACCESS_KEY|STRIPE_SECRET_KEY|secret_key|privateKey)\s*[:=]\s*["']([A-Za-z0-9/+=]{30,60}|sk_live_[0-9a-zA-Z]{24,34})["']/i,
    explanation: 'A high-privilege cloud or payment gateway secret was identified hardcoded in a configuration or source file.',
    impact: 'Compromise of this key could allow financial theft, cloud infrastructure hijacking, or data exfiltration.',
    remediation: getCredentialRemediationNotice('Cloud / Payment Secret Key'),
    references: ['https://cwe.mitre.org/data/definitions/798.html'],
  },
  // 3. Dangerous eval / Function constructor
  {
    id: 'SEC-INJ-001',
    category: 'Injection / XSS',
    title: 'Arbitrary Code Execution via eval() or dynamic Function()',
    severity: 'high',
    pattern: /\b(?:eval|Function)\s*\([^)]*(?:req\.|body|query|params|input|userInput)/i,
    fileFilter: /\.(js|ts|jsx|tsx|mjs)$/i,
    explanation: 'Dynamic JavaScript execution using eval() or the Function constructor with untrusted user input directly leads to Remote Code Execution (RCE).',
    impact: 'An attacker can send crafted JavaScript payloads that execute arbitrary shell commands, read local files, or compromise the host server.',
    remediation: 'Eliminate eval(). Parse structured data with JSON.parse() or use safe mathematical parser libraries if expression evaluation is needed.',
    references: ['https://owasp.org/www-community/attacks/Code_Injection', 'https://cwe.mitre.org/data/definitions/94.html'],
  },
  // 4. Client-side innerHTML / dangerouslySetInnerHTML without sanitization
  {
    id: 'SEC-XSS-001',
    category: 'Injection / XSS',
    title: 'Cross-Site Scripting (XSS) via unescaped HTML injection',
    severity: 'high',
    pattern: /(?:innerHTML|dangerouslySetInnerHTML)\s*=\s*(?:\{__html:\s*)?(?:req\.|props\.|input|params|item\.)/i,
    fileFilter: /\.(js|ts|jsx|tsx|html)$/i,
    explanation: 'Injecting raw user input directly into innerHTML or dangerouslySetInnerHTML bypasses framework auto-escaping mechanisms and causes Cross-Site Scripting.',
    impact: 'Malicious scripts can hijack user sessions, steal cookies, keylog user keystrokes, and rewrite page contents.',
    remediation: 'Use standard text bindings (e.g. textContent in DOM, or standard JSX expressions {userInput}). If HTML rendering is essential, sanitize first with DOMPurify.',
    references: ['https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html'],
  },
  // 5. Insecure CORS Wildcard with credentials
  {
    id: 'SEC-CONF-001',
    category: 'Insecure Configuration',
    title: 'Overly Permissive Cross-Origin Resource Sharing (CORS) Origin',
    severity: 'medium',
    pattern: /origin:\s*["']\*["']|res\.header\(["']Access-Control-Allow-Origin["'],\s*["']\*["']\)/i,
    fileFilter: /\.(js|ts)$/i,
    explanation: 'Configuring Access-Control-Allow-Origin with a wildcard "*" allows any third-party website to make authenticated cross-origin requests to your backend.',
    impact: 'Malicious websites visited by your users can fetch confidential profile data or perform unauthorized API interactions.',
    remediation: 'Restrict allowed CORS origins to trusted domains (e.g. your production frontend URL) and reject wildcard origins for authenticated APIs.',
    references: ['https://portswigger.net/web-security/cors'],
  },
  // 6. Hardcoded JWT Secret
  {
    id: 'SEC-AUTH-001',
    category: 'Broken Access Control',
    title: 'Hardcoded JWT Signing Secret',
    severity: 'high',
    pattern: /jwt\.sign\([^,]+,\s*["']([A-Za-z0-9_-]{3,30})["']/i,
    fileFilter: /\.(js|ts)$/i,
    explanation: 'The JSON Web Token (JWT) signing secret is hardcoded as a weak literal string in code rather than loaded from an environment variable.',
    impact: 'An attacker reading this secret can forge arbitrary administrator tokens and completely bypass authentication controls.',
    remediation: 'Store JWT secrets securely in environment variables (process.env.JWT_SECRET) with a high-entropy string (minimum 256 bits).',
    references: ['https://owasp.org/www-project-top-ten/2017/A2_2017-Broken_Authentication'],
  },
  // 7. Missing Route Authorization / Authentication middleware on sensitive routes
  {
    id: 'SEC-AUTH-002',
    category: 'Broken Access Control',
    title: 'Sensitive Administrative Route Exposed Without Auth Middleware',
    severity: 'high',
    pattern: /app\.(?:post|delete|put|patch)\s*\(\s*["']\/(?:admin|api\/admin|users\/delete|internal)[^"']*["']\s*,\s*(?:async\s*)?\((?:req,\s*res)/i,
    fileFilter: /\.(js|ts)$/i,
    explanation: 'A route handler targeting administrative or privileged operations is bound directly to the request handler without an authentication or RBAC middleware guard.',
    impact: 'Unauthenticated internet users can directly invoke destructive administrative operations.',
    remediation: 'Attach an authentication middleware (e.g., verifyToken, requireAdmin) before the route handler.',
    references: ['https://cwe.mitre.org/data/definitions/285.html'],
  },
  // 8. Insecure Cookie settings in code
  {
    id: 'SEC-COOKIE-001',
    category: 'Insecure Cookie',
    title: 'Session Cookie Configured Without HttpOnly or Secure Flag',
    severity: 'medium',
    pattern: /res\.cookie\s*\([^,]+,[^,]+,\s*\{(?:(?![Hh]ttp[Oo]nly).)*\}\s*\)/s,
    fileFilter: /\.(js|ts)$/i,
    explanation: 'Cookies set without httpOnly: true can be read by client-side JavaScript, making tokens vulnerable to theft through XSS.',
    impact: 'Attackers can steal session identifiers via client-side script execution.',
    remediation: 'Ensure cookies specify { httpOnly: true, secure: true, sameSite: "lax" }.',
    references: ['https://owasp.org/www-community/controls/SecureCookieAttribute'],
  },
];

export async function runRuleEngineScan(
  targetDir: string,
  scanId: string,
  relativeFiles: string[]
): Promise<{ execution: ScannerExecutionResult; findings: Finding[] }> {
  const startTime = Date.now();
  const findings: Finding[] = [];

  for (const relFile of relativeFiles) {
    const fullPath = path.join(targetDir, relFile);
    if (!fs.existsSync(fullPath)) continue;

    let content: string;
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');

    for (const rule of STATIC_RULES) {
      if (rule.fileFilter && !rule.fileFilter.test(relFile)) {
        continue;
      }

      // Skip test suites and spec files for execution/injection heuristic rules
      if (
        (rule.id === 'SEC-INJ-001' || rule.category === 'Injection / XSS') &&
        /(?:^|\/)(?:tests?|__tests__|specs?)\/|\.(?:test|spec)\.[a-z]+$/i.test(relFile)
      ) {
        continue;
      }

      // Check pattern
      if (rule.pattern.test(content)) {
        // Find line number
        let matchedLine = 1;
        let matchedSnippet = '';

        for (let i = 0; i < lines.length; i++) {
          if (rule.pattern.test(lines[i])) {
            matchedLine = i + 1;
            matchedSnippet = lines[i].trim();
            break;
          }
        }

        if (!matchedSnippet) {
          matchedSnippet = lines[0]?.trim() || '';
        }

        const fingerprint = crypto
          .createHash('sha256')
          .update(`rule-engine:${rule.id}:${relFile}:${matchedSnippet}`)
          .digest('hex')
          .substring(0, 16);

        const finding: Finding = {
          id: `fnd-re-${crypto.randomUUID().substring(0, 8)}`,
          fingerprint,
          scanner: 'rule-engine',
          ruleId: rule.id,
          category: rule.category,
          title: rule.title,
          severity: rule.severity,
          originalSeverity: rule.severity.toUpperCase(),
          confidence: 'high',
          filePath: relFile,
          startLine: matchedLine,
          endLine: matchedLine,
          snippet: redactText(matchedSnippet),
          technicalExplanation: rule.explanation,
          plainLanguageImpact: rule.impact,
          recommendedRemediation: rule.remediation,
          references: rule.references,
          firstSeenScanId: scanId,
          status: 'new',
          verificationEvidence: `Rule Engine matched pattern ${rule.id} in ${relFile} at line ${matchedLine}`,
        };

        findings.push(redactFinding(finding));
      }
    }
  }

  const executionTimeMs = Date.now() - startTime;

  return {
    execution: {
      scanner: 'rule-engine',
      available: true,
      executed: true,
      executionTimeMs,
      exitCode: 0,
      findingsCount: findings.length,
    },
    findings,
  };
}
