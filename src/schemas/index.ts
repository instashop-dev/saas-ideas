import { z } from 'zod';

export const SourceTypeSchema = z.enum([
  'forum',
  'github',
  'review',
  'job',
  'marketplace',
  'documentation',
  'search',
  'other',
]);

export const EvidenceItemSchema = z.object({
  source_id: z.string().regex(/^SRC-/),
  url: z.string().url(),
  source_type: SourceTypeSchema,
  publisher_or_site: z.string(),
  date_published: z.string().nullable(),
  date_accessed: z.string(),
  claim: z.string().min(1),
  paraphrased_evidence: z.string().min(1),
  evidence_strength: z.number().int().min(1).max(5),
  independence_group: z.string(),
});

export const EvidenceBundleSchema = z.object({
  items: z.array(EvidenceItemSchema),
  independent_sources: z.number().int().min(0),
  source_type_count: z.number().int().min(0),
});

export const CompetitorSchema = z.object({
  name: z.string(),
  url: z.string().url().optional(),
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
});

export const CompetitionResultSchema = z.object({
  competition_score: z.number().int().min(1).max(5),
  queries_attempted: z.array(z.string()),
  competitors: z.array(CompetitorSchema),
  substitutes: z.array(CompetitorSchema),
  summary: z.string(),
  research_evidence_urls: z.array(z.string().url()),
});

export const RawSignalSchema = z.object({
  signal_id: z.string(),
  source_ids: z.array(z.string()),
  target_role: z.string(),
  workflow: z.string(),
  trigger: z.string(),
  frequency: z.string(),
  current_workaround: z.string(),
  consequence: z.string(),
  ecosystem: z.string(),
  source_type: SourceTypeSchema,
  collected_at: z.string(),
});

export const ClusterSchema = z.object({
  cluster_id: z.string(),
  canonical_jtbd: z.string(),
  target_user: z.string(),
  painful_workflow: z.string(),
  current_workaround: z.string(),
  source_signal_ids: z.array(z.string()),
  source_evidence: z.array(EvidenceItemSchema),
  independent_sources: z.number().int().min(0),
  source_type_count: z.number().int().min(0),
  ambiguity_flag: z.boolean(),
  ambiguity_reason: z.string().optional(),
  created_at: z.string(),
});

export const ValidationScoresSchema = z.object({
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
});

export const ValidationResultSchema = z.object({
  scores: ValidationScoresSchema,
  reasoning: z.record(z.string()),
  verified_facts: z.array(z.string()),
  inferences: z.array(z.string()),
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  overall_assessment: z.string(),
});

export const DebateResultSchema = z.object({
  position: z.enum(['BULL', 'BEAR', 'CUSTOMER']),
  summary: z.string(),
  strongest_points: z.array(z.string()),
  weaknesses: z.array(z.string()),
  evidence_cited: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

export const VerdictSchema = z.enum(['APPROVE', 'REJECT', 'NEEDS_MORE_EVIDENCE']);

export const JudgeResultSchema = z.object({
  verdict: VerdictSchema,
  strongest_reason: z.string(),
  strongest_risk: z.string(),
  unresolved_assumption: z.string(),
  confidence: z.number().min(0).max(1),
  recommended_next_step: z.string(),
});

export const OpportunityStatusSchema = z.enum([
  'NEW',
  'DUPLICATE',
  'POSSIBLE_DUPLICATE',
  'MINED',
  'CLUSTERED',
  'VALIDATED',
  'COMPETITION_CHECKED',
  'DEBATED',
  'JUDGED',
  'APPROVED',
  'REJECTED',
  'NEEDS_MORE_EVIDENCE',
]);

export const StageSchema = z.enum([
  'discovery',
  'pain_mining',
  'clustering',
  'validation',
  'competition',
  'debate',
  'judge',
  'complete',
]);

export const ProductConceptSchema = z.object({
  product_concept: z.string(),
  narrow_icp: z.string(),
  core_jtbd: z.string(),
  smallest_useful_mvp: z.string(),
  excluded_features: z.array(z.string()),
  pricing_hypothesis: z.string(),
  distribution_wedge: z.string(),
  integration_dependencies: z.array(z.string()),
  defensibility_hypothesis: z.string(),
  key_validation_experiment: z.string(),
});

export const OpportunitySchema = z.object({
  id: z.string().regex(/^OP-\d{4}$/),
  canonical_key: z.string(),
  title: z.string(),
  target_user: z.string(),
  job_to_be_done: z.string(),
  painful_workflow: z.string(),
  current_workaround: z.string(),
  source_ids: z.array(z.string()),
  independent_sources: z.number().int().min(0),
  source_type_count: z.number().int().min(0),

  pain_score: z.number().int().min(1).max(5),
  frequency_score: z.number().int().min(1).max(5),
  urgency_score: z.number().int().min(1).max(5),
  economic_impact_score: z.number().int().min(1).max(5),
  operational_impact_score: z.number().int().min(1).max(5),
  workaround_intensity_score: z.number().int().min(1).max(5),
  willingness_to_pay_score: z.number().int().min(1).max(5),
  distribution_score: z.number().int().min(1).max(5),
  global_score: z.number().int().min(1).max(5),
  mvp_complexity_score: z.number().int().min(1).max(5),
  evidence_quality_score: z.number().int().min(1).max(5),

  competition_score: z.number().int().min(1).max(5),
  competitors: z.array(CompetitorSchema),
  substitutes: z.array(CompetitorSchema),

  verified_facts: z.array(z.string()),
  inferences: z.array(z.string()),
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  rejection_reasons: z.array(z.string()),

  judge_verdict: z.string().default(''),
  confidence: z.number().min(0).max(1).default(0),
  final_score: z.number().default(0),

  run_id: z.string(),
  stage: StageSchema,
  status: OpportunityStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),

  product_concept: ProductConceptSchema.optional(),
});

export type SourceType = z.infer<typeof SourceTypeSchema>;
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;
export type EvidenceBundle = z.infer<typeof EvidenceBundleSchema>;
export type Competitor = z.infer<typeof CompetitorSchema>;
export type CompetitionResult = z.infer<typeof CompetitionResultSchema>;
export type RawSignal = z.infer<typeof RawSignalSchema>;
export type Cluster = z.infer<typeof ClusterSchema>;
export type ValidationScores = z.infer<typeof ValidationScoresSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type DebateResult = z.infer<typeof DebateResultSchema>;
export type JudgeResult = z.infer<typeof JudgeResultSchema>;
export type OpportunityStatus = z.infer<typeof OpportunityStatusSchema>;
export type Stage = z.infer<typeof StageSchema>;
export type ProductConcept = z.infer<typeof ProductConceptSchema>;
export type Opportunity = z.infer<typeof OpportunitySchema>;
export type Verdict = z.infer<typeof VerdictSchema>;
