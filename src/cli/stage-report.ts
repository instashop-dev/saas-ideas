#!/usr/bin/env node
/**
 * Report Generation Stage CLI
 *
 * Generates TOP-10.md and REJECTED.md reports.
 * Invoked by GitHub Actions workflow: report.yml
 */

import { loadRunManifest, updateRunStatus } from '../state/run-manifest.js';
import { listOpportunities } from '../state/opportunities.js';
import { writeReports } from '../reporting/index.js';
import { calculateFinalScore } from '../scoring/index.js';
import type { Opportunity } from '../schemas/index.js';

function main(): void {
  const runId = process.argv[2] || process.env['RUN_ID'];
  if (!runId) {
    console.error('Usage: stage-report <RUN_ID>');
    process.exit(1);
  }

  console.log(`=== Report Generation Stage ===`);
  console.log(`Run: ${runId}\n`);

  const manifest = loadRunManifest(runId);
  if (!manifest) {
    console.error(`Run ${runId} not found.`);
    process.exit(1);
  }

  const allOpportunities = listOpportunities().filter((o) => o.run_id === runId);

  if (allOpportunities.length === 0) {
    console.log('No opportunities found for this run. Generating empty reports...');
    writeReports([], runId);
    updateRunStatus(runId, 'completed');
    console.log('✓ Empty reports generated.');
    process.exit(0);
  }

  // Calculate final scores
  const scored: Opportunity[] = allOpportunities.map((o) => ({
    ...o,
    final_score: calculateFinalScore(o),
  }));

  console.log(`Processing ${scored.length} opportunities...`);

  const approved = scored.filter((o) => o.status === 'APPROVED');
  const rejected = scored.filter(
    (o) => o.status === 'REJECTED' || o.status === 'NEEDS_MORE_EVIDENCE',
  );

  console.log(`  Approved: ${approved.length}`);
  console.log(`  Rejected/Needs Evidence: ${rejected.length}`);

  const { topPath, rejectedPath } = writeReports(scored, runId);

  console.log(`\n✓ Reports generated:`);
  console.log(`  TOP: ${topPath}`);
  console.log(`  REJECTED: ${rejectedPath}`);

  updateRunStatus(runId, 'completed');
  console.log(`\n✓ Run ${runId} completed.`);
}

main();
