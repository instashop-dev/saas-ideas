#!/usr/bin/env node
/**
 * Competition Stage CLI
 *
 * Runs competition research on validated opportunities.
 * Invoked by GitHub Actions workflow: competition.yml
 */

import { loadConfig } from '../state/config.js';
import {
  loadRunManifest,
  incrementCandidateCount,
  updateRunStatus,
  recordModelUsed,
  setCandidateCount,
} from '../state/run-manifest.js';
import { runCompetitionResearcher } from '../agents/competition.js';
import {
  saveOpportunity,
  saveOpportunityArtifact,
  listOpportunities,
} from '../state/opportunities.js';

async function main(): Promise<void> {
  const runId = process.argv[2] || process.env['RUN_ID'];
  if (!runId) {
    console.error('Usage: stage-competition <RUN_ID>');
    process.exit(1);
  }

  console.log(`=== Competition Stage ===`);
  console.log(`Run: ${runId}\n`);

  const manifest = loadRunManifest(runId);
  if (!manifest) {
    console.error(`Run ${runId} not found.`);
    process.exit(1);
  }

  updateRunStatus(runId, 'competition_checking');

  const config = loadConfig();
  const opportunities = listOpportunities().filter(
    (o) => o.run_id === runId && o.status === 'VALIDATED',
  );

  if (opportunities.length === 0) {
    console.log('No validated opportunities to check. Exiting.');
    process.exit(0);
  }

  const maxCandidates = config.research.max_candidates_after_competition;
  console.log(
    `Checking competition for ${opportunities.length} opportunities (max ${maxCandidates} survivors)...\n`,
  );

  // Reset the count so Recovery re-runs are idempotent (counts = current state).
  setCandidateCount(runId, 'competition_survivors', 0);

  let survivors = 0;

  for (const opp of opportunities.slice(0, maxCandidates * 2)) {
    // Only keep survivors up to max
    if (survivors >= maxCandidates) break;

    console.log(`  Researching: ${opp.id}: ${opp.title.slice(0, 60)}...`);

    try {
      const clusterInfo = {
        canonical_jtbd: opp.job_to_be_done,
        target_user: opp.target_user,
        painful_workflow: opp.painful_workflow,
        current_workaround: opp.current_workaround,
        source_evidence: opp.source_ids,
      };

      const result = await runCompetitionResearcher(JSON.stringify(clusterInfo, null, 2));
      const competition = result.data;

      opp.competition_score = competition.competition_score;
      opp.competitors = competition.competitors;
      opp.substitutes = competition.substitutes as typeof opp.substitutes;
      opp.stage = 'competition';
      opp.status = 'COMPETITION_CHECKED';
      opp.updated_at = new Date().toISOString();

      if (competition.competition_score <= config.gates.max_competition_score) {
        survivors++;
        console.log(
          `    ✓ Competition score: ${competition.competition_score}/5 (PASSED) - ${competition.competitors.length} competitors found [${result.metadata.model}]`,
        );
      } else {
        opp.rejection_reasons.push(
          `Competition too high: ${competition.competition_score}/5 (max ${config.gates.max_competition_score})`,
        );
        opp.status = 'REJECTED';
        console.log(
          `    ✗ Competition score: ${competition.competition_score}/5 (REJECTED) - ${competition.competitors.length} competitors found [${result.metadata.model}]`,
        );
      }

      saveOpportunity(opp);
      saveOpportunityArtifact(opp.id, 'competition.json', competition);
      recordModelUsed(runId, 'competition', result.metadata.model);
    } catch (err) {
      console.error(`    ✗ Failed: ${err}`);
      opp.status = 'REJECTED';
      opp.rejection_reasons.push(`Competition research failed: ${err}`);
      saveOpportunity(opp);
    }
  }

  incrementCandidateCount(runId, 'competition_survivors', survivors);
  updateRunStatus(runId, 'competition_checking');

  console.log(`\n✓ Competition stage complete: ${survivors} survivors`);
}

main().catch((err) => {
  console.error('Competition stage failed:', err);
  process.exit(1);
});
