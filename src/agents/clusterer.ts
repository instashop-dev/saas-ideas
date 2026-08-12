import { z } from 'zod';
import { callAgent, type AgentCallResult } from './executor.js';
import type { Cluster } from '../schemas/index.js';

const ClusterOutputSchema = z.object({
  clusters: z.array(
    z.object({
      cluster_id: z.string(),
      canonical_jtbd: z.string(),
      target_user: z.string(),
      painful_workflow: z.string(),
      current_workaround: z.string(),
      source_signal_ids: z.array(z.string()),
      source_evidence: z.array(z.unknown()),
      independent_sources: z.number().int().min(0),
      source_type_count: z.number().int().min(0),
      ambiguity_flag: z.boolean(),
      ambiguity_reason: z.string().optional(),
      created_at: z.string(),
    }),
  ),
});

export async function runClusterer(signalsJson: string): Promise<AgentCallResult<Cluster[]>> {
  const userPrompt = `Here are raw pain signals collected from various sources. Cluster them into canonical Jobs-to-be-Done.

RAW SIGNALS:
${signalsJson}

Group similar signals. Deduplicate wording variants. Create canonical JTBD descriptions. Preserve all evidence. Flag ambiguous clusters.

Return an array of clusters.`;

  const result = await callAgent('clusterer', ClusterOutputSchema, userPrompt);
  return {
    data: result.data.clusters as Cluster[],
    metadata: result.metadata,
  };
}
