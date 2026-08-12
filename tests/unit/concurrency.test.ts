import { describe, it, expect } from 'vitest';
import { mapWithConcurrency } from '../../src/lib/concurrency.js';

describe('mapWithConcurrency', () => {
  it('preserves input order in results', async () => {
    const input = [1, 2, 3, 4, 5];
    const results = await mapWithConcurrency(input, 2, async (n) => n * 10);
    expect(results).toEqual([10, 20, 30, 40, 50]);
  });

  it('processes all items even with a limit of 1', async () => {
    const results = await mapWithConcurrency(['a', 'b', 'c'], 1, async (s) => s.toUpperCase());
    expect(results).toEqual(['A', 'B', 'C']);
  });

  it('respects the concurrency limit', async () => {
    let active = 0;
    let peak = 0;
    await mapWithConcurrency([1, 2, 3, 4, 5, 6], 3, async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
    });
    expect(peak).toBe(3);
  });

  it('handles empty input', async () => {
    const results = await mapWithConcurrency([], 4, async () => 1);
    expect(results).toEqual([]);
  });

  it('propagates an item failure (callers wrap fn with try/catch)', async () => {
    // An uncaught item error rejects the whole map; stage CLIs wrap their
    // per-item work in try/catch so this never aborts a stage.
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom');
        return n;
      }),
    ).rejects.toThrow('boom');
  });
});
