import { z } from 'zod';
import { callAgent, type AgentCallResult } from './executor.js';
import type { ResearchPlanSource } from '../schemas/index.js';

const ResearchPlanOutputSchema = z.object({
  sources: z
    .array(
      z.object({
        ecosystem: z.string().min(1),
        research_questions: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1),
  rationale: z.string().optional(),
});

export interface ResearchPlanResult {
  sources: ResearchPlanSource[];
  rationale?: string;
}

/**
 * Ask the research_planner agent to decide, in real time from the keyword (or a
 * broad instruction when no keyword is given), which sources to search and the
 * per-source research questions. No hardcoded catalog is used.
 */
export async function runResearchPlanner(
  keyword: string | null,
): Promise<AgentCallResult<ResearchPlanResult>> {
  const focus = keyword
    ? `Research keyword: ${keyword}`
    : `No specific keyword — perform broad operational pain discovery across industries.`;

  const userPrompt = `PLAN RESEARCH SOURCES

${focus}

Choose the online sources (e.g. communities, forums, Q&A sites, job boards, review sites, code hosts) where people most likely discuss operational pain${keyword ? ` related to "${keyword}"` : ''}. Pick real, searchable source names from your own knowledge — do not reuse a fixed list.

For each source, write 2-5 focused research questions to guide pain-signal discovery.`;

  const result = await callAgent(
    'research_planner',
    ResearchPlanOutputSchema,
    userPrompt,
    undefined,
    (data) => data.sources.length > 0,
  );

  return {
    data: { sources: result.data.sources, rationale: result.data.rationale },
    metadata: result.metadata,
  };
}

/**
 * Normalize a planner's output.
 *
 * - Trims and dedupes source names case-insensitively (first occurrence wins).
 * - Drops empty source names and sources whose questions are all blank.
 * - Returns `null` when nothing survives.
 */
export function resolvePlan(planned: ResearchPlanResult): ResearchPlanSource[] | null {
  const seen = new Set<string>();
  const resolved: ResearchPlanSource[] = [];

  for (const source of planned.sources) {
    const name = source.ecosystem.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;

    const questions = source.research_questions
      .map((q) => q.trim())
      .filter((q) => q.length > 0);
    if (questions.length === 0) continue;

    seen.add(key);
    resolved.push({ ecosystem: name, research_questions: questions });
  }

  return resolved.length > 0 ? resolved : null;
}
