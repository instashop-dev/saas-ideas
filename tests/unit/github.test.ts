import { describe, it, expect } from 'vitest';
import {
  generateStageBranch,
  generatePRTitle,
  generatePRBody,
  isSystemBranch,
  isAllowedPath,
  sanitizeForGit,
} from '../../src/github/index.js';

describe('generateStageBranch', () => {
  it('generates a pipeline branch name', () => {
    const branch = generateStageBranch('RUN-0001', 'OP-0001', 'validation');
    expect(branch).toBe('pipeline/run-0001/op-0001/validation');
  });
});

describe('generatePRTitle', () => {
  it('generates a PR title with metadata', () => {
    const title = generatePRTitle('RUN-0001', 'OP-0001', 'validation');
    expect(title).toContain('RUN-0001');
    expect(title).toContain('validation');
    expect(title).toContain('OP-0001');
  });
});

describe('generatePRBody', () => {
  it('includes all required metadata', () => {
    const body = generatePRBody({
      runId: 'RUN-0001',
      opportunityId: 'OP-0001',
      stage: 'validation',
      modelUsed: 'test-model',
      evidenceCount: 5,
      gateStatus: 'PASSED',
      artifacts: ['validation.json'],
    });
    expect(body).toContain('RUN-0001');
    expect(body).toContain('OP-0001');
    expect(body).toContain('validation');
    expect(body).toContain('test-model');
    expect(body).toContain('5');
    expect(body).toContain('PASSED');
  });
});

describe('isSystemBranch', () => {
  it('returns true for pipeline branches', () => {
    expect(isSystemBranch('pipeline/run-0001/op-0001/validation')).toBe(true);
  });

  it('returns false for non-pipeline branches', () => {
    expect(isSystemBranch('main')).toBe(false);
    expect(isSystemBranch('feature/my-feature')).toBe(false);
    expect(isSystemBranch('fix/bug-123')).toBe(false);
  });
});

describe('isAllowedPath', () => {
  it('allows paths in research/', () => {
    expect(isAllowedPath('research/runs/RUN-0001.json')).toBe(true);
    expect(isAllowedPath('research/clusters/clusters.json')).toBe(true);
  });

  it('allows paths in opportunities/', () => {
    expect(isAllowedPath('opportunities/OP-0001/verdict.json')).toBe(true);
  });

  it('allows paths in reports/', () => {
    expect(isAllowedPath('reports/TOP-10.md')).toBe(true);
  });

  it('allows paths in config/', () => {
    expect(isAllowedPath('config/config.yaml')).toBe(true);
  });

  it('rejects paths outside allowed directories', () => {
    expect(isAllowedPath('src/cli/bootstrap.ts')).toBe(false);
    expect(isAllowedPath('/etc/passwd')).toBe(false);
    expect(isAllowedPath('../../../etc/passwd')).toBe(false);
  });
});

describe('sanitizeForGit', () => {
  it('lowercases and replaces special chars', () => {
    const result = sanitizeForGit('Hello, World! Test');
    expect(result).toBe('hello-world-test');
  });

  it('collapses multiple dashes', () => {
    const result = sanitizeForGit('test---multiple---dashes');
    expect(result).toBe('test-multiple-dashes');
  });

  it('trims leading/trailing dashes', () => {
    const result = sanitizeForGit('---test---');
    expect(result).toBe('test');
  });
});
