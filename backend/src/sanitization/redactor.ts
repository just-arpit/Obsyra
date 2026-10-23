import { Finding } from '../types/finding.js';

interface RedactionPattern {
  name: string;
  regex: RegExp;
  replacement: string | ((substring: string, ...args: any[]) => string);
}

const REDACTION_PATTERNS: RedactionPattern[] = [
  // Google / Gemini API keys: AIzaSy... or AQ....
  {
    name: 'Google Gemini API Key',
    regex: /\b(AIza[0-9A-Za-z-_]{30,45}|AQ\.[0-9A-Za-z_-]{30,70})\b/g,
    replacement: '[REDACTED_GEMINI_API_KEY]',
  },
  // AWS Access Key ID
  {
    name: 'AWS Access Key ID',
    regex: /\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g,
    replacement: '$1[REDACTED_AWS_KEY_ID]',
  },
  // AWS Secret Access Key
  {
    name: 'AWS Secret Key',
    regex: /(?:aws_secret_access_key|aws_secret_key|secret_key)\s*[:=]\s*["']?([A-Za-z0-9/+=]{40})["']?/gi,
    replacement: (match, p1) => match.replace(p1, '[REDACTED_AWS_SECRET_KEY]'),
  },
  // GitHub Tokens
  {
    name: 'GitHub Personal Access Token',
    regex: /\b(ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{60,82}|gho_[0-9a-zA-Z]{36}|ghs_[0-9a-zA-Z]{36})\b/g,
    replacement: '[REDACTED_GITHUB_TOKEN]',
  },
  // Stripe API Keys
  {
    name: 'Stripe API Key',
    regex: /\b(sk_live_[0-9a-zA-Z]{24,34}|rk_live_[0-9a-zA-Z]{24,34})\b/g,
    replacement: '[REDACTED_STRIPE_KEY]',
  },
  // Slack Tokens
  {
    name: 'Slack Token',
    regex: /\b(xox[baprs]-[0-9a-zA-Z]{10,48})\b/g,
    replacement: '[REDACTED_SLACK_TOKEN]',
  },
  // JWT Tokens (header.payload.signature)
  {
    name: 'JSON Web Token',
    regex: /\beyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]{20,}\b/g,
    replacement: 'eyJ[REDACTED_JWT_TOKEN]',
  },
  // Private Keys
  {
    name: 'Private Key',
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
    replacement: '-----BEGIN PRIVATE KEY-----\n[REDACTED_PRIVATE_KEY_BODY]\n-----END PRIVATE KEY-----',
  },
  // Generic password / secret assignment patterns (e.g., password="supersecret", api_secret='xyz')
  {
    name: 'Assigned Secret / Password',
    regex: /((?:password|passwd|secret|api_key|apikey|auth_token|client_secret|private_key)\s*[:=]\s*["'])([^"'\r\n\t]{6,})(["'])/gi,
    replacement: '$1[REDACTED_SECRET]$3',
  },
  // Bearer tokens
  {
    name: 'Authorization Bearer Token',
    regex: /(Authorization:\s*Bearer\s+)[A-Za-z0-9-._~+/]+=*/gi,
    replacement: '$1[REDACTED_BEARER_TOKEN]',
  },
  // Database connection URIs containing credentials: postgres://user:password@host
  {
    name: 'Database URI with Password',
    regex: /(mongodb(?:\+srv)?|postgres|postgresql|mysql|redis):\/\/([^:]+):([^@\s]+)@/gi,
    replacement: '$1://$2:[REDACTED_PASSWORD]@',
  },
];

/**
 * Redacts known secret patterns from any raw text string before logging, persisting, or sending to AI.
 */
export function redactText(text: string | null | undefined): string {
  if (!text) return '';
  let sanitized = text;

  for (const pattern of REDACTION_PATTERNS) {
    if (typeof pattern.replacement === 'string') {
      sanitized = sanitized.replace(pattern.regex, pattern.replacement);
    } else {
      sanitized = sanitized.replace(pattern.regex, pattern.replacement);
    }
  }

  return sanitized;
}

/**
 * Redacts secrets from all string fields in a Finding object.
 */
export function redactFinding(finding: Finding): Finding {
  return {
    ...finding,
    title: redactText(finding.title),
    snippet: finding.snippet ? redactText(finding.snippet) : undefined,
    technicalExplanation: redactText(finding.technicalExplanation),
    plainLanguageImpact: redactText(finding.plainLanguageImpact),
    recommendedRemediation: redactText(finding.recommendedRemediation),
    verificationEvidence: finding.verificationEvidence ? redactText(finding.verificationEvidence) : undefined,
  };
}

/**
 * Standard credential rotation and revocation instructions
 * Crucial: Explains that deleting code does not revoke an exposed key.
 */
export function getCredentialRemediationNotice(secretType: string = 'credential'): string {
  return `CRITICAL REMEDIATION REQUIREMENT:
1. Revoke / Rotate: Immediately revoke the exposed ${secretType} within the respective provider console or CLI. Simply removing the credential from source code does NOT invalidate the token.
2. Review Access Logs: Inspect the cloud provider audit/access logs for any anomalous requests made using this credential during the exposure window.
3. Git History Cleanup: If this project was ever committed to Git, purge the credential from history using 'git filter-repo' or BFG Repo-Cleaner.
4. Environment Isolation: Inject replacement credentials solely via runtime environment variables or secure secrets management (e.g., GCP Secret Manager, HashiCorp Vault, AWS Secrets Manager).`;
}
