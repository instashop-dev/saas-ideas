export interface OpenRouterCallOptions {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  responseFormat?: {
    type: 'json_object';
    schema?: object;
  };
}

export interface OpenRouterUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  cost_usd: number | null;
}

export interface OpenRouterCallResult {
  content: string;
  usage: OpenRouterUsage | null;
  durationMs: number;
  model: string;
}

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  pricing: {
    prompt: string;
    completion: string;
  };
  context_length: number;
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

function getApiKey(): string {
  const key = process.env['OPENROUTER_API_KEY'];
  if (!key) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }
  return key;
}

export async function callOpenRouter(
  options: OpenRouterCallOptions,
  attempt: number = 1,
): Promise<OpenRouterCallResult> {
  const apiKey = getApiKey();
  const startTime = Date.now();

  const body: Record<string, unknown> = {
    model: options.model,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userPrompt },
    ],
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 4096,
  };

  if (options.responseFormat) {
    body['response_format'] = options.responseFormat;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 180_000);

  try {
    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/saas-ideas',
        'X-Title': 'SaaS Ideas Discovery Engine',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`OpenRouter HTTP ${response.status}: ${errorText}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
      model: string;
    };

    const content = data.choices[0]?.message?.content ?? '';
    const durationMs = Date.now() - startTime;

    let cost_usd: number | null = null;
    if (data.usage) {
      // OpenRouter passes pricing info in the response when available
      cost_usd = estimateCost(
        options.model,
        data.usage.prompt_tokens,
        data.usage.completion_tokens,
      );
    }

    return {
      content,
      usage: data.usage
        ? {
            prompt_tokens: data.usage.prompt_tokens,
            completion_tokens: data.usage.completion_tokens,
            total_tokens: data.usage.total_tokens,
            cost_usd,
          }
        : null,
      durationMs,
      model: data.model || options.model,
    };
  } catch (err) {
    const durationMs = Date.now() - startTime;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        `OpenRouter call to ${options.model} timed out after ${durationMs}ms (attempt ${attempt})`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

function estimateCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number | null {
  const pricing: Record<string, { prompt: number; completion: number }> = {
    'anthropic/claude-3.5-sonnet': { prompt: 3.0, completion: 15.0 },
    'anthropic/claude-3-opus': { prompt: 15.0, completion: 75.0 },
    'anthropic/claude-3-sonnet': { prompt: 3.0, completion: 15.0 },
    'anthropic/claude-3-haiku': { prompt: 0.25, completion: 1.25 },
    'openai/gpt-4o': { prompt: 5.0, completion: 15.0 },
    'openai/gpt-4o-mini': { prompt: 0.15, completion: 0.6 },
    'openai/gpt-4-turbo': { prompt: 10.0, completion: 30.0 },
    'google/gemini-2.0-flash-001': { prompt: 0.1, completion: 0.4 },
    'google/gemini-1.5-pro': { prompt: 2.5, completion: 10.0 },
    'google/gemini-1.5-flash': { prompt: 0.075, completion: 0.3 },
    'meta-llama/llama-3.1-405b-instruct': { prompt: 2.0, completion: 2.0 },
    'meta-llama/llama-3.1-70b-instruct': { prompt: 0.35, completion: 0.4 },
    // User-selected models
    'moonshotai/kimi-k3': { prompt: 3.0, completion: 15.0 },
    'deepseek/deepseek-v4-pro': { prompt: 1.168, completion: 2.336 },
    'deepseek/deepseek-v4-flash': { prompt: 0.14, completion: 0.28 },
    'z-ai/glm-5.2': { prompt: 0.5, completion: 3.15 },
    'qwen/qwen3.7-flash': { prompt: 0.03, completion: 0.13 },
  };

  const p = pricing[model];
  if (!p) return null;

  return (promptTokens / 1_000_000) * p.prompt + (completionTokens / 1_000_000) * p.completion;
}

export async function callWithRetry(
  options: OpenRouterCallOptions,
  maxRetries: number = 3,
): Promise<OpenRouterCallResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callOpenRouter(options, attempt);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 30_000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(
    `All retries exhausted (${maxRetries} attempts). Last error: ${lastError?.message ?? 'unknown'}`,
  );
}

export async function callWithFallback(
  options: Omit<OpenRouterCallOptions, 'model'>,
  primaryModel: string,
  fallbackModels: string[],
  maxRetriesPerModel: number = 3,
): Promise<OpenRouterCallResult> {
  const models = [primaryModel, ...fallbackModels];
  let lastError: Error | null = null;

  for (const model of models) {
    try {
      return await callWithRetry({ ...options, model }, maxRetriesPerModel);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError ?? new Error('All models and retries exhausted');
}

export async function fetchModelInfo(model: string): Promise<OpenRouterModelInfo | null> {
  const apiKey = getApiKey();
  try {
    const response = await fetch(`${OPENROUTER_BASE}/models/${model}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as {
      data: {
        id: string;
        name: string;
        pricing: { prompt: string; completion: string };
        context_length: number;
      };
    };
    return {
      id: data.data.id,
      name: data.data.name,
      pricing: {
        prompt: data.data.pricing.prompt,
        completion: data.data.pricing.completion,
      },
      context_length: data.data.context_length,
    };
  } catch {
    return null;
  }
}
