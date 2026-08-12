import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { callWithRetry, type OpenRouterCallResult } from '../openrouter/provider.js';
import { getConfig } from '../state/config.js';
import { z } from 'zod';

const __dirname = dirname(fileURLToPath(import.meta.url));
const AGENTS_DIR = resolve(__dirname, '..', '..', 'agents');

function loadPrompt(agentName: string): string {
  const path = resolve(AGENTS_DIR, `${agentName}.md`);
  return readFileSync(path, 'utf-8');
}

export interface AgentCallResult<T> {
  data: T;
  metadata: {
    model: string;
    usage: OpenRouterCallResult['usage'];
    durationMs: number;
  };
}

/**
 * Extract the JSON object from a model response and parse it.
 *
 * Models frequently truncate long responses mid-array. When the plain parse
 * fails, repair the truncated payload by closing the outermost array/object so
 * the complete prefix is recovered (e.g. '{"clusters": [{...},{...}' -> append ']}').
 * The resulting prefix is still schema-validated downstream, so malformed data
 * cannot slip through.
 */
export function parseAgentJson(content: string): unknown {
  const match = content.match(/\{[\s\S]*\}/);
  const candidate = match ? match[0] : content;

  try {
    return JSON.parse(candidate);
  } catch {
    // Truncation repair: try closing the outermost array and/or object.
    for (const suffix of [']}', '}]', '}']) {
      try {
        return JSON.parse(candidate + suffix);
      } catch {
        // keep trying
      }
    }
  }

  throw new Error('invalid JSON in model response');
}

async function callAgent<T>(
  agentName: string,
  schema: z.ZodType<T>,
  userPrompt: string,
  responseSchema?: object,
  isAcceptable?: (data: T) => boolean,
): Promise<AgentCallResult<T>> {
  const config = getConfig();
  const modelsConfig = config.models[agentName as keyof typeof config.models];
  if (!modelsConfig) {
    throw new Error(`No model config for agent: ${agentName}`);
  }

  const systemPrompt = loadPrompt(agentName);
  const models = [modelsConfig.primary, ...modelsConfig.fallbacks];
  const baseOptions = {
    systemPrompt,
    userPrompt,
    temperature: config.llm.temperature,
    timeoutMs: config.llm.timeout_seconds * 1000,
    maxTokens: config.llm.max_tokens,
    responseFormat: responseSchema
      ? { type: 'json_object' as const, schema: responseSchema }
      : { type: 'json_object' as const },
  };

  let lastError: Error | null = null;

  // Try each model in order (primary first, then fallbacks). Transport failures,
  // invalid JSON, schema-validation failures, and unusable (e.g. empty) output all
  // advance to the next model, so one bad response doesn't kill the stage.
  for (const model of models) {
    try {
      const result = await callWithRetry({ ...baseOptions, model }, config.llm.max_retries);

      // Parse and validate the structured output
      let parsed: unknown;
      try {
        parsed = parseAgentJson(result.content);
      } catch {
        throw new Error(
          `Agent ${agentName} returned invalid JSON from model ${result.model}. Content: ${result.content.slice(0, 500)}`,
        );
      }

      const validated = schema.safeParse(parsed);
      if (!validated.success) {
        throw new Error(
          `Agent ${agentName} returned data that failed schema validation (model ${result.model}): ${validated.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`,
        );
      }

      if (isAcceptable && !isAcceptable(validated.data)) {
        throw new Error(
          `Agent ${agentName} returned unusable (empty) output from model ${result.model}`,
        );
      }

      return {
        data: validated.data,
        metadata: {
          model: result.model,
          usage: result.usage,
          durationMs: result.durationMs,
        },
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (model !== models[models.length - 1]) {
        console.error(
          `    [executor] ${agentName} failed with ${model}: ${lastError.message} — trying fallback model...`,
        );
      }
    }
  }

  throw lastError ?? new Error(`All models exhausted for agent ${agentName}`);
}

export { loadPrompt, callAgent };
