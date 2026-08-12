import { z } from 'zod';
import { callAgent, type AgentCallResult } from './executor.js';
import type { JudgeResult } from '../schemas/index.js';

const JudgeOutputSchema = z.object({
  verdict: z.enum(['APPROVE', 'REJECT', 'NEEDS_MORE_EVIDENCE']),
  strongest_reason: z.string(),
  strongest_risk: z.string(),
  unresolved_assumption: z.string(),
  confidence: z.number().min(0).max(1),
  recommended_next_step: z.string(),
});

export async function runJudge(fullCaseFileJson: string): Promise<AgentCallResult<JudgeResult>> {
  const userPrompt = `Here is the complete case file for a SaaS opportunity. Render your final verdict.

FULL CASE FILE:
${fullCaseFileJson}

Weigh all evidence. Consider all arguments (Bull, Bear, Customer). You cannot override deterministic gates.

Return APPROVE, REJECT, or NEEDS_MORE_EVIDENCE.`;

  return callAgent('judge', JudgeOutputSchema, userPrompt);
}
