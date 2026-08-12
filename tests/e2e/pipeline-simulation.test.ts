import { describe, it, expect, beforeAll } from 'vitest';
import { loadConfig, resetConfigCache } from '../../src/state/config.js';
import { runHardGates, passesAllGates } from '../../src/gates/index.js';
import { calculateFinalScore, rankOpportunities } from '../../src/scoring/index.js';
import { generateCanonicalKey, generateOpportunityId } from '../../src/dedupe/index.js';
import { generateTopReport, generateRejectedReport } from '../../src/reporting/index.js';
import { fixtureA, fixtureB, fixtureC, fixtureD, fixtureE } from '../fixtures/opportunities.js';
import { sampleClusters, sampleSignals, sampleEvidence } from '../fixtures/samples.js';
import {
  EvidenceItemSchema,
  RawSignalSchema,
  ClusterSchema,
  OpportunitySchema,
} from '../../src/schemas/index.js';
import { AppConfigSchema } from '../../src/schemas/config.js';
import { RunManifestSchema } from '../../src/schemas/run-manifest.js';

/**
 * End-to-End Deterministic Simulation
 *
 * Simulates the full pipeline using fixture data:
 * discovery → pain mining → clustering → dedup → validation → competition → debate → judge → gates → scoring → report
 */
describe('E2E Deterministic Pipeline Simulation', () => {
  beforeAll(() => {
    resetConfigCache();
  });

  // Stage 0: Config validation
  it('Stage 0: Config loads and is valid', () => {
    const config = loadConfig();
    const result = AppConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  // Stage 1: Pain Mining (fixture signals are already collected)
  it('Stage 1: Pain signals are schema-valid', () => {
    for (const signal of sampleSignals) {
      const result = RawSignalSchema.safeParse(signal);
      expect(result.success, `Signal ${signal.signal_id} failed: ${result.error}`).toBe(true);
    }
    expect(sampleSignals.length).toBeGreaterThan(0);
  });

  it('Stage 1: Evidence items are schema-valid', () => {
    for (const evidence of sampleEvidence) {
      const result = EvidenceItemSchema.safeParse(evidence);
      expect(result.success, `Evidence ${evidence.source_id} failed: ${result.error}`).toBe(true);
    }
    expect(sampleEvidence.length).toBeGreaterThan(0);
  });

  // Stage 2: Clustering
  it('Stage 2: Clusters are schema-valid', () => {
    for (const cluster of sampleClusters) {
      const result = ClusterSchema.safeParse(cluster);
      expect(result.success, `Cluster ${cluster.cluster_id} failed: ${result.error}`).toBe(true);
    }
  });

  it('Stage 2: Clusters contain evidence from source signals', () => {
    for (const cluster of sampleClusters) {
      expect(cluster.source_signal_ids.length).toBeGreaterThan(0);
      expect(cluster.source_evidence.length).toBeGreaterThan(0);
      expect(cluster.independent_sources).toBeGreaterThan(0);
    }
  });

  // Stage 3: Deduplication
  it('Stage 3: Canonical keys are deterministic', () => {
    const jtbd = sampleClusters[0]!.canonical_jtbd;
    const key1 = generateCanonicalKey(jtbd);
    const key2 = generateCanonicalKey(jtbd);
    expect(key1).toBe(key2);
    expect(key1).toMatch(/^CK-/);
  });

  it('Stage 3: Opportunity IDs are deterministic', () => {
    const key = generateCanonicalKey(sampleClusters[0]!.canonical_jtbd);
    const id1 = generateOpportunityId(key);
    const id2 = generateOpportunityId(key);
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^OP-/);
  });

  it('Stage 3: Different JTBDs produce different IDs', () => {
    const key1 = generateCanonicalKey(sampleClusters[0]!.canonical_jtbd);
    const key2 = generateCanonicalKey('A completely different JTBD about something else entirely');
    expect(generateOpportunityId(key1)).not.toBe(generateOpportunityId(key2));
  });

  // Stage 4-5: Validation + Competition (pre-scored in fixtures)

  // Stage 6: Gates
  it('Stage 6: Fixture A passes all hard gates', () => {
    const result = runHardGates(fixtureA);
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('Stage 6: Fixture B fails on competition gate', () => {
    const result = runHardGates(fixtureB);
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.gate === 'max_competition_score')).toBe(true);
  });

  it('Stage 6: Fixture C fails on pain and WTP gates', () => {
    const result = runHardGates(fixtureC);
    expect(result.passed).toBe(false);
    const painFailure = result.failures.some((f) => f.gate === 'min_pain_score');
    expect(painFailure).toBe(true);
  });

  it('Stage 6: Fixture D fails on evidence gates', () => {
    const result = runHardGates(fixtureD);
    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThanOrEqual(3);
  });

  it('Stage 6: Fixture E fails on duplicate check', () => {
    const result = passesAllGates(fixtureE);
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.gate === 'duplicate_check')).toBe(true);
  });

  // Stage 7: Scoring
  it('Stage 7: Scoring is deterministic', () => {
    const score1 = calculateFinalScore(fixtureA);
    const score2 = calculateFinalScore(fixtureA);
    expect(score1).toBe(score2);
  });

  it('Stage 7: Excellent opportunity scores higher than weak ones', () => {
    const scoreA = calculateFinalScore(fixtureA);
    const scoreC = calculateFinalScore(fixtureC);
    const scoreD = calculateFinalScore(fixtureD);

    expect(scoreA).toBeGreaterThan(scoreC);
    expect(scoreA).toBeGreaterThan(scoreD);
  });

  it('Stage 7: High competition lowers score', () => {
    const scoreA = calculateFinalScore(fixtureA);
    const scoreB = calculateFinalScore(fixtureB);
    expect(scoreA).toBeGreaterThan(scoreB);
  });

  it('Stage 7: Ranking is correct', () => {
    const allOpps = [fixtureC, fixtureB, fixtureA, fixtureD];
    const ranked = rankOpportunities(allOpps);
    expect(ranked.length).toBe(4);
    // Fixture A should rank first
    expect(ranked[0]!.id).toBe(fixtureA.id);
    // Scores should be in descending order
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i - 1]!.final_score).toBeGreaterThanOrEqual(ranked[i]!.final_score);
    }
  });

  // Stage 8: Reports
  it('Stage 8: TOP report includes approved opportunities', () => {
    const allOpps = [
      { ...fixtureA, final_score: calculateFinalScore(fixtureA) },
      { ...fixtureB, final_score: calculateFinalScore(fixtureB) },
      { ...fixtureC, final_score: calculateFinalScore(fixtureC) },
      { ...fixtureD, final_score: calculateFinalScore(fixtureD) },
    ];
    const topReport = generateTopReport(allOpps);
    expect(topReport).toContain(fixtureA.id);
    // Fixture B, C, D should NOT be in TOP report
    expect(topReport).not.toContain(fixtureB.id);
    expect(topReport).not.toContain(fixtureC.id);
  });

  it('Stage 8: REJECTED report includes rejected opportunities with reasons', () => {
    const allOpps = [
      { ...fixtureA, final_score: calculateFinalScore(fixtureA) },
      { ...fixtureB, final_score: calculateFinalScore(fixtureB) },
      { ...fixtureC, final_score: calculateFinalScore(fixtureC) },
      { ...fixtureD, final_score: calculateFinalScore(fixtureD) },
    ];
    const rejectedReport = generateRejectedReport(allOpps);
    expect(rejectedReport).toContain(fixtureB.id);
    expect(rejectedReport).toContain(fixtureC.id);
    expect(rejectedReport).toContain(fixtureD.id);
    // Approved should NOT be in rejected
    expect(rejectedReport).not.toContain(fixtureA.id);
  });

  // Cross-cutting concerns
  it('No duplicate IDs across fixtures', () => {
    const allOpps = [fixtureA, fixtureB, fixtureC, fixtureD, fixtureE];
    const ids = allOpps.map((o) => o.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('All fixture opportunities pass schema validation', () => {
    const allOpps = [fixtureA, fixtureB, fixtureC, fixtureD, fixtureE];
    for (const opp of allOpps) {
      const result = OpportunitySchema.safeParse(opp);
      expect(result.success, `Opportunity ${opp.id} failed: ${result.error}`).toBe(true);
    }
  });

  it('Run manifest schema is valid', () => {
    const manifest = {
      run_id: 'RUN-SIM-01',
      started_at: new Date().toISOString(),
      completed_at: null,
      trigger: 'manual',
      models: { pain_miner: 'test-model' },
      candidate_counts: {
        signals: 10,
        clusters: 3,
        validated: 2,
        competition_survivors: 1,
        finalists: 1,
        approved: 1,
      },
      estimated_cost: null,
      status: 'completed',
    };
    const result = RunManifestSchema.safeParse(manifest);
    expect(result.success).toBe(true);
  });

  it('Empty opportunities is handled correctly (zero qualifying)', () => {
    const topReport = generateTopReport([]);
    expect(topReport).toContain('No opportunities passed');

    const rejectedReport = generateRejectedReport([]);
    expect(rejectedReport).toContain('No opportunities were rejected');
  });

  it('Scoring produces scores in 0-100 range for all fixtures', () => {
    const allOpps = [fixtureA, fixtureB, fixtureC, fixtureD];
    for (const opp of allOpps) {
      const score = calculateFinalScore(opp);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });
});
