import { describe, it, expect, beforeEach } from 'vitest';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  writeReports,
  generateTopReport,
  generateRejectedReport,
} from '../../src/reporting/index.js';
import { fixtureA, fixtureB, fixtureC, fixtureD } from '../fixtures/opportunities.js';
import { calculateFinalScore } from '../../src/scoring/index.js';

describe('Report Generation', () => {
  const reportsDir = resolve(process.cwd(), 'reports');

  beforeEach(() => {
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }
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
