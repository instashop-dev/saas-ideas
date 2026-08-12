#!/usr/bin/env node
/**
 * Validation Stage CLI
 *
 * Runs validators on each cluster and scores pain dimensions.
 * Invoked by GitHub Actions workflow: validation.yml
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { loadConfig } from '../state/config.js';
import {
  loadRunManifest,
  incrementCandidateCount,
  updateRunStatus,
  recordModelUsed,
  setCandidateCount,
} from '../state/run-manifest.js';
import { runValidator } from '../agents/validator.js';
import { saveOpportunity, saveOpportunityArtifact } from '../state/opportunities.js';
import { generateCanonicalKey, generateOpportunityId } from '../dedupe/index.js';
import type { Cluster, Opportunity } from '../schemas/index.js';

async function main(): Promise<void> {
  const runId = process.argv[2] || process.env['RUN_ID'];
  if (!runId) {
    console.error('Usage: stage-validate <RUN_ID>');
    process.exit(1);
  }

  console.log(`=== Validation Stage ===`);
  console.log(`Run: ${runId}\n`);

  const manifest = loadRunManifest(runId);
  if (!manifest) {
    console.error(`Run ${runId} not found.`);
    process.exit(1);
  }

  updateRunStatus(runId, 'validating');

  const config = loadConfig();
  const clustersDir = resolve(process.cwd(), 'research', 'clusters', runId);
  const clustersPath = join(clustersDir, 'clusters.json');

  if (!existsSync(clustersPath)) {
    console.error(`No clusters found for run ${runId}. Run clustering first.`);
    process.exit(1);
  }

  const clusters: Cluster[] = JSON.parse(readFileSync(clustersPath, 'utf-8'));
  console.log(`Validating ${clusters.length} clusters...\n`);

  const maxCandidates = config.research.max_candidates_after_validation;
  let validated = 0;

  // Reset the count so Recovery re-runs are idempotent (counts = current state).
  setCandidateCount(runId, 'validated', 0);

  for (const cluster of clusters.slice(0, maxCandidates)) {
    console.log(`  Validating: ${cluster.cluster_id}: ${cluster.canonical_jtbd.slice(0, 60)}...`);

    try {
      const result = await runValidator(JSON.stringify(cluster, null, 2));
      const validation = result.data;

      const canonicalKey = generateCanonicalKey(cluster.canonical_jtbd);
      const opportunityId = generateOpportunityId(canonicalKey);

      const opportunity: Opportunity = {
        id: opportunityId,
        canonical_key: canonicalKey,
        title: cluster.canonical_jtbd.slice(0, 100),
        target_user: cluster.target_user,
        job_to_be_done: cluster.canonical_jtbd,
        painful_workflow: cluster.painful_workflow,
        current_workaround: cluster.current_workaround,
        source_ids: cluster.source_signal_ids,
        independent_sources: cluster.independent_sources,
        source_type_count: cluster.source_type_count,

        pain_score: validation.scores.pain_intensity,
        frequency_score: validation.scores.frequency,
        urgency_score: validation.scores.urgency,
        economic_impact_score: validation.scores.economic_impact,
        operational_impact_score: validation.scores.operational_impact,
        workaround_intensity_score: validation.scores.workaround_intensity,
        willingness_to_pay_score: validation.scores.willingness_to_pay,
        distribution_score: 3, // to be refined later
        global_score: validation.scores.global_applicability,
        mvp_complexity_score: 3, // to be refined later
        evidence_quality_score: validation.scores.evidence_quality,

        competition_score: 3, // to be refined by competition stage
        competitors: [],
        substitutes: [],

        verified_facts: validation.verified_facts,
        inferences: validation.inferences,
        assumptions: validation.assumptions,
        unknowns: validation.unknowns,
        rejection_reasons: [],

        judge_verdict: '',
        confidence: 0,
        final_score: 0,

        run_id: runId,
        stage: 'validation',
        status: 'VALIDATED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      saveOpportunity(opportunity);
      saveOpportunityArtifact(opportunityId, 'validation.json', validation);
      recordModelUsed(runId, 'validator', result.metadata.model);

      console.log(
        `    ✓ Saved ${opportunityId} (pain: ${validation.scores.pain_intensity}, freq: ${validation.scores.frequency}, WTP: ${validation.scores.willingness_to_pay}) [${result.metadata.model}]`,
      );
      validated++;
    } catch (err) {
      console.error(`    ✗ Failed: ${err}`);
    }
  }

  incrementCandidateCount(runId, 'validated', validated);
  updateRunStatus(runId, 'validating');

  console.log(`\n✓ Validation complete: ${validated} opportunities saved`);
}

main().catch((err) => {
  console.error('Validation stage failed:', err);
  process.exit(1);
});
