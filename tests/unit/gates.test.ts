import { describe, it, expect } from 'vitest';
import { runHardGates, passesAllGates } from '../../src/gates/index.js';
import { fixtureA, fixtureB, fixtureC, fixtureD, fixtureE } from '../fixtures/opportunities.js';

describe('runHardGates', () => {
  it('passes Fixture A (excellent opportunity)', () => {
    const result = runHardGates(fixtureA);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('fails Fixture B (high competition)', () => {
    const result = runHardGates(fixtureB);
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.gate === 'max_competition_score')).toBe(true);
  });

  it('fails Fixture C (weak pain)', () => {
    const result = runHardGates(fixtureC);
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.gate === 'min_pain_score')).toBe(true);
  });

  it('fails Fixture D (insufficient evidence)', () => {
    const result = runHardGates(fixtureD);
    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThanOrEqual(3);
  });

  it('records specific failure reasons', () => {
    const result = runHardGates(fixtureC);
    expect(result.failures.length).toBeGreaterThan(0);
    for (const failure of result.failures) {
      expect(failure.gate).toBeTruthy();
      expect(failure.message).toBeTruthy();
    }
  });
});

describe('passesAllGates', () => {
  it('fails duplicate opportunities', () => {
    const result = passesAllGates(fixtureE);
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.gate === 'duplicate_check')).toBe(true);
  });

  it('passes non-duplicate approved opportunity', () => {
    const result = passesAllGates(fixtureA);
    expect(result.passed).toBe(true);
  });
});
