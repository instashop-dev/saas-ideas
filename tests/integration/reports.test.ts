import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureA, fixtureB, fixtureC, fixtureD } from '../fixtures/opportunities.js';
import { calculateFinalScore } from '../../src/scoring/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

/**
 * Report generation tests run in a temp directory so they never overwrite
 * committed reports/ artifacts in the repository.
 */
describe('Report Generation', () => {
  let workDir: string;
  let originalCwd: string;
  let writeReports: (typeof import('../../src/reporting/index.js'))['writeReports'];
  let generateTopReport: (typeof import('../../src/reporting/index.js'))['generateTopReport'];
  let generateRejectedReport: (typeof import('../../src/reporting/index.js'))['generateRejectedReport'];

  beforeAll(async () => {
    originalCwd = process.cwd();
    workDir = join(tmpdir(), `saas-ideas-reports-${Date.now()}`);
    mkdirSync(join(workDir, 'config'), { recursive: true });
    writeFileSync(
      join(workDir, 'config', 'config.yaml'),
      readFileSync(join(REPO_ROOT, 'config', 'config.yaml'), 'utf-8'),
      'utf-8',
    );
    process.chdir(workDir);
    const reporting = await import('../../src/reporting/index.js');
    writeReports = reporting.writeReports;
    generateTopReport = reporting.generateTopReport;
    generateRejectedReport = reporting.generateRejectedReport;
  });

  afterAll(() => {
    process.chdir(originalCwd);
    rmSync(workDir, { recursive: true, force: true });
  });

  it('generates TOP report with approved opportunities', () => {
    const opps = [{ ...fixtureA, final_score: calculateFinalScore(fixtureA) }];
    const report = generateTopReport(opps);
    expect(report).toContain('Top');
    expect(report).toContain(fixtureA.id);
    expect(report).toContain(fixtureA.title);
  });

  it('generates empty TOP report when no opportunities pass', () => {
    const report = generateTopReport([]);
    expect(report).toContain('No opportunities passed all gates');
  });

  it('generates REJECTED report with reasons', () => {
    const opps = [fixtureB, fixtureC, fixtureD];
    const report = generateRejectedReport(opps);
    expect(report).toContain('Rejected');
    expect(report).toContain(fixtureB.id);
    expect(report).toContain(fixtureC.id);
    expect(report).toContain(fixtureD.id);
  });

  it('writes reports to disk', () => {
    const opps = [{ ...fixtureA, final_score: calculateFinalScore(fixtureA) }, fixtureB];
    const { topPath, rejectedPath } = writeReports(opps, 'RUN-TEST-RPT');

    expect(existsSync(topPath)).toBe(true);
    expect(existsSync(rejectedPath)).toBe(true);

    const topContent = readFileSync(topPath, 'utf-8');
    expect(topContent).toContain(fixtureA.id);

    const rejectedContent = readFileSync(rejectedPath, 'utf-8');
    expect(rejectedContent).toContain(fixtureB.id);
  });
});
