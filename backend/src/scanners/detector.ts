import { executeCommandSafe } from './runner.js';
import { ScannerReadiness } from '../types/scan.js';

export interface ScannerBinaryInfo {
  installed: boolean;
  version?: string;
  path?: string;
}

const COMMON_SEARCH_PATHS: Record<string, string[]> = {
  gitleaks: ['gitleaks', '/opt/homebrew/bin/gitleaks', '/usr/local/bin/gitleaks', '/usr/bin/gitleaks'],
  semgrep: ['semgrep', '/opt/homebrew/bin/semgrep', '/usr/local/bin/semgrep', '/usr/bin/semgrep', process.env.HOME + '/.local/bin/semgrep'],
  trivy: ['trivy', '/opt/homebrew/bin/trivy', '/usr/local/bin/trivy', '/usr/bin/trivy'],
};

export async function detectScanner(tool: 'gitleaks' | 'semgrep' | 'trivy'): Promise<ScannerBinaryInfo> {
  const candidatePaths = COMMON_SEARCH_PATHS[tool] || [tool];

  for (const execPath of candidatePaths) {
    if (!execPath) continue;
    try {
      const res = await executeCommandSafe(execPath, ['--version'], process.cwd(), 4000);
      if (res.exitCode === 0 && res.stdout) {
        const firstLine = res.stdout.trim().split('\n')[0] || '';
        return {
          installed: true,
          version: firstLine,
          path: execPath,
        };
      }
    } catch {
      // try next
    }
  }

  return {
    installed: false,
  };
}

export async function getScannerReadiness(): Promise<ScannerReadiness> {
  const [gitleaks, semgrep, trivy] = await Promise.all([
    detectScanner('gitleaks'),
    detectScanner('semgrep'),
    detectScanner('trivy'),
  ]);

  return {
    gitleaks,
    semgrep,
    trivy,
    urlInspector: {
      installed: true,
      version: 'Built-in Passive Security Header & Cookie Inspector v1.0',
    },
  };
}
