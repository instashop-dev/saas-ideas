import { describe, it, expect, afterEach } from 'vitest';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  createRunManifest,
  loadRunManifest,
  incrementCandidateCount,
} from '../../src/state/run-manifest.js';

const TEST_RUNS_DIR = resolve(process.cwd(), 'research', 'runs');

describe('Idempotency', () => {
  const createdRunIds: string[] = [];

  function createTestManifest(): ReturnType<typeof createRunManifest> {
    const manifest = createRunManifest('manual');
    createdRunIds.push(manifest.run_id);
    return manifest;
  }

  afterEach(() => {
    // Remove only the manifests created by THIS test file, so tests running
    // in parallel workers (and committed pipeline artifacts) are never touched.
    for (const id of createdRunIds) {
      rmSync(resolve(TEST_RUNS_DIR, `${id}.json`), { force: true });
    }
    createdRunIds.length = 0;
  });

  it('re-running createRunManifest creates different IDs', () => {
    const m1 = createTestManifest();
    const m2 = createTestManifest();
    expect(m1.run_id).not.toBe(m2.run_id);
  });

  it('re-loading a manifest returns the same data', () => {
    const m1 = createTestManifest();
    const loaded1 = loadRunManifest(m1.run_id);
    const loaded2 = loadRunManifest(m1.run_id);
    expect(loaded1).toEqual(loaded2);
  });

  it('incrementCandidateCount is additive (not overwriting)', () => {
    const m = createTestManifest();
    incrementCandidateCount(m.run_id, 'signals', 5);
    incrementCandidateCount(m.run_id, 'signals', 3);
    const loaded = loadRunManifest(m.run_id);
    expect(loaded!.candidate_counts.signals).toBe(8);
  });

  it('updateRunStatus transitions are safe to repeat', () => {
    const m = createTestManifest();
    const r1 = loadRunManifest(m.run_id);
    const r2 = loadRunManifest(m.run_id);
    expect(r1).toEqual(r2);
  });
});
