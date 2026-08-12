import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch for OpenRouter calls
const mockFetch = vi.fn();

vi.stubGlobal('fetch', mockFetch);

describe('OpenRouter Provider (mocked)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['OPENROUTER_API_KEY'] = 'sk-test-key-12345678';
  });

  it('handles successful JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"result": "success"}' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        model: 'test-model',
      }),
    });

    const { callOpenRouter } = await import('../../src/openrouter/provider.js');
    const result = await callOpenRouter({
      model: 'test-model',
      systemPrompt: 'System prompt',
      userPrompt: 'User prompt',
    });

    expect(result.content).toBe('{"result": "success"}');
    expect(result.model).toBe('test-model');
    expect(result.usage).not.toBeNull();
  });

  it('throws on HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limited',
    });

    const { callOpenRouter } = await import('../../src/openrouter/provider.js');
    await expect(
      callOpenRouter({ model: 'test-model', systemPrompt: 'S', userPrompt: 'U' }),
    ).rejects.toThrow('429');
  });

  it('throws if API key is not set', async () => {
    delete process.env['OPENROUTER_API_KEY'];

    const { callOpenRouter } = await import('../../src/openrouter/provider.js');
    await expect(
      callOpenRouter({ model: 'test-model', systemPrompt: 'S', userPrompt: 'U' }),
    ).rejects.toThrow('OPENROUTER_API_KEY');
  });

  it('handles malformed JSON in response gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'not json at all' } }],
        usage: null,
        model: 'test-model',
      }),
    });

    const { callOpenRouter } = await import('../../src/openrouter/provider.js');
    const result = await callOpenRouter({
      model: 'test-model',
      systemPrompt: 'S',
      userPrompt: 'U',
    });

    // Should not crash — raw content returned
    expect(result.content).toBe('not json at all');
  });
});

describe('callWithRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['OPENROUTER_API_KEY'] = 'sk-test-key-12345678';
  });

  it('retries on failure and succeeds eventually', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok": true}' } }],
        usage: null,
        model: 'test-model',
      }),
    });

    const { callWithRetry } = await import('../../src/openrouter/provider.js');
    const result = await callWithRetry(
      { model: 'test-model', systemPrompt: 'S', userPrompt: 'U' },
      3,
    );

    expect(result.content).toBe('{"ok": true}');
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('throws after all retries exhausted', async () => {
    mockFetch.mockRejectedValue(new Error('Persistent error'));

    const { callWithRetry } = await import('../../src/openrouter/provider.js');
    await expect(
      callWithRetry({ model: 'test-model', systemPrompt: 'S', userPrompt: 'U' }, 2),
    ).rejects.toThrow('All retries exhausted');
  });
});
