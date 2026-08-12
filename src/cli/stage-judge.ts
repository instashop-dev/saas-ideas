#!/usr/bin/env node
/**
 * Judge Stage CLI
 *
 * Runs the Final Judge on debated opportunities.
 * Invoked by GitHub Actions workflow: judge.yml
 */

import {
  loadRunManifest,
  incrementCandidateCount,
  updateRunStatus,
  recordModelUsed,
  setCandidateCount,
} from '../state/run-manifest.js';
import { runJudge } from '../agents/judge.js';
import {
  saveOpportunity,
  saveOpportunityArtifact,
  loadOpportunityArtifact,
  listOpportunities,
} from '../state/opportunities.js';
import { passesAllGates } from '../gates/index.js';
import type { DebateResult } from '../schemas/index.js';

async function main(): Promise<void> {
  const runId = process.argv[2] || process.env['RUN_ID'];
  if (!runId) {
    console.error('Usage: stage-judge <RUN_ID>');
    process.exit(1);
  }

  console.log(`=== Judge Stage ===`);
  console.log(`Run: ${runId}\n`);

  const manifest = loadRunManifest(runId);
  if (!manifest) {
    console.error(`Run ${runId} not found.`);
    process.exit(1);
  }

  updateRunStatus(runId, 'judging');

  const opportunities = listOpportunities().filter(
    (o) => o.run_id === runId && o.status === 'DEBATED',
  );

  if (opportunities.length === 0) {
    console.log('No opportunities to judge. Exiting.');
    process.exit(0);
  }

  console.log(`Judging ${opportunities.length} opportunities...\n`);

  // Reset the count so Recovery re-runs are idempotent (counts = current state).
  setCandidateCount(runId, 'approved', 0);

  let approved = 0;
  let rejected = 0;
  let needsEvidence = 0;

  for (const opp of opportunities) {
    console.log(`  Judging: ${opp.id}: ${opp.title.slice(0, 60)}...`);

    const bull = loadOpportunityArtifact<DebateResult>(opp.id, 'bull.json');
    const bear = loadOpportunityArtifact<DebateResult>(opp.id, 'bear.json');
    const customer = loadOpportunityArtifact<DebateResult>(opp.id, 'customer.json');

    const fullCaseFile = {
      opportunity: {
        id: opp.id,
        title: opp.title,
        target_user: opp.target_user,
        job_to_be_done: opp.job_to_be_done,
        painful_workflow: opp.painful_workflow,
        current_workaround: opp.current_workaround,
        pain_score: opp.pain_score,
        frequency_score: opp.frequency_score,
        willingness_to_pay_score: opp.willingness_to_pay_score,
        competition_score: opp.competition_score,
        competitors: opp.competitors,
        independent_sources: opp.independent_sources,
        source_type_count: opp.source_type_count,
      },
      validation: {
        facts: opp.verified_facts,
        assumptions: opp.assumptions,
        unknowns: opp.unknowns,
      },
      bull: bull ?? null,
      bear: bear ?? null,
      customer: customer ?? null,
    };

    try {
      const result = await runJudge(JSON.stringify(fullCaseFile, null, 2));
      const verdict = result.data;

      opp.judge_verdict = verdict.verdict;
      opp.confidence = verdict.confidence;
      opp.stage = 'judge';
      opp.status = 'JUDGED';
      opp.updated_at = new Date().toISOString();

      saveOpportunityArtifact(opp.id, 'judge_verdict.json', verdict);
      recordModelUsed(runId, 'judge', result.metadata.model);

      if (verdict.verdict === 'APPROVE') {
        // Check deterministic gates
        const gateResult = passesAllGates(opp);
        if (gateResult.passed) {
          opp.status = 'APPROVED';
          approved++;
          console.log(
            `    ✓ APPROVED (confidence: ${(verdict.confidence * 100).toFixed(0)}%) [${result.metadata.model}]`,
          );
        } else {
          opp.status = 'REJECTED';
          opp.rejection_reasons.push(...gateResult.failures.map((f) => `${f.gate}: ${f.message}`));
          rejected++;
          console.log(`    ✗ REJECTED by gates despite judge approval [${result.metadata.model}]`);
        }
      } else if (verdict.verdict === 'REJECT') {
        opp.status = 'REJECTED';
        opp.rejection_reasons.push(`Judge rejected: ${verdict.strongest_reason}`);
        rejected++;
        console.log(
          `    ✗ REJECTED (${verdict.strongest_reason.slice(0, 60)}...) [${result.metadata.model}]`,
        );
      } else {
        opp.status = 'NEEDS_MORE_EVIDENCE';
        needsEvidence++;
        console.log(`    ? NEEDS_MORE_EVIDENCE [${result.metadata.model}]`);
      }

      saveOpportunity(opp);
    } catch (err) {
      console.error(`    ✗ Failed: ${err}`);
    }
  }

  incrementCandidateCount(runId, 'approved', approved);
  updateRunStatus(runId, 'judging');

  console.log(
    `\n✓ Judge stage complete: ${approved} approved, ${rejected} rejected, ${needsEvidence} needs evidence`,
  );
}

main().catch((err) => {
  console.error('Judge stage failed:', err);
  process.exit(1);
});
