import { ZipIntakeError } from './zipHandler.js';

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  branch?: string;
  normalizedUrl: string;
}

export class GitHubIntakeError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'GitHubIntakeError';
  }
}

const GITHUB_URL_REGEX = /^https:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?(?:\/)?$/;
const FORBIDDEN_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254', '::1'];
const MAX_GITHUB_ARCHIVE_BYTES = (parseInt(process.env.MAX_UPLOAD_SIZE_MB || '25', 10)) * 1024 * 1024;

/**
 * Validates and parses a public GitHub repository URL, applying SSRF and input sanitization defenses.
 */
export function parseAndValidateGitHubUrl(rawUrl: string, branch?: string): GitHubRepoInfo {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new GitHubIntakeError('GitHub repository URL is required', 'MISSING_URL');
  }

  const trimmed = rawUrl.trim();

  // Validate protocol
  if (!trimmed.startsWith('https://')) {
    throw new GitHubIntakeError('Only secure HTTPS GitHub URLs are supported', 'INVALID_PROTOCOL');
  }

  // SSRF defense: check for forbidden host patterns or userinfo credentials in URL
  try {
    const parsed = new URL(trimmed);
    if (parsed.username || parsed.password) {
      throw new GitHubIntakeError('Credentials must not be passed in repository URL', 'CREDENTIALS_IN_URL');
    }
    if (FORBIDDEN_HOSTS.includes(parsed.hostname.toLowerCase())) {
      throw new GitHubIntakeError('Forbidden host address', 'SSRF_BLOCKED');
    }
    if (!['github.com', 'www.github.com'].includes(parsed.hostname.toLowerCase())) {
      throw new GitHubIntakeError('Only official github.com repositories are supported', 'INVALID_HOST');
    }
  } catch (err: any) {
    if (err instanceof GitHubIntakeError) throw err;
    throw new GitHubIntakeError(`Malformed URL: ${err.message}`, 'MALFORMED_URL');
  }

  const match = trimmed.match(GITHUB_URL_REGEX);
  if (!match) {
    throw new GitHubIntakeError(
      'Invalid GitHub repository format. Expected: https://github.com/owner/repository',
      'INVALID_REPO_FORMAT'
    );
  }

  const owner = match[1];
  const repo = match[2];

  // Disallow path traversal sequences in owner or repo
  if (owner.includes('..') || repo.includes('..') || owner === '.' || repo === '.') {
    throw new GitHubIntakeError('Path traversal sequence in repository identifier', 'PATH_TRAVERSAL');
  }

  // Validate branch if provided
  let safeBranch: string | undefined = undefined;
  if (branch && typeof branch === 'string') {
    const cleanBranch = branch.trim();
    if (cleanBranch.includes('..') || cleanBranch.startsWith('/') || cleanBranch.includes('\\')) {
      throw new GitHubIntakeError('Invalid branch name syntax', 'INVALID_BRANCH');
    }
    if (cleanBranch.length > 0) {
      safeBranch = cleanBranch;
    }
  }

  return {
    owner,
    repo,
    branch: safeBranch,
    normalizedUrl: `https://github.com/${owner}/${repo}`,
  };
}

/**
 * Downloads the source code ZIP archive of a public GitHub repository.
 * Enforces timeouts, content-length limits, and streaming size caps.
 */
export async function downloadGitHubRepoArchive(info: GitHubRepoInfo): Promise<{ buffer: Buffer; branchUsed: string }> {
  const branchesToTry = info.branch ? [info.branch] : ['main', 'master'];
  let lastError: Error | null = null;

  for (const branch of branchesToTry) {
    const archiveUrl = `https://github.com/${info.owner}/${info.repo}/archive/refs/heads/${encodeURIComponent(branch)}.zip`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
      const response = await fetch(archiveUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'VantaScan-Security-Auditor/1.0',
          'Accept': 'application/vnd.github+json, application/zip, application/octet-stream',
        },
        redirect: 'follow',
      });

      clearTimeout(timeout);

      if (response.status === 404) {
        lastError = new GitHubIntakeError(
          `Branch '${branch}' or repository '${info.owner}/${info.repo}' not found on GitHub (HTTP 404). Check spelling or branch name.`,
          'REPO_NOT_FOUND'
        );
        continue;
      }

      if (!response.ok) {
        throw new GitHubIntakeError(
          `GitHub returned status ${response.status}: ${response.statusText}`,
          'GITHUB_FETCH_FAILED'
        );
      }

      // Check Content-Length header if present
      const contentLengthHeader = response.headers.get('content-length');
      if (contentLengthHeader) {
        const contentLength = parseInt(contentLengthHeader, 10);
        if (contentLength > MAX_GITHUB_ARCHIVE_BYTES) {
          throw new GitHubIntakeError(
            `Repository archive exceeds size limit of ${MAX_GITHUB_ARCHIVE_BYTES / (1024 * 1024)}MB`,
            'ARCHIVE_TOO_LARGE'
          );
        }
      }

      // Stream the response body and enforce cumulative byte limit
      const reader = response.body?.getReader();
      if (!reader) {
        throw new GitHubIntakeError('Failed to read response body from GitHub', 'STREAM_ERROR');
      }

      const chunks: Uint8Array[] = [];
      let totalBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          totalBytes += value.length;
          if (totalBytes > MAX_GITHUB_ARCHIVE_BYTES) {
            reader.cancel();
            throw new GitHubIntakeError(
              `Repository archive exceeded maximum permitted size of ${MAX_GITHUB_ARCHIVE_BYTES / (1024 * 1024)}MB`,
              'ARCHIVE_TOO_LARGE'
            );
          }
          chunks.push(value);
        }
      }

      const buffer = Buffer.concat(chunks);
      if (buffer.length === 0) {
        throw new GitHubIntakeError('Downloaded repository archive was empty', 'EMPTY_ARCHIVE');
      }

      return {
        buffer,
        branchUsed: branch,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new GitHubIntakeError('GitHub repository download timed out after 20 seconds', 'TIMEOUT');
      }
      if (err instanceof GitHubIntakeError) {
        if (err.code === 'REPO_NOT_FOUND' && branchesToTry.length > 1) {
          lastError = err;
          continue;
        }
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError || new GitHubIntakeError('Failed to download repository from GitHub', 'UNKNOWN_FETCH_ERROR');
}
