import { z } from 'zod';
import { callAgent, type AgentCallResult } from './executor.js';
import type { EvidenceItem, RawSignal } from '../schemas/index.js';

const PainMineOutputSchema = z.object({
  // Tolerant by design: a model that omits one key (e.g. no top-level evidence array)
  // must not zero out the entire run. Downstream deterministic gates still reject
  // clusters that lack evidence, so this cannot mask weak output.
  signals: z
    .array(
      z.object({
        signal_id: z.string(),
        source_ids: z.array(z.string()),
        target_role: z.string(),
        workflow: z.string(),
        trigger: z.string(),
        frequency: z.string(),
        current_workaround: z.string(),
        consequence: z.string(),
        ecosystem: z.string(),
        source_type: z.enum([
          'forum',
          'github',
          'review',
          'job',
          'marketplace',
          'documentation',
          'search',
          'other',
        ]),
        collected_at: z.string(),
      }),
    )
    .optional(),
  evidence: z
    .array(
      z.object({
        source_id: z.string(),
        url: z.string(),
        source_type: z.enum([
          'forum',
          'github',
          'review',
          'job',
          'marketplace',
          'documentation',
          'search',
          'other',
        ]),
        publisher_or_site: z.string(),
        date_published: z.string().nullable(),
        date_accessed: z.string(),
        claim: z.string(),
        paraphrased_evidence: z.string(),
        evidence_strength: z.number().int().min(1).max(5),
        independence_group: z.string(),
      }),
    )
    .optional(),
});

export interface PainMineResult {
  signals: RawSignal[];
  evidence: EvidenceItem[];
}

/**
 * Normalize an agent response into a complete PainMineResult, applying
 * defaults for keys a model may have omitted.
 */
function normalizePainMineOutput(raw: {
  signals?: RawSignal[];
  evidence?: EvidenceItem[];
}): PainMineResult {
  return {
    signals: raw.signals ?? [],
    evidence: raw.evidence ?? [],
  };
}

export async function runPainMiner(
  ecosystem: string,
  context: string,
): Promise<AgentCallResult<PainMineResult>> {
  const userPrompt = `Ecosystem: ${ecosystem}

Search Context: ${context}

Find real, recurring operational pain signals in this ecosystem. Focus on manual workflows, spreadsheets, reconciliation, integration gaps, and repetitive operational tasks.

Return an array of raw signals with associated evidence items. Each signal must have at least one evidence item.`;

  const result = await callAgent(
    'pain_miner',
    PainMineOutputSchema,
    userPrompt,
    undefined,
    // An all-empty response is unusable: treat it as a model failure so the
    // fallback models get a chance to produce real signals.
    (data) => (data.signals?.length ?? 0) > 0 || (data.evidence?.length ?? 0) > 0,
  );
  return {
    data: normalizePainMineOutput(result.data),
    metadata: result.metadata,
  };
}

export async function runPainMinerWithData(
  searchResults: string,
): Promise<AgentCallResult<PainMineResult>> {
  const userPrompt = `Here are search results and web content from multiple sources. Analyze them for pain signals.

SEARCH RESULTS:
${searchResults}

Find real, recurring operational pain signals. Return an array of raw signals with associated evidence items.`;

  const result = await callAgent(
    'pain_miner',
    PainMineOutputSchema,
    userPrompt,
    undefined,
    (data) => (data.signals?.length ?? 0) > 0 || (data.evidence?.length ?? 0) > 0,
  );
  return {
    data: normalizePainMineOutput(result.data),
    metadata: result.metadata,
  };
}
