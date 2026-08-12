/**
 * Map an array with bounded concurrency, preserving input order in the results.
 *
 * Used by the stage CLIs to honor the parallelism.* settings in config.yaml
 * (pain_miners, validators, competition, debate), which were previously ignored
 * — stages ran sequentially and routinely exceeded workflow timeouts.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    let i = next++;
    while (i < items.length) {
      results[i] = await fn(items[i]!, i);
      i = next++;
    }
  });
  await Promise.all(workers);
  return results;
}
