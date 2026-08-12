#!/usr/bin/env node
/**
 * Clustering Stage CLI
 *
 * Reads raw signals and groups them into canonical clusters.
 * Invoked by GitHub Actions workflow: clustering.yml
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  loadRunManifest,
  incrementCandidateCount,
  updateRunStatus,
} from '../state/run-manifest.js';
import { runClusterer } from '../agents/clusterer.js';
import { checkDuplicate } from '../dedupe/index.js';
import type { RawSignal, Cluster } from '../schemas/index.js';

async function main(): Promise<void> {
  const runId = process.argv[2] || process.env['RUN_ID'];
  if (!runId) {
    console.error('Usage: stage-cluster <RUN_ID>');
    process.exit(1);
  }

  console.log(`=== Clustering Stage ===`);
  console.log(`Run: ${runId}\n`);

  const manifest = loadRunManifest(runId);
  if (!manifest) {
    console.error(`Run ${runId} not found.`);
    process.exit(1);
  }

  updateRunStatus(runId, 'clustering');

  const rawSignalsDir = resolve(process.cwd(), 'research', 'raw-signals', runId);

  if (!existsSync(rawSignalsDir)) {
    console.error(`No raw signals found for run ${runId}. Run pain mining first.`);
    process.exit(1);
  }

  // Collect all signals
  const allSignals: RawSignal[] = [];
  const ecosystemDirs = readdirSync(rawSignalsDir, { withFileTypes: true }).filter((d) =>
    d.isDirectory(),
  );

  for (const ecoDir of ecosystemDirs) {
    const signalsPath = join(rawSignalsDir, ecoDir.name, 'signals.json');
    if (existsSync(signalsPath)) {
      try {
        const signals = JSON.parse(readFileSync(signalsPath, 'utf-8')) as RawSignal[];
        allSignals.push(...signals);
        console.log(`  Loaded ${signals.length} signals from ${ecoDir.name}`);
      } catch {
        console.log(`  Skipped ${ecoDir.name} (invalid signals file)`);
      }
    }
  }

  console.log(`\nTotal signals to cluster: ${allSignals.length}`);

  if (allSignals.length === 0) {
    console.log('No signals to cluster. Exiting.');
    updateRunStatus(runId, 'clustering');
    process.exit(0);
  }

  // Run clusterer
  console.log('\nRunning clusterer...');
  const result = await runClusterer(JSON.stringify(allSignals, null, 2));
  const clusters = result.data;

  console.log(
    `  ✓ ${clusters.length} clusters created (${result.metadata.model}, ${result.metadata.durationMs}ms)`,
  );

  // Save clusters and check duplicates
  const clustersDir = resolve(process.cwd(), 'research', 'clusters', runId);
  if (!existsSync(clustersDir)) {
    mkdirSync(clustersDir, { recursive: true });
  }

  // Load existing clusters for dedup
  const existingClustersDir = resolve(process.cwd(), 'research', 'clusters');
  const allExistingClusters: Cluster[] = [];
  if (existsSync(existingClustersDir)) {
    const runDirs = readdirSync(existingClustersDir, { withFileTypes: true }).filter(
      (d) => d.isDirectory() && d.name !== runId,
    );
    for (const runDir of runDirs) {
      const clusterPath = join(existingClustersDir, runDir.name, 'clusters.json');
      if (existsSync(clusterPath)) {
        try {
          const existing = JSON.parse(readFileSync(clusterPath, 'utf-8')) as Cluster[];
          allExistingClusters.push(...existing);
        } catch {
          /* skip */
        }
      }
    }
  }

  let newClusters = 0;
  let duplicates = 0;
  let possibleDupes = 0;

  for (const cluster of clusters) {
    const dupResult = await checkDuplicate(cluster, allExistingClusters, []);

    if (dupResult.status === 'DUPLICATE') {
      console.log(`  [DUPLICATE] ${cluster.cluster_id}: ${cluster.canonical_jtbd.slice(0, 80)}...`);
      duplicates++;
    } else if (dupResult.status === 'POSSIBLE_DUPLICATE') {
      console.log(
        `  [POSSIBLE_DUP] ${cluster.cluster_id}: matches ${dupResult.candidates.join(', ')}`,
      );
      possibleDupes++;
      newClusters++;
    } else {
      console.log(`  [NEW] ${cluster.cluster_id}: ${cluster.canonical_jtbd.slice(0, 80)}...`);
      newClusters++;
    }
  }

  writeFileSync(resolve(clustersDir, 'clusters.json'), JSON.stringify(clusters, null, 2), 'utf-8');

  incrementCandidateCount(runId, 'clusters', newClusters);
  updateRunStatus(runId, 'clustering');

  console.log(
    `\n✓ Clustering complete: ${newClusters} new, ${duplicates} duplicates, ${possibleDupes} possible duplicates`,
  );
}

main().catch((err) => {
  console.error('Clustering stage failed:', err);
  process.exit(1);
});
