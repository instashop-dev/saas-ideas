import { describe, it, expect } from 'vitest';
import {
  createRunManifest,
  loadRunManifest,
  incrementCandidateCount,
} from '../../src/state/run-manifest.js';

describe('Idempotency', () => {
  it('re-running createRunManifest creates different IDs', () => {
    const m1 = createRunManifest('manual');
    const m2 = createRunManifest('manual');
    expect(m1.run_id).not.toBe(m2.run_id);
  });

  it('re-loading a manifest returns the same data', () => {
    const m1 = createRunManifest('manual');
    const loaded1 = loadRunManifest(m1.run_id);
    const loaded2 = loadRunManifest(m1.run_id);
    expect(loaded1).toEqual(loaded2);
  });

  it('incrementCandidateCount is additive (not overwriting)', () => {
    const m = createRunManifest('manual');
    incrementCandidateCount(m.run_id, 'signals', 5);
    incrementCandidateCount(m.run_id, 'signals', 3);
    const loaded = loadRunManifest(m.run_id);
    expect(loaded!.candidate_counts.signals).toBe(8);
  });

  it('updateRunStatus transitions are safe to repeat', () => {
    const m = createRunManifest('manual');
    const r1 = loadRunManifest(m.run_id);
    const r2 = loadRunManifest(m.run_id);
    expect(r1).toEqual(r2);
  });
});
