import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createRunManifest,
  loadRunManifest,
  updateRunStatus,
  incrementCandidateCount,
  setResearchPlan,
  listRunManifests,
} from '../../src/state/run-manifest.js';

const TEST_RUNS_DIR = resolve(process.cwd(), 'research', 'runs');

describe('run-manifest state', () => {
  const createdRunIds: string[] = [];

  function createTestManifest(): ReturnType<typeof createRunManifest> {
    const manifest = createRunManifest('manual');
    createdRunIds.push(manifest.run_id);
    return manifest;
  }

  beforeEach(() => {
    if (!existsSync(TEST_RUNS_DIR)) {
      mkdirSync(TEST_RUNS_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Remove only the manifests created by THIS test file, so tests running
    // in parallel workers (and committed pipeline artifacts) are never touched.
    for (const id of createdRunIds) {
      rmSync(resolve(TEST_RUNS_DIR, `${id}.json`), { force: true });
    }
    createdRunIds.length = 0;
  });

  it('creates a run manifest', () => {
    const manifest = createTestManifest();
    expect(manifest.run_id).toMatch(/^RUN-/);
    expect(manifest.status).toBe('created');
    expect(manifest.trigger).toBe('manual');
    expect(manifest.started_at).toBeTruthy();
  });

  it('saves and loads a run manifest', () => {
    const manifest = createTestManifest();
    const loaded = loadRunManifest(manifest.run_id);
    expect(loaded).not.toBeNull();
    expect(loaded!.run_id).toBe(manifest.run_id);
    expect(loaded!.status).toBe('created');
  });

  it('updates run status', () => {
    const manifest = createTestManifest();
    const updated = updateRunStatus(manifest.run_id, 'pain_mining');
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('pain_mining');

    const loaded = loadRunManifest(manifest.run_id);
    expect(loaded!.status).toBe('pain_mining');
  });

  it('sets completed_at on terminal status', () => {
    const manifest = createTestManifest();
    const updated = updateRunStatus(manifest.run_id, 'completed');
    expect(updated!.completed_at).not.toBeNull();
  });

  it('increments candidate counts', () => {
    const manifest = createTestManifest();
    incrementCandidateCount(manifest.run_id, 'signals', 10);
    const loaded = loadRunManifest(manifest.run_id);
    expect(loaded!.candidate_counts.signals).toBe(10);

    incrementCandidateCount(manifest.run_id, 'signals', 5);
    const loaded2 = loadRunManifest(manifest.run_id);
    expect(loaded2!.candidate_counts.signals).toBe(15);
  });

  it('stores keyword and research plan on the manifest', () => {
    const manifest = createRunManifest('manual', 'stripe reconciliation');
    createdRunIds.push(manifest.run_id);
    expect(manifest.keyword).toBe('stripe reconciliation');
    expect(manifest.research_plan).toBeNull();

    const plan = { sources: [{ ecosystem: 'reddit', research_questions: ['q1'] }] };
    setResearchPlan(manifest.run_id, plan);

    const loaded = loadRunManifest(manifest.run_id);
    expect(loaded!.keyword).toBe('stripe reconciliation');
    expect(loaded!.research_plan).toEqual(plan);
  });

  it('defaults keyword to null when omitted', () => {
    const manifest = createTestManifest();
    expect(manifest.keyword).toBeNull();
    expect(manifest.research_plan).toBeNull();
  });

  it('lists all run manifests', () => {
    const manifests = listRunManifests();
    expect(Array.isArray(manifests)).toBe(true);
  });

  it('returns null for non-existent run', () => {
    const loaded = loadRunManifest('RUN-NONEXISTENT');
    expect(loaded).toBeNull();
  });
});
