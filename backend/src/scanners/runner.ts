import { spawn } from 'child_process';
import { redactText } from '../sanitization/redactor.js';

export interface CommandExecutionResult {
  executable: string;
  args: string[];
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
  error?: string;
}

const DEFAULT_TIMEOUT_MS = parseInt(process.env.SCAN_TIMEOUT_MS || '60000', 10);
const MAX_OUTPUT_BYTES = 15 * 1024 * 1024; // 15MB limit

/**
 * Executes an external binary using safe argument arrays (no shell interpretation),
 * timeouts, and bounded buffer capture with secret redaction.
 */
export async function executeCommandSafe(
  executable: string,
  args: string[],
  cwd: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<CommandExecutionResult> {
  const startTime = Date.now();

  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';
    let timedOut = false;
    let killed = false;

    let child;
    try {
      child = spawn(executable, args, {
        cwd,
        env: {
          ...process.env,
          CI: '1',
          NO_COLOR: '1',
          TERM: 'dumb',
        },
        shell: false, // CRITICAL: Never execute via shell to prevent command injection
        windowsHide: true,
      });
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      return resolve({
        executable,
        args,
        exitCode: null,
        stdout: '',
        stderr: redactText(err?.message || 'Failed to spawn process'),
        timedOut: false,
        durationMs,
        error: `Executable spawn failed: ${err?.code || 'UNKNOWN'}`,
      });
    }

    const timer = setTimeout(() => {
      timedOut = true;
      killed = true;
      try {
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 3000);
      } catch {
        // ignore
      }
    }, timeoutMs);

    child.stdout.on('data', (chunk: Buffer) => {
      if (stdoutData.length < MAX_OUTPUT_BYTES) {
        stdoutData += chunk.toString('utf8');
      }
    });

    child.stderr.on('data', (chunk: Buffer) => {
      if (stderrData.length < MAX_OUTPUT_BYTES) {
        stderrData += chunk.toString('utf8');
      }
    });

    child.on('error', (err: any) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      resolve({
        executable,
        args,
        exitCode: null,
        stdout: stdoutData,
        stderr: redactText(stderrData + '\n' + (err?.message || '')),
        timedOut,
        durationMs,
        error: `Subprocess error: ${err?.code || err?.message || 'UNKNOWN'}`,
      });
    });

    child.on('close', (code: number | null) => {
      clearTimeout(timer);
      const durationMs = Date.now() - startTime;
      resolve({
        executable,
        args,
        exitCode: code,
        stdout: stdoutData,
        stderr: redactText(stderrData),
        timedOut,
        durationMs,
        error: timedOut ? `Execution timed out after ${timeoutMs}ms` : undefined,
      });
    });
  });
}
