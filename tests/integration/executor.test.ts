import { describe, it, expect, vi, beforeAll } from 'vitest';

/**
 * Executor fallback behavior: when a model returns well-formed JSON that fails
 * schema validation (or invalid JSON), the executor must advance to the next
 * configured fallback model instead of failing the whole stage.
 */

const validJudge = {
  verdict: 'APPROVE',
  strongest_reason: 'Clear recurring pain with manual workaround.',
  strongest_risk: 'Distribution is hard.',
  unresolved_assumption: 'WTP at scale.',
  confidence: 0.8,
  recommended_next_step: 'Interview 10 users.',
};

vi.mock('../../src/openrouter/provider.js', () => ({
  callWithRetry: vi.fn(),
  callWithFallback: vi.fn(),
  callOpenRouter: vi.fn(),
  fetchModelInfo: vi.fn(),
}));

describe('Executor model fallback on invalid output', () => {
  beforeAll(() => {
    process.env['OPENROUTER_API_KEY'] = 'sk-test-executor';
  });

  it('repairs truncated JSON responses (mid-array)', async () => {
    // Simulates a model response cut off before the closing brackets.
    const { parseAgentJson } = await import('../../src/agents/executor.js');

    const truncated = '{"clusters": [{"cluster_id": "CL-1"}, {"cluster_id": "CL-2"}';
    const repaired = parseAgentJson(truncated) as { clusters: Array<{ cluster_id: string }> };
    expect(repaired.clusters).toHaveLength(2);
    expect(repaired.clusters[1]!.cluster_id).toBe('CL-2');

    // Nested object truncation variant.
    const truncated2 = '{"signals": [{"signal_id": "SIG-1"}], "evidence": [{"source_id": "SRC-1"}';
    const repaired2 = parseAgentJson(truncated2) as {
      signals: Array<{ signal_id: string }>;
      evidence: Array<{ source_id: string }>;
    };
    expect(repaired2.signals).toHaveLength(1);
    expect(repaired2.evidence).toHaveLength(1);

    // Garbage that cannot be repaired still throws.
    expect(() => parseAgentJson('{not json at all')).toThrow(/invalid JSON/);
  });

  it('falls back to the next model when the primary returns schema-invalid JSON', async () => {
    const { callWithRetry } = await import('../../src/openrouter/provider.js');
    const mocked = callWithRetry as unknown as { mockResolvedValueOnce: (v: unknown) => void };

    mocked.mockResolvedValueOnce({
      content: JSON.stringify({ verdict: 'BOGUS', confidence: 9 }),
      usage: null,
      durationMs: 5,
      model: 'mock/primary',
    });
    mocked.mockResolvedValueOnce({
      content: JSON.stringify(validJudge),
      usage: null,
      durationMs: 5,
      model: 'mock/fallback',
    });

    const { callAgent } = await import('../../src/agents/executor.js');
    const { JudgeResultSchema } = await import('../../src/schemas/index.js');

    const result = await callAgent('judge', JudgeResultSchema, 'Render your final verdict.');
    expect(result.data.verdict).toBe('APPROVE');
    expect(result.metadata.model).toBe('mock/fallback');
    expect(mocked).toHaveBeenCalledTimes(2);
  });

  it('throws a clear error when every model returns schema-invalid output', async () => {
    const { callWithRetry } = await import('../../src/openrouter/provider.js');
    const mocked = callWithRetry as unknown as { mockResolvedValueOnce: (v: unknown) => void };

    mocked.mockResolvedValueOnce({
      content: JSON.stringify({ verdict: 'BOGUS' }),
      usage: null,
      durationMs: 5,
      model: 'mock/primary',
    });
    mocked.mockResolvedValueOnce({
      content: JSON.stringify({ verdict: 'ALSO_BOGUS' }),
      usage: null,
      durationMs: 5,
      model: 'mock/fallback',
    });

    const { callAgent } = await import('../../src/agents/executor.js');
    const { JudgeResultSchema } = await import('../../src/schemas/index.js');

    await expect(
      callAgent('judge', JudgeResultSchema, 'Render your final verdict.'),
    ).rejects.toThrow(/schema validation/);
  });
});
