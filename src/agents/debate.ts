import { z } from 'zod';
import { callAgent, type AgentCallResult } from './executor.js';
import type { DebateResult } from '../schemas/index.js';

const DebateOutputSchema = z.object({
  position: z.enum(['BULL', 'BEAR', 'CUSTOMER']),
  summary: z.string(),
  strongest_points: z.array(z.string()),
  weaknesses: z.array(z.string()),
  evidence_cited: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export async function runBull(caseFileJson: string): Promise<AgentCallResult<DebateResult>> {
  const userPrompt = `Here is a SaaS opportunity case file. Build the strongest BULL case.

CASE FILE:
${caseFileJson}

Argue FOR this opportunity. Every claim must reference evidence IDs. Be honest about weaknesses.

Return a debate result with position BULL.`;

  return callAgent('bull', DebateOutputSchema, userPrompt);
}

export async function runBear(caseFileJson: string): Promise<AgentCallResult<DebateResult>> {
  const userPrompt = `Here is a SaaS opportunity case file. Build the strongest BEAR case.

CASE FILE:
${caseFileJson}

Attempt to KILL this opportunity. Find every risk, hidden competition, and weakness.

Return a debate result with position BEAR.`;

  return callAgent('bear', DebateOutputSchema, userPrompt);
}

export async function runCustomer(caseFileJson: string): Promise<AgentCallResult<DebateResult>> {
  const userPrompt = `Here is a SaaS opportunity case file. Act as the target BUYER.

CASE FILE:
${caseFileJson}

Would you buy this? Be honest. Clearly label simulated judgments.

Return a debate result with position CUSTOMER.`;

  return callAgent('customer', DebateOutputSchema, userPrompt);
}
