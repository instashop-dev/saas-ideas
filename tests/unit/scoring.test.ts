import { describe, it, expect } from 'vitest';
import {
  calculateFinalScore,
  calculateNeedScore,
  calculateCommercialScore,
  calculateMarketScore,
  calculatePenalty,
  rankOpportunities,
  normalizeScore,
  competitionPenalty,
  mvpComplexityPenalty,
} from '../../src/scoring/index.js';
import { fixtureA, fixtureB, fixtureC } from '../fixtures/opportunities.js';

describe('normalizeScore', () => {
  it('normalizes 1 to 0', () => {
    expect(normalizeScore(1)).toBe(0);
  });

  it('normalizes 5 to 1', () => {
    expect(normalizeScore(5)).toBe(1);
  });

  it('normalizes 3 to 0.5', () => {
    expect(normalizeScore(3)).toBe(0.5);
  });
});

describe('competitionPenalty', () => {
  it('returns 1.0 for competition score 1 (no penalty)', () => {
    expect(competitionPenalty(1)).toBe(1);
  });

  it('returns less than 1 for higher competition', () => {
    expect(competitionPenalty(3)).toBeLessThan(1);
    expect(competitionPenalty(5)).toBeLessThan(competitionPenalty(3));
  });

  it('is monotonic: higher competition always lowers score', () => {
    expect(competitionPenalty(2)).toBeGreaterThan(competitionPenalty(3));
    expect(competitionPenalty(3)).toBeGreaterThan(competitionPenalty(4));
    expect(competitionPenalty(4)).toBeGreaterThan(competitionPenalty(5));
  });
});

describe('mvpComplexityPenalty', () => {
  it('returns 1.0 for complexity score 1 (no penalty)', () => {
    expect(mvpComplexityPenalty(1)).toBe(1);
  });

  it('returns less than 1 for higher complexity', () => {
    expect(mvpComplexityPenalty(5)).toBeLessThan(1);
  });

  it('is monotonic: higher complexity always lowers score', () => {
    expect(mvpComplexityPenalty(2)).toBeGreaterThan(mvpComplexityPenalty(3));
    expect(mvpComplexityPenalty(3)).toBeGreaterThan(mvpComplexityPenalty(4));
    expect(mvpComplexityPenalty(4)).toBeGreaterThan(mvpComplexityPenalty(5));
  });
});

describe('calculateFinalScore', () => {
  it('produces a high score for a strong opportunity (Fixture A)', () => {
    const score = calculateFinalScore(fixtureA);
    expect(score).toBeGreaterThan(50);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('produces a low score for a high-competition opportunity (Fixture B)', () => {
    const score = calculateFinalScore(fixtureB);
    expect(score).toBeLessThan(50);
  });

  it('produces a very low score for a weak-pain opportunity (Fixture C)', () => {
    const score = calculateFinalScore(fixtureC);
    expect(score).toBeLessThan(20);
  });

  it('returns a number between 0 and 100', () => {
    const score = calculateFinalScore(fixtureA);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('produces the same score given the same input (deterministic)', () => {
    const score1 = calculateFinalScore(fixtureA);
    const score2 = calculateFinalScore(fixtureA);
    expect(score1).toBe(score2);
  });
});

describe('rankOpportunities', () => {
  it('ranks opportunities by descending final score', () => {
    const ranked = rankOpportunities([fixtureC, fixtureB, fixtureA]);
    expect(ranked.length).toBe(3);
    expect(ranked[0]!.id).toBe(fixtureA.id);
    expect(ranked[0]!.final_score).toBeGreaterThan(ranked[1]!.final_score);
    expect(ranked[1]!.final_score).toBeGreaterThanOrEqual(ranked[2]!.final_score);
  });

  it('handles empty array', () => {
    const ranked = rankOpportunities([]);
    expect(ranked).toHaveLength(0);
  });

  it('handles single opportunity', () => {
    const ranked = rankOpportunities([fixtureA]);
    expect(ranked).toHaveLength(1);
    expect(ranked[0]!.final_score).toBeGreaterThan(0);
  });
});

describe('composite score functions', () => {
  it('calculateNeedScore returns 0-1 range', () => {
    const score = calculateNeedScore(fixtureA);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('calculateCommercialScore returns 0-1 range', () => {
    const score = calculateCommercialScore(fixtureA);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('calculateMarketScore returns 0-1 range', () => {
    const score = calculateMarketScore(fixtureA);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('calculatePenalty returns 0-1 range', () => {
    const penalty = calculatePenalty(fixtureA);
    expect(penalty).toBeGreaterThan(0);
    expect(penalty).toBeLessThanOrEqual(1);
  });
});
