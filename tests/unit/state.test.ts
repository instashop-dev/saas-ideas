import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createRunManifest,
  loadRunManifest,
  updateRunStatus,
  incrementCandidateCount,
  listRunManifests,
} from '../../src/state/run-manifest.js';

const TEST_RUNS_DIR = resolve(process.cwd(), 'research', 'runs');

describe('run-manifest state', () => {
  beforeEach(() => {
    if (!existsSync(TEST_RUNS_DIR)) {
      mkdirSync(TEST_RUNS_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up test manifests
    if (existsSync(TEST_RUNS_DIR)) {
      const files = readdirSync(TEST_RUNS_DIR);
      for (const file of files) {
        if (file.startsWith('RUN-TEST-') && file.endsWith('.json')) {
          rmSync(resolve(TEST_RUNS_DIR, file));
        }
      }
    }
  });

  it('creates a run manifest', () => {
    const manifest = createRunManifest('manual');
    expect(manifest.run_id).toMatch(/^RUN-/);
    expect(manifest.status).toBe('created');
    expect(manifest.trigger).toBe('manual');
    expect(manifest.started_at).toBeTruthy();
  });

  it('saves and loads a run manifest', () => {
    const manifest = createRunManifest('manual');
    const loaded = loadRunManifest(manifest.run_id);
    expect(loaded).not.toBeNull();
    expect(loaded!.run_id).toBe(manifest.run_id);
    expect(loaded!.status).toBe('created');
  });

  it('updates run status', () => {
    const manifest = createRunManifest('manual');
    const updated = updateRunStatus(manifest.run_id, 'pain_mining');
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('pain_mining');

    const loaded = loadRunManifest(manifest.run_id);
    expect(loaded!.status).toBe('pain_mining');
  });

  it('sets completed_at on terminal status', () => {
    const manifest = createRunManifest('manual');
    const updated = updateRunStatus(manifest.run_id, 'completed');
    expect(updated!.completed_at).not.toBeNull();
  });

  it('increments candidate counts', () => {
    const manifest = createRunManifest('manual');
    incrementCandidateCount(manifest.run_id, 'signals', 10);
    const loaded = loadRunManifest(manifest.run_id);
    expect(loaded!.candidate_counts.signals).toBe(10);

    incrementCandidateCount(manifest.run_id, 'signals', 5);
    const loaded2 = loadRunManifest(manifest.run_id);
    expect(loaded2!.candidate_counts.signals).toBe(15);
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
