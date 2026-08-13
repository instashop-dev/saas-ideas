import { z } from 'zod';

export const ModelConfigSchema = z.object({
  primary: z.string(),
  fallbacks: z.array(z.string()).default([]),
});

export const ModelsConfigSchema = z.object({
  pain_miner: ModelConfigSchema,
  research_planner: ModelConfigSchema,
  clusterer: ModelConfigSchema,
  validator: ModelConfigSchema,
  competition: ModelConfigSchema,
  bull: ModelConfigSchema,
  bear: ModelConfigSchema,
  customer: ModelConfigSchema,
  judge: ModelConfigSchema,
});

export const ResearchConfigSchema = z.object({
  max_signals_per_worker: z.number().int().min(1).default(30),
  max_clusters_per_run: z.number().int().min(1).default(50),
  max_candidates_after_validation: z.number().int().min(1).default(20),
  max_candidates_after_competition: z.number().int().min(1).default(10),
  max_finalists: z.number().int().min(1).default(10),
});

export const ParallelismConfigSchema = z.object({
  pain_miners: z.number().int().min(1).default(4),
  validators: z.number().int().min(1).default(5),
  competition: z.number().int().min(1).default(5),
  debate: z.number().int().min(1).default(9),
});

export const GatesConfigSchema = z.object({
  min_independent_sources: z.number().int().min(1).default(3),
  min_pain_score: z.number().int().min(1).max(5).default(4),
  min_frequency_score: z.number().int().min(1).max(5).default(3),
  min_wtp_score: z.number().int().min(1).max(5).default(3),
  min_global_score: z.number().int().min(1).max(5).default(4),
  max_competition_score: z.number().int().min(1).max(5).default(2),
  min_evidence_quality: z.number().int().min(1).max(5).default(3),
});

export const LLMConfigSchema = z.object({
  temperature: z.number().min(0).max(2).default(0.2),
  timeout_seconds: z.number().int().min(1).default(180),
  max_retries: z.number().int().min(1).default(3),
  max_tokens: z.number().int().min(256).max(16384).default(8192),
});

export const BudgetConfigSchema = z.object({
  max_cost_per_run_usd: z.number().nullable().default(null),
});

export const ScheduleConfigSchema = z.object({
  enabled: z.boolean().default(true),
  cron: z.string().default('0 0 * * 0'),
});

export const AppConfigSchema = z.object({
  models: ModelsConfigSchema,
  research: ResearchConfigSchema,
  parallelism: ParallelismConfigSchema,
  gates: GatesConfigSchema,
  llm: LLMConfigSchema,
  budget: BudgetConfigSchema,
  schedule: ScheduleConfigSchema,
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
