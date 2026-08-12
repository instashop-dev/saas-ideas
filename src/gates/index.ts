import { getConfig } from '../state/config.js';
import type { Opportunity } from '../schemas/index.js';

export interface GateResult {
  passed: boolean;
  failures: GateFailure[];
}

export interface GateFailure {
  gate: string;
  required: number | string | boolean;
  actual: number | string | boolean;
  message: string;
}

/**
 * Run all deterministic hard gates on an opportunity.
 * Returns pass/fail with specific failure reasons.
 */
export function runHardGates(opportunity: Opportunity): GateResult {
  const config = getConfig().gates;
  const failures: GateFailure[] = [];

  function check(gate: string, required: number, actual: number, message: string): void {
    if (actual < required) {
      failures.push({ gate, required, actual, message });
    }
  }

  function checkMax(gate: string, maxAllowed: number, actual: number, message: string): void {
    if (actual > maxAllowed) {
      failures.push({ gate, required: `≤ ${maxAllowed}`, actual, message });
    }
  }

  check(
    'min_independent_sources',
    config.min_independent_sources,
    opportunity.independent_sources,
    `Insufficient independent sources: ${opportunity.independent_sources}/${config.min_independent_sources}`,
  );

  check(
    'min_pain_score',
    config.min_pain_score,
    opportunity.pain_score,
    `Pain score too low: ${opportunity.pain_score}/${config.min_pain_score}`,
  );

  check(
    'min_frequency_score',
    config.min_frequency_score,
    opportunity.frequency_score,
    `Frequency score too low: ${opportunity.frequency_score}/${config.min_frequency_score}`,
  );

  check(
    'min_wtp_score',
    config.min_wtp_score,
    opportunity.willingness_to_pay_score,
    `WTP score too low: ${opportunity.willingness_to_pay_score}/${config.min_wtp_score}`,
  );

  check(
    'min_global_score',
    config.min_global_score,
    opportunity.global_score,
    `Global score too low: ${opportunity.global_score}/${config.min_global_score}`,
  );

  checkMax(
    'max_competition_score',
    config.max_competition_score,
    opportunity.competition_score,
    `Competition too high: ${opportunity.competition_score}/${config.max_competition_score}`,
  );

  check(
    'min_evidence_quality',
    config.min_evidence_quality,
    opportunity.evidence_quality_score,
    `Evidence quality too low: ${opportunity.evidence_quality_score}/${config.min_evidence_quality}`,
  );

  if (opportunity.source_type_count < 2) {
    failures.push({
      gate: 'source_type_count',
      required: 2,
      actual: opportunity.source_type_count,
      message: `Insufficient source type diversity: ${opportunity.source_type_count}/2`,
    });
  }

  if (opportunity.judge_verdict !== 'APPROVE') {
    failures.push({
      gate: 'judge_verdict',
      required: 'APPROVE',
      actual: opportunity.judge_verdict,
      message: `Judge verdict is ${opportunity.judge_verdict}, not APPROVE`,
    });
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Check if an opportunity is a confirmed duplicate.
 */
export function isConfirmedDuplicate(status: string): boolean {
  return status === 'DUPLICATE';
}

/**
 * Comprehensive gate check including duplicate detection.
 */
export function passesAllGates(opportunity: Opportunity): GateResult {
  const gateResult = runHardGates(opportunity);

  if (isConfirmedDuplicate(opportunity.status)) {
    gateResult.passed = false;
    gateResult.failures.push({
      gate: 'duplicate_check',
      required: 'not duplicate',
      actual: opportunity.status,
      message: 'Opportunity is a confirmed duplicate',
    });
  }

  return gateResult;
}
