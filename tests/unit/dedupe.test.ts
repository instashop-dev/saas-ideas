import { describe, it, expect } from 'vitest';
import {
  generateCanonicalKey,
  generateOpportunityId,
  checkDuplicate,
} from '../../src/dedupe/index.js';
import { sampleClusters } from '../fixtures/samples.js';
import type { Cluster, Opportunity } from '../../src/schemas/index.js';

describe('generateCanonicalKey', () => {
  it('produces a key starting with CK-', () => {
    const key = generateCanonicalKey('Test JTBD description');
    expect(key).toMatch(/^CK-[a-f0-9]{16}$/);
  });

  it('produces the same key for the same input', () => {
    const jtbd = 'Finance teams manually reconcile Stripe payouts';
    const key1 = generateCanonicalKey(jtbd);
    const key2 = generateCanonicalKey(jtbd);
    expect(key1).toBe(key2);
  });

  it('produces different keys for different inputs', () => {
    const key1 = generateCanonicalKey('Reconcile Stripe payouts');
    const key2 = generateCanonicalKey('Manage customer support tickets');
    expect(key1).not.toBe(key2);
  });

  it('handles special characters and casing', () => {
    const key1 = generateCanonicalKey('Hello, World!  Test---JTBD');
    const key2 = generateCanonicalKey('hello world test jtbd');
    expect(key1).toBe(key2);
  });
});

describe('generateOpportunityId', () => {
  it('produces an ID in OP-XXXX format', () => {
    const id = generateOpportunityId('CK-1234abcd5678ef90');
    expect(id).toMatch(/^OP-[A-F0-9]{4}$/);
  });

  it('produces deterministic IDs', () => {
    const key = 'CK-test-key-1234';
    const id1 = generateOpportunityId(key);
    const id2 = generateOpportunityId(key);
    expect(id1).toBe(id2);
  });

  it('produces different IDs for different keys', () => {
    const id1 = generateOpportunityId('CK-key-a');
    const id2 = generateOpportunityId('CK-key-b');
    expect(id1).not.toBe(id2);
  });
});

describe('checkDuplicate', () => {
  it('returns NEW for a unique cluster', async () => {
    const cluster: Cluster = {
      ...sampleClusters[0]!,
      canonical_jtbd: 'A completely unique JTBD that has never been seen before anywhere',
    };
    const result = await checkDuplicate(cluster, [], []);
    expect(result.status).toBe('NEW');
  });

  it('returns DUPLICATE for identical JTBD in existing clusters', async () => {
    const cluster = sampleClusters[0]!;
    const result = await checkDuplicate(cluster, [cluster], []);
    expect(result.status).toBe('DUPLICATE');
  });

  it('returns DUPLICATE for identical JTBD in existing opportunities', async () => {
    const cluster = sampleClusters[0]!;
    const opp: Opportunity = {
      id: 'OP-0001',
      canonical_key: 'CK-test',
      title: 'Test',
      target_user: 'User',
      job_to_be_done: cluster.canonical_jtbd,
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
      judge_verdict: '',
      confidence: 0,
      final_score: 0,
      run_id: 'RUN-0001',
      stage: 'complete',
      status: 'APPROVED',
      created_at: '',
      updated_at: '',
    };
    const result = await checkDuplicate(cluster, [], [opp]);
    expect(result.status).toBe('DUPLICATE');
  });
});
