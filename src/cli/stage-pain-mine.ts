#!/usr/bin/env node
/**
 * Pain Mining Stage CLI
 *
 * Runs pain miners across configured ecosystems and saves raw signals.
 * Invoked by GitHub Actions workflow: pain-mining.yml
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../state/config.js';
import {
  loadRunManifest,
  incrementCandidateCount,
  updateRunStatus,
  recordModelUsed,
  setCandidateCount,
} from '../state/run-manifest.js';
import { runPainMiner } from '../agents/pain-miner.js';
import { mapWithConcurrency } from '../lib/concurrency.js';

async function main(): Promise<void> {
  const runId = process.argv[2] || process.env['RUN_ID'];
  if (!runId) {
    console.error('Usage: stage-pain-mine <RUN_ID>');
    console.error('Set RUN_ID environment variable or pass as argument.');
    process.exit(1);
  }

  console.log(`=== Pain Mining Stage ===`);
  console.log(`Run: ${runId}\n`);

  const manifest = loadRunManifest(runId);
  if (!manifest) {
    console.error(`Run ${runId} not found.`);
    process.exit(1);
  }

  updateRunStatus(runId, 'pain_mining');

  const config = loadConfig();
  const ecosystems = config.research.ecosystems;
  const maxSignals = config.research.max_signals_per_worker;

  console.log(`Mining ${ecosystems.length} ecosystems (max ${maxSignals} signals/worker)...\n`);

  const rawSignalsDir = resolve(process.cwd(), 'research', 'raw-signals', runId);
  if (!existsSync(rawSignalsDir)) {
    mkdirSync(rawSignalsDir, { recursive: true });
  }

  // Reset the count so Recovery re-runs are idempotent (counts = current state).
  setCandidateCount(runId, 'signals', 0);

  const results = await mapWithConcurrency(
    ecosystems,
    config.parallelism.pain_miners,
    async (ecosystem) => {
      console.log(`  Mining: ${ecosystem}...`);
      try {
        const result = await runPainMiner(
          ecosystem,
          `Search for recurring operational pain in the ${ecosystem} ecosystem. ` +
            `Look for manual workflows, reconciliation tasks, integration gaps, ` +
            `and compliance operations. Focus on signals where people are actively ` +
            `complaining about or spending money to solve a problem. ` +
            `Return between 3 and ${Math.min(10, maxSignals)} high-quality signals with ` +
            `full evidence for each — prefer depth and verified detail over volume.`,
        );

        const ecoDir = resolve(rawSignalsDir, ecosystem.replace(/[^a-zA-Z0-9-]/g, '_'));
        if (!existsSync(ecoDir)) {
          mkdirSync(ecoDir, { recursive: true });
        }

        writeFileSync(
          resolve(ecoDir, 'signals.json'),
          JSON.stringify(result.data.signals, null, 2),
          'utf-8',
        );
        writeFileSync(
          resolve(ecoDir, 'evidence.json'),
          JSON.stringify(result.data.evidence, null, 2),
          'utf-8',
        );

        console.log(
          `    ✓ ${result.data.signals.length} signals, ${result.data.evidence.length} evidence items (${result.metadata.model}, ${result.metadata.durationMs}ms)`,
        );
        recordModelUsed(runId, 'pain_miner', result.metadata.model);
        return result.data.signals.length;
      } catch (err) {
        console.error(`    ✗ Failed: ${err}`);
        return 0;
      }
    },
  );

  const totalSignals = results.reduce((sum: number, n: number) => sum + n, 0);

  incrementCandidateCount(runId, 'signals', totalSignals);
  updateRunStatus(runId, 'pain_mining');

  console.log(`\n✓ Pain mining complete: ${totalSignals} total signals`);
  console.log(`${rawSignalsDir}`);
}

main().catch((err) => {
  console.error('Pain mining stage failed:', err);
  process.exit(1);
});
