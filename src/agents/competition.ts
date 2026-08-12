import { z } from 'zod';
import { callAgent, type AgentCallResult } from './executor.js';
import type { CompetitionResult } from '../schemas/index.js';

const CompetitionOutputSchema = z.object({
  competition_score: z.number().int().min(1).max(5),
  queries_attempted: z.array(z.string()),
  competitors: z.array(
    z.object({
      name: z.string(),
      url: z.string().optional(),
      classification: z.enum([
        'DIRECT',
        'PARTIAL',
        'SUBSTITUTE',
        'PLATFORM_NATIVE',
        'OPEN_SOURCE',
        'SERVICE',
      ]),
      notes: z.string(),
      feature_overlap: z.string(),
      pricing: z.string().optional(),
      market_positioning: z.string(),
    }),
  ),
  substitutes: z.array(z.unknown()),
  summary: z.string(),
  research_evidence_urls: z.array(z.string()),
});

export async function runCompetitionResearcher(
  clusterJson: string,
): Promise<AgentCallResult<CompetitionResult>> {
  const userPrompt = `Here is a SaaS opportunity to investigate for competition. Your job is to be an OPPORTUNITY ASSASSIN.

OPPORTUNITY:
${clusterJson}

Search for all forms of competition. Try multiple query formulations. Classify each competitor found. Score the competitive landscape.

Return a competition research result. Score 1 or 2 requires affirmative research evidence.`;

  const result = await callAgent('competition', CompetitionOutputSchema, userPrompt);
  return {
    data: result.data as CompetitionResult,
    metadata: result.metadata,
  };
}
