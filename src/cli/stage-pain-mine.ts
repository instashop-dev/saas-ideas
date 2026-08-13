#!/usr/bin/env node
/**
 * Pain Mining Stage CLI
 *
 * Runs pain miners across planner-selected sources and saves raw signals.
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
  setResearchPlan,
} from '../state/run-manifest.js';
import { runPainMiner } from '../agents/pain-miner.js';
import { runResearchPlanner, resolvePlan } from '../agents/research-planner.js';
import { mapWithConcurrency } from '../lib/concurrency.js';

/**
 * Build the pain-miner context string. When the planner supplied per-source
 * questions, the prompt is guided by them (plus the keyword when present);
 * otherwise it falls back to the generic context.
 */
function composeContext(
  keyword: string | null,
  ecosystem: string,
  researchQuestions: string[],
  maxSignals: number,
): string {
  const generic = `Search for recurring operational pain in the ${ecosystem} ecosystem. ` +
    `Look for manual workflows, reconciliation tasks, integration gaps, ` +
    `and compliance operations. Focus on signals where people are actively ` +
    `complaining about or spending money to solve a problem. ` +
    `Return between 3 and ${Math.min(10, maxSignals)} high-quality signals with ` +
    `full evidence for each — prefer depth and verified detail over volume.`;

  if (researchQuestions.length === 0) {
    return generic;
  }

  const questions = researchQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n');
  const keywordLine = keyword ? `Keyword: ${keyword}\n\n` : '';
  return `${keywordLine}Research questions for ${ecosystem}:\n${questions}\n\n${generic}`;
}

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
  const maxSignals = config.research.max_signals_per_worker;

  // Sources are decided in real time by the research_planner (keyword-guided,
  // or broad discovery when no keyword is given). The resolved plan is persisted
  // so Recovery re-runs reuse the same sources deterministically.
  const keyword = manifest.keyword ?? null;
  if (keyword) {
    console.log(`Keyword: ${keyword}`);
  }

  let plan = manifest.research_plan;
  if (!plan || plan.sources.length === 0) {
    console.log('  Planning sources + questions via research_planner...');
    const planResult = await runResearchPlanner(keyword);
    const resolved = resolvePlan(planResult.data);
    if (resolved) {
      plan = { sources: resolved };
      setResearchPlan(runId, plan);
      recordModelUsed(runId, 'research_planner', planResult.metadata.model);
    }
  }

  const sources: { ecosystem: string; research_questions: string[] }[] =
    plan && plan.sources.length > 0
      ? plan.sources.map((s) => ({
          ecosystem: s.ecosystem,
          research_questions: s.research_questions,
        }))
      : [];

  if (sources.length === 0) {
    console.error('Research planner produced no usable sources.');
    process.exit(1);
  }

  console.log(`Mining ${sources.length} ecosystems (max ${maxSignals} signals/worker)...\n`);

  const rawSignalsDir = resolve(process.cwd(), 'research', 'raw-signals', runId);
  if (!existsSync(rawSignalsDir)) {
    mkdirSync(rawSignalsDir, { recursive: true });
  }

  // Reset the count so Recovery re-runs are idempotent (counts = current state).
  setCandidateCount(runId, 'signals', 0);

  const results = await mapWithConcurrency(
    sources,
    config.parallelism.pain_miners,
    async (source) => {
      const ecosystem = source.ecosystem;
      console.log(`  Mining: ${ecosystem}...`);
      try {
        const result = await runPainMiner(
          ecosystem,
          composeContext(keyword, ecosystem, source.research_questions, maxSignals),
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
