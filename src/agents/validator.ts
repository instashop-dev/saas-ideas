import { z } from 'zod';
import { callAgent, type AgentCallResult } from './executor.js';
import type { ValidationResult } from '../schemas/index.js';

const ValidationOutputSchema = z.object({
  scores: z.object({
    pain_intensity: z.number().int().min(1).max(5),
    frequency: z.number().int().min(1).max(5),
    urgency: z.number().int().min(1).max(5),
    economic_impact: z.number().int().min(1).max(5),
    operational_impact: z.number().int().min(1).max(5),
    workaround_intensity: z.number().int().min(1).max(5),
    willingness_to_pay: z.number().int().min(1).max(5),
    global_applicability: z.number().int().min(1).max(5),
    customer_accessibility: z.number().int().min(1).max(5),
    evidence_quality: z.number().int().min(1).max(5),
  }),
  reasoning: z.record(z.string()),
  verified_facts: z.array(z.string()),
  inferences: z.array(z.string()),
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  overall_assessment: z.string(),
});

export async function runValidator(
  clusterJson: string,
): Promise<AgentCallResult<ValidationResult>> {
  const userPrompt = `Here is a pain cluster that needs validation. Your job is to DISPROVE it.

CLUSTER:
${clusterJson}

Score each dimension 1-5 with reasoning tied to specific evidence IDs. Be skeptical.

Return a validation result.`;

  return callAgent('validator', ValidationOutputSchema, userPrompt);
}
