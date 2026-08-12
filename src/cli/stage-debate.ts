#!/usr/bin/env node
/**
 * Debate Stage CLI
 *
 * Runs Bull, Bear, and Customer agents in parallel for each opportunity.
 * Invoked by GitHub Actions workflow: debate.yml
 */

import {
  loadRunManifest,
  incrementCandidateCount,
  updateRunStatus,
  recordModelUsed,
  setCandidateCount,
} from '../state/run-manifest.js';
import { loadConfig } from '../state/config.js';
import { runBull, runBear, runCustomer } from '../agents/debate.js';
import {
  saveOpportunity,
  saveOpportunityArtifact,
  listOpportunities,
} from '../state/opportunities.js';
import { mapWithConcurrency } from '../lib/concurrency.js';

async function main(): Promise<void> {
  const runId = process.argv[2] || process.env['RUN_ID'];
  if (!runId) {
    console.error('Usage: stage-debate <RUN_ID>');
    process.exit(1);
  }

  console.log(`=== Debate Stage ===`);
  console.log(`Run: ${runId}\n`);

  const manifest = loadRunManifest(runId);
  if (!manifest) {
    console.error(`Run ${runId} not found.`);
    process.exit(1);
  }

  updateRunStatus(runId, 'debating');

  const config = loadConfig();

  const opportunities = listOpportunities().filter(
    (o) =>
      o.run_id === runId &&
      o.status === 'COMPETITION_CHECKED' &&
      !o.rejection_reasons.some((r) => r.includes('Competition too high')),
  );

  if (opportunities.length === 0) {
    console.log('No opportunities to debate. Exiting.');
    process.exit(0);
  }

  console.log(
    `Debating ${opportunities.length} opportunities (Bull + Bear + Customer, concurrency ${config.parallelism.debate} agents)...\n`,
  );

  // Reset the count so Recovery re-runs are idempotent (counts = current state).
  setCandidateCount(runId, 'finalists', 0);

  // Each opportunity already runs 3 agents in parallel; processing 3
  // opportunities concurrently yields 9 concurrent agent calls, honoring the
  // parallelism.debate=9 setting without hammering the LLM provider.
  const results = await mapWithConcurrency(
    opportunities,
    Math.max(1, Math.min(3, config.parallelism.debate)),
    async (opp) => {
      console.log(`  Debating: ${opp.id}: ${opp.title.slice(0, 60)}...`);

      const caseFile = {
        canonical_jtbd: opp.job_to_be_done,
        target_user: opp.target_user,
        painful_workflow: opp.painful_workflow,
        current_workaround: opp.current_workaround,
        validation_scores: {
          pain_intensity: opp.pain_score,
          frequency: opp.frequency_score,
          urgency: opp.urgency_score,
          economic_impact: opp.economic_impact_score,
          operational_impact: opp.operational_impact_score,
          willingness_to_pay: opp.willingness_to_pay_score,
          global_applicability: opp.global_score,
        },
        competition_score: opp.competition_score,
        competitors: opp.competitors,
        evidence_count: opp.independent_sources,
      };

      const caseFileJson = JSON.stringify(caseFile, null, 2);

      try {
        // Run all three in parallel
        const [bullResult, bearResult, customerResult] = await Promise.allSettled([
          runBull(caseFileJson),
          runBear(caseFileJson),
          runCustomer(caseFileJson),
        ]);

        const bull = bullResult.status === 'fulfilled' ? bullResult.value : null;
        const bear = bearResult.status === 'fulfilled' ? bearResult.value : null;
        const customer = customerResult.status === 'fulfilled' ? customerResult.value : null;

        if (bullResult.status === 'rejected') {
          console.error(`    ✗ Bull failed: ${bullResult.reason}`);
        }
        if (bearResult.status === 'rejected') {
          console.error(`    ✗ Bear failed: ${bearResult.reason}`);
        }
        if (customerResult.status === 'rejected') {
          console.error(`    ✗ Customer failed: ${customerResult.reason}`);
        }

        if (bull) {
          saveOpportunityArtifact(opp.id, 'bull.json', bull.data);
          recordModelUsed(runId, 'bull', bull.metadata.model);
          console.log(`    ✓ Bull: ${bull.data.summary.slice(0, 60)}...`);
        }
        if (bear) {
          saveOpportunityArtifact(opp.id, 'bear.json', bear.data);
          recordModelUsed(runId, 'bear', bear.metadata.model);
          console.log(`    ✓ Bear: ${bear.data.summary.slice(0, 60)}...`);
        }
        if (customer) {
          saveOpportunityArtifact(opp.id, 'customer.json', customer.data);
          recordModelUsed(runId, 'customer', customer.metadata.model);
          console.log(`    ✓ Customer: ${customer.data.summary.slice(0, 60)}...`);
        }

        opp.stage = 'debate';
        opp.status = 'DEBATED';
        opp.updated_at = new Date().toISOString();
        saveOpportunity(opp);
        return 1;
      } catch (err) {
        console.error(`    ✗ Failed: ${err}`);
        return 0;
      }
    },
  );

  const debated = results.reduce((sum: number, n: number) => sum + n, 0);

  incrementCandidateCount(runId, 'finalists', debated);
  updateRunStatus(runId, 'debating');

  console.log(`\n✓ Debate stage complete: ${debated} opportunities debated`);
}

main().catch((err) => {
  console.error('Debate stage failed:', err);
  process.exit(1);
});
