#!/usr/bin/env node
/**
 * Discovery CLI — starts a new discovery run.
 *
 * Creates a run manifest and triggers the pipeline.
 */

import { createRunManifest } from '../state/run-manifest.js';
import { loadConfig } from '../state/config.js';

function main(): void {
  console.log('=== SaaS Ideas Discovery Run ===\n');

  // Load config
  const config = loadConfig();
  console.log(`Models: ${Object.keys(config.models).length} agents configured`);
  console.log(`Ecosystems: ${config.research.ecosystems.join(', ')}`);

  // Determine trigger type
  const triggerArg = process.argv[2];
  const trigger =
    triggerArg === 'scheduled' ? 'scheduled' : triggerArg === 'retry' ? 'retry' : 'manual';

  // Create run manifest
  const manifest = createRunManifest(trigger as 'manual' | 'scheduled' | 'retry');
  console.log(`\n✓ Run created: ${manifest.run_id}`);
  console.log(`  Trigger: ${manifest.trigger}`);
  console.log(`  Started: ${manifest.started_at}`);
  console.log(`  Status: ${manifest.status}`);

  // Output run ID for downstream steps
  console.log(`\nRUN_ID=${manifest.run_id}`);
  console.log(`\nNext: Pain mining stage will process this run.`);
}

main();
