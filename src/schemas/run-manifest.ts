import { z } from 'zod';

export const RunStatusSchema = z.enum([
  'created',
  'pain_mining',
  'clustering',
  'validating',
  'competition_checking',
  'debating',
  'judging',
  'completed',
  'failed',
  'cancelled',
]);

export const RunCandidateCountsSchema = z.object({
  signals: z.number().int().min(0).default(0),
  clusters: z.number().int().min(0).default(0),
  validated: z.number().int().min(0).default(0),
  competition_survivors: z.number().int().min(0).default(0),
  finalists: z.number().int().min(0).default(0),
  approved: z.number().int().min(0).default(0),
});

export const RunManifestSchema = z.object({
  run_id: z.string(),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  trigger: z.enum(['manual', 'scheduled', 'retry']),
  config_snapshot: z.record(z.unknown()).optional(),
  models: z.record(z.string()),
  candidate_counts: RunCandidateCountsSchema,
  estimated_cost: z.number().nullable(),
  status: RunStatusSchema,
});

export type RunStatus = z.infer<typeof RunStatusSchema>;
export type RunCandidateCounts = z.infer<typeof RunCandidateCountsSchema>;
export type RunManifest = z.infer<typeof RunManifestSchema>;
