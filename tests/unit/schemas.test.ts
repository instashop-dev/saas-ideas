import { describe, it, expect } from 'vitest';
import {
  EvidenceItemSchema,
  CompetitorSchema,
  JudgeResultSchema,
  DebateResultSchema,
  OpportunitySchema,
} from '../../src/schemas/index.js';

describe('EvidenceItemSchema', () => {
  it('validates a correct evidence item', () => {
    const item = {
      source_id: 'SRC-0001',
      url: 'https://example.com/evidence',
      source_type: 'forum',
      publisher_or_site: 'Reddit',
      date_published: '2024-01-01T00:00:00Z',
      date_accessed: '2024-01-15T00:00:00Z',
      claim: 'A claim about pain',
      paraphrased_evidence: 'Detailed paraphrase of the evidence',
      evidence_strength: 4,
      independence_group: 'group-1',
    };
    const result = EvidenceItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });

  it('rejects evidence with invalid source_id format', () => {
    const item = {
      source_id: 'not-an-src',
      url: 'https://example.com',
      source_type: 'forum',
      publisher_or_site: 'Reddit',
      date_published: null,
      date_accessed: '2024-01-15T00:00:00Z',
      claim: 'A claim',
      paraphrased_evidence: 'Paraphrase',
      evidence_strength: 3,
      independence_group: 'group-1',
    };
    const result = EvidenceItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });

  it('rejects evidence with invalid URL', () => {
    const item = {
      source_id: 'SRC-0001',
      url: 'not-a-url',
      source_type: 'forum',
      publisher_or_site: 'Reddit',
      date_published: null,
      date_accessed: '2024-01-15T00:00:00Z',
      claim: 'A claim',
      paraphrased_evidence: 'Paraphrase',
      evidence_strength: 3,
      independence_group: 'group-1',
    };
    const result = EvidenceItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });

  it('rejects evidence_strength out of range', () => {
    const item = {
      source_id: 'SRC-0001',
      url: 'https://example.com',
      source_type: 'forum',
      publisher_or_site: 'Reddit',
      date_published: null,
      date_accessed: '2024-01-15T00:00:00Z',
      claim: 'A claim',
      paraphrased_evidence: 'Paraphrase',
      evidence_strength: 6,
      independence_group: 'group-1',
    };
    const result = EvidenceItemSchema.safeParse(item);
    expect(result.success).toBe(false);
  });
});

describe('OpportunitySchema', () => {
  it('validates a correct opportunity', () => {
    const opp = {
      id: 'OP-0001',
      canonical_key: 'CK-abcd1234',
      title: 'Test Opportunity',
      target_user: 'Developer',
      job_to_be_done: 'When coding, I want to test, so I can verify.',
      painful_workflow: 'Manual testing is slow.',
      current_workaround: 'Manual tests.',
      source_ids: ['SRC-0001'],
      independent_sources: 3,
      source_type_count: 2,
      pain_score: 5,
      frequency_score: 4,
      urgency_score: 4,
      economic_impact_score: 4,
      operational_impact_score: 4,
      workaround_intensity_score: 4,
      willingness_to_pay_score: 4,
      distribution_score: 3,
      global_score: 5,
      mvp_complexity_score: 2,
      evidence_quality_score: 4,
      competition_score: 1,
      competitors: [],
      substitutes: [],
      verified_facts: ['fact 1'],
      inferences: ['inference 1'],
      assumptions: ['assumption 1'],
      unknowns: ['unknown 1'],
      rejection_reasons: [],
      judge_verdict: 'APPROVE',
      confidence: 0.85,
      final_score: 72.5,
      run_id: 'RUN-0001',
      stage: 'complete',
      status: 'APPROVED',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    };
    const result = OpportunitySchema.safeParse(opp);
    expect(result.success).toBe(true);
  });

  it('rejects opportunity with invalid ID format', () => {
    const opp = {
      id: 'not-an-op',
      canonical_key: 'CK-1234',
      title: 'Test',
      target_user: 'Dev',
      job_to_be_done: 'JTBD',
      painful_workflow: 'Pain',
      current_workaround: 'Workaround',
      source_ids: [],
      independent_sources: 0,
      source_type_count: 0,
      pain_score: 1,
      frequency_score: 1,
      urgency_score: 1,
      economic_impact_score: 1,
      operational_impact_score: 1,
      workaround_intensity_score: 1,
      willingness_to_pay_score: 1,
      distribution_score: 1,
      global_score: 1,
      mvp_complexity_score: 1,
      evidence_quality_score: 1,
      competition_score: 1,
      competitors: [],
      substitutes: [],
      verified_facts: [],
      inferences: [],
      assumptions: [],
      unknowns: [],
      rejection_reasons: [],
      run_id: 'RUN-0001',
      stage: 'complete',
      status: 'APPROVED',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-15T00:00:00Z',
    };
    const result = OpportunitySchema.safeParse(opp);
    expect(result.success).toBe(false);
  });
});

describe('CompetitorSchema', () => {
  it('validates a correct competitor', () => {
    const comp = {
      name: 'TestCompetitor',
      url: 'https://competitor.com',
      classification: 'DIRECT',
      notes: 'Direct competitor',
      feature_overlap: 'Complete overlap',
      pricing: '$10/mo',
      market_positioning: 'SMB focused',
    };
    const result = CompetitorSchema.safeParse(comp);
    expect(result.success).toBe(true);
  });
});

describe('JudgeResultSchema', () => {
  it('validates APPROVE verdict', () => {
    const result = JudgeResultSchema.safeParse({
      verdict: 'APPROVE',
      strongest_reason: 'Strong burning need',
      strongest_risk: 'Platform dependency',
      unresolved_assumption: 'Market size assumption',
      confidence: 0.8,
      recommended_next_step: 'Build MVP and validate with 10 customers',
    });
    expect(result.success).toBe(true);
  });

  it('validates REJECT verdict', () => {
    const result = JudgeResultSchema.safeParse({
      verdict: 'REJECT',
      strongest_reason: 'Too much competition',
      strongest_risk: 'Market saturated',
      unresolved_assumption: 'None',
      confidence: 0.95,
      recommended_next_step: 'Archive this opportunity',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid verdict', () => {
    const result = JudgeResultSchema.safeParse({
      verdict: 'MAYBE',
      strongest_reason: 'reason',
      strongest_risk: 'risk',
      unresolved_assumption: 'assumption',
      confidence: 0.5,
      recommended_next_step: 'next step',
    });
    expect(result.success).toBe(false);
  });
});

describe('DebateResultSchema', () => {
  it('validates a debate result', () => {
    const result = DebateResultSchema.safeParse({
      position: 'BULL',
      summary: 'Strong opportunity',
      strongest_points: ['point 1', 'point 2'],
      weaknesses: ['weakness 1'],
      evidence_cited: ['SRC-001'],
      confidence: 0.75,
    });
    expect(result.success).toBe(true);
  });
});
