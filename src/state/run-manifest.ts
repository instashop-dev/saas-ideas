import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { RunManifest, RunStatus } from '../schemas/run-manifest.js';

const RESEARCH_DIR = resolve(process.cwd(), 'research', 'runs');

export function createRunManifest(trigger: 'manual' | 'scheduled' | 'retry'): RunManifest {
  const runId = `RUN-${randomUUID().slice(0, 8).toUpperCase()}`;
  const manifest: RunManifest = {
    run_id: runId,
    started_at: new Date().toISOString(),
    completed_at: null,
    trigger,
    models: {},
    candidate_counts: {
      signals: 0,
      clusters: 0,
      validated: 0,
      competition_survivors: 0,
      finalists: 0,
      approved: 0,
    },
    estimated_cost: null,
    status: 'created',
  };
  saveRunManifest(manifest);
  return manifest;
}

export function saveRunManifest(manifest: RunManifest): void {
  if (!existsSync(RESEARCH_DIR)) {
    mkdirSync(RESEARCH_DIR, { recursive: true });
  }
  const path = resolve(RESEARCH_DIR, `${manifest.run_id}.json`);
  writeFileSync(path, JSON.stringify(manifest, null, 2), 'utf-8');
}

export function loadRunManifest(runId: string): RunManifest | null {
  const path = resolve(RESEARCH_DIR, `${runId}.json`);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as RunManifest;
}

export function updateRunStatus(runId: string, status: RunStatus): RunManifest | null {
  const manifest = loadRunManifest(runId);
  if (!manifest) return null;
  manifest.status = status;
  if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    manifest.completed_at = new Date().toISOString();
  }
  saveRunManifest(manifest);
  return manifest;
}

export function incrementCandidateCount(
  runId: string,
  field: keyof RunManifest['candidate_counts'],
  count: number = 1,
): RunManifest | null {
  const manifest = loadRunManifest(runId);
  if (!manifest) return null;
  manifest.candidate_counts[field] += count;
  saveRunManifest(manifest);
  return manifest;
}

export function setModelsUsed(runId: string, models: Record<string, string>): RunManifest | null {
  const manifest = loadRunManifest(runId);
  if (!manifest) return null;
  manifest.models = models;
  saveRunManifest(manifest);
  return manifest;
}

export function listRunManifests(): RunManifest[] {
  if (!existsSync(RESEARCH_DIR)) return [];
  return readdirSync(RESEARCH_DIR)
    .filter((f: string) => f.endsWith('.json'))
    .map((f: string) => {
      const raw = readFileSync(resolve(RESEARCH_DIR, f), 'utf-8');
      return JSON.parse(raw) as RunManifest;
    });
}
