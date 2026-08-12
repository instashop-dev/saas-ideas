import type { Opportunity } from '../schemas/index.js';

/**
 * Scoring weights — documented and configurable.
 * These are also read from config but defaults are provided here.
 */
export const DEFAULT_SCORING_WEIGHTS = {
  need: {
    pain: 0.25,
    frequency: 0.2,
    urgency: 0.15,
    economic_impact: 0.2,
    operational_impact: 0.1,
    workaround_intensity: 0.1,
  },
  commercial: {
    willingness_to_pay: 0.65,
    distribution: 0.35,
  },
  market: {
    global_applicability: 0.6,
    evidence_quality: 0.4,
  },
  penalty: {
    competition_factor: 0.5,
    mvp_complexity_factor: 0.3,
  },
} as const;

/**
 * Normalize a 1-5 score to 0-1 range.
 */
export function normalizeScore(score: number): number {
  return (score - 1) / 4;
}

/**
 * Competition penalty: monotonic — higher competition = lower score.
 * score 1 → penalty 1.0 (no penalty)
 * score 5 → penalty 0.2 (80% penalty)
 */
export function competitionPenalty(competitionScore: number, factor: number = 0.5): number {
  const normalized = normalizeScore(competitionScore);
  return 1 - normalized * factor;
}

/**
 * MVP complexity penalty: monotonic — more complex = lower score.
 * score 1 → penalty 1.0 (no penalty)
 * score 5 → penalty 0.6 (40% penalty)
 */
export function mvpComplexityPenalty(complexityScore: number, factor: number = 0.3): number {
  const normalized = normalizeScore(complexityScore);
  return 1 - normalized * factor;
}

/**
 * Calculate the Need composite score (0-1 range).
 */
export function calculateNeedScore(opportunity: Opportunity): number {
  const w = DEFAULT_SCORING_WEIGHTS.need;
  const scores = [
    normalizeScore(opportunity.pain_score) * w.pain,
    normalizeScore(opportunity.frequency_score) * w.frequency,
    normalizeScore(opportunity.urgency_score) * w.urgency,
    normalizeScore(opportunity.economic_impact_score) * w.economic_impact,
    normalizeScore(opportunity.operational_impact_score) * w.operational_impact,
    normalizeScore(opportunity.workaround_intensity_score) * w.workaround_intensity,
  ];
  return scores.reduce((sum, s) => sum + s, 0);
}

/**
 * Calculate the Commercial composite score (0-1 range).
 */
export function calculateCommercialScore(opportunity: Opportunity): number {
  const w = DEFAULT_SCORING_WEIGHTS.commercial;
  return (
    normalizeScore(opportunity.willingness_to_pay_score) * w.willingness_to_pay +
    normalizeScore(opportunity.distribution_score) * w.distribution
  );
}

/**
 * Calculate the Market composite score (0-1 range).
 */
export function calculateMarketScore(opportunity: Opportunity): number {
  const w = DEFAULT_SCORING_WEIGHTS.market;
  return (
    normalizeScore(opportunity.global_score) * w.global_applicability +
    normalizeScore(opportunity.evidence_quality_score) * w.evidence_quality
  );
}

/**
 * Calculate the Penalty factor (0-1 range, 1 = no penalty).
 */
export function calculatePenalty(opportunity: Opportunity): number {
  const cp = competitionPenalty(
    opportunity.competition_score,
    DEFAULT_SCORING_WEIGHTS.penalty.competition_factor,
  );
  const mp = mvpComplexityPenalty(
    opportunity.mvp_complexity_score,
    DEFAULT_SCORING_WEIGHTS.penalty.mvp_complexity_factor,
  );
  // Both penalties apply multiplicatively
  return cp * mp;
}

/**
 * Calculate the final 0-100 score.
 *
 * Formula:
 *   need = weighted_mean(pain, frequency, urgency, economic_impact, operational_impact, workaround_intensity)
 *   commercial = weighted_mean(willingness_to_pay, distribution)
 *   market = weighted_mean(global_applicability, evidence_quality)
 *   penalty = competition_penalty × mvp_complexity_penalty
 *   final = 100 × need × commercial × market × penalty
 */
export function calculateFinalScore(opportunity: Opportunity): number {
  const need = calculateNeedScore(opportunity);
  const commercial = calculateCommercialScore(opportunity);
  const market = calculateMarketScore(opportunity);
  const penalty = calculatePenalty(opportunity);

  const raw = 100 * need * commercial * market * penalty;
  return Math.round(raw * 100) / 100;
}

/**
 * Rank opportunities by final score (descending).
 */
export function rankOpportunities(opportunities: Opportunity[]): Opportunity[] {
  return [...opportunities]
    .map((o) => ({ ...o, final_score: calculateFinalScore(o) }))
    .sort((a, b) => b.final_score - a.final_score);
}
