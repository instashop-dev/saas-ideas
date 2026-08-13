import { describe, it, expect } from 'vitest';
import { resolvePlan } from '../../src/agents/research-planner.js';
import { ResearchPlanSchema } from '../../src/schemas/index.js';

describe('resolvePlan', () => {
  it('trims and dedupes source names case-insensitively', () => {
    const result = resolvePlan({
      sources: [
        { ecosystem: 'Reddit', research_questions: ['q1'] },
        { ecosystem: ' reddit ', research_questions: ['q2'] },
        { ecosystem: 'github-issues', research_questions: ['q3'] },
      ],
    });
    expect(result).toEqual([
      { ecosystem: 'Reddit', research_questions: ['q1'] },
      { ecosystem: 'github-issues', research_questions: ['q3'] },
    ]);
  });

  it('drops sources whose questions are all blank', () => {
    const result = resolvePlan({
      sources: [{ ecosystem: 'reddit', research_questions: ['  ', ''] }],
    });
    expect(result).toBeNull();
  });

  it('drops empty source names and trims questions', () => {
    const result = resolvePlan({
      sources: [
        { ecosystem: '  ', research_questions: ['q'] },
        { ecosystem: 'reddit', research_questions: ['  a  ', 'b'] },
      ],
    });
    expect(result).toEqual([{ ecosystem: 'reddit', research_questions: ['a', 'b'] }]);
  });

  it('returns null when nothing survives', () => {
    const result = resolvePlan({
      sources: [{ ecosystem: '', research_questions: ['q'] }],
    });
    expect(result).toBeNull();
  });
});

describe('ResearchPlanSchema', () => {
  it('validates a plan with per-source questions', () => {
    const result = ResearchPlanSchema.safeParse({
      sources: [{ ecosystem: 'reddit', research_questions: ['q1', 'q2'] }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a source with an empty questions array', () => {
    const result = ResearchPlanSchema.safeParse({
      sources: [{ ecosystem: 'reddit', research_questions: [] }],
    });
    expect(result.success).toBe(false);
  });
});
