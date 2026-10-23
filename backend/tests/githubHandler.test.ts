import { describe, it, expect } from 'vitest';
import { parseAndValidateGitHubUrl, GitHubIntakeError } from '../src/intake/githubHandler.js';

describe('GitHub Repository Intake Defenses', () => {
  it('parses valid public github URLs cleanly', () => {
    const res = parseAndValidateGitHubUrl('https://github.com/vanta-security/audit-demo');
    expect(res.owner).toBe('vanta-security');
    expect(res.repo).toBe('audit-demo');
    expect(res.normalizedUrl).toBe('https://github.com/vanta-security/audit-demo');
  });

  it('handles optional .git suffix and trailing slash', () => {
    const res = parseAndValidateGitHubUrl('https://github.com/facebook/react.git/');
    expect(res.owner).toBe('facebook');
    expect(res.repo).toBe('react');
  });

  it('rejects non-https URLs', () => {
    expect(() => parseAndValidateGitHubUrl('http://github.com/test/repo')).toThrow(GitHubIntakeError);
  });

  it('blocks SSRF attempts pointing to internal addresses or localhost', () => {
    expect(() => parseAndValidateGitHubUrl('https://localhost/test/repo')).toThrow(GitHubIntakeError);
    expect(() => parseAndValidateGitHubUrl('https://169.254.169.254/latest/meta-data')).toThrow(GitHubIntakeError);
    expect(() => parseAndValidateGitHubUrl('https://gitlab.com/test/repo')).toThrow('official github.com');
  });

  it('blocks path traversal attempts in owner or repository name', () => {
    expect(() => parseAndValidateGitHubUrl('https://github.com/../evil')).toThrow(GitHubIntakeError);
  });

  it('blocks embedded credentials in the URL', () => {
    expect(() => parseAndValidateGitHubUrl('https://user:token@github.com/org/repo')).toThrow('Credentials must not be passed');
  });
});
