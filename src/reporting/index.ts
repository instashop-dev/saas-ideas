import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Opportunity } from '../schemas/index.js';
import { rankOpportunities } from '../scoring/index.js';
import { passesAllGates } from '../gates/index.js';

const REPORTS_DIR = resolve(process.cwd(), 'reports');

function ensureReportsDir(): void {
  if (!existsSync(REPORTS_DIR)) {
    mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

/**
 * Generate the TOP-N.md report for approved opportunities.
 */
export function generateTopReport(opportunities: Opportunity[], topN: number = 10): string {
  const approved = opportunities.filter((o) => {
    const gateResult = passesAllGates(o);
    return gateResult.passed;
  });

  const ranked = rankOpportunities(approved);
  const top = ranked.slice(0, topN);

  if (top.length === 0) {
    return `# Top Opportunities Report

**No opportunities passed all gates in this run.**

This is a valid outcome. The system optimizes for truth and rejection quality, not idea volume.

`;
  }

  let report = `# Top ${top.length} SaaS Opportunities\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `---\n\n`;

  for (let i = 0; i < top.length; i++) {
    const opp = top[i]!;
    report += `## ${i + 1}. ${opp.title} (Score: ${opp.final_score.toFixed(1)})\n\n`;
    report += `| Dimension | Value |\n`;
    report += `|---|---|\n`;
    report += `| **ID** | ${opp.id} |\n`;
    report += `| **Target Customer** | ${opp.target_user} |\n`;
    report += `| **Job-to-be-Done** | ${opp.job_to_be_done} |\n`;
    report += `| **Painful Workflow** | ${opp.painful_workflow} |\n`;
    report += `| **Current Workaround** | ${opp.current_workaround} |\n`;
    report += `| **Burning Need** | Pain: ${opp.pain_score}/5, Frequency: ${opp.frequency_score}/5, Urgency: ${opp.urgency_score}/5 |\n`;
    report += `| **Willingness to Pay** | ${opp.willingness_to_pay_score}/5 |\n`;
    report += `| **Competition** | ${opp.competition_score}/5 |\n`;
    report += `| **Evidence Count** | ${opp.source_ids.length} sources, ${opp.independent_sources} independent |\n`;
    report += `| **Source Diversity** | ${opp.source_type_count} source types |\n`;
    report += `| **Global Applicability** | ${opp.global_score}/5 |\n`;
    report += `| **MVP Complexity** | ${opp.mvp_complexity_score}/5 |\n`;
    report += `| **Confidence** | ${(opp.confidence * 100).toFixed(0)}% |\n`;
    report += `| **Judge Verdict** | ${opp.judge_verdict} |\n`;
    report += `| **Final Score** | ${opp.final_score.toFixed(1)} |\n`;

    if (opp.product_concept) {
      report += `\n### Product Concept\n\n`;
      report += `- **Concept**: ${opp.product_concept.product_concept}\n`;
      report += `- **ICP**: ${opp.product_concept.narrow_icp}\n`;
      report += `- **MVP**: ${opp.product_concept.smallest_useful_mvp}\n`;
      report += `- **Pricing**: ${opp.product_concept.pricing_hypothesis}\n`;
      report += `- **Distribution**: ${opp.product_concept.distribution_wedge}\n`;
    }

    if (opp.verified_facts.length > 0) {
      report += `\n### Verified Facts\n\n`;
      for (const fact of opp.verified_facts.slice(0, 3)) {
        report += `- ${fact}\n`;
      }
    }

    if (opp.assumptions.length > 0) {
      report += `\n### Key Assumptions\n\n`;
      for (const assumption of opp.assumptions.slice(0, 3)) {
        report += `- ${assumption}\n`;
      }
    }

    if (opp.unknowns.length > 0) {
      report += `\n### Major Unknowns\n\n`;
      for (const unknown of opp.unknowns.slice(0, 3)) {
        report += `- ${unknown}\n`;
      }
    }

    report += `\n---\n\n`;
  }

  return report;
}

/**
 * Generate the REJECTED.md report.
 */
export function generateRejectedReport(opportunities: Opportunity[]): string {
  const rejected = opportunities.filter((o) => {
    const gateResult = passesAllGates(o);
    return !gateResult.passed;
  });

  if (rejected.length === 0) {
    return `# Rejected Opportunities Report

**No opportunities were rejected in this run.**

`;
  }

  let report = `# Rejected Opportunities (${rejected.length})\n\n`;
  report += `Generated: ${new Date().toISOString()}\n\n`;
  report += `---\n\n`;

  for (const opp of rejected) {
    const gateResult = passesAllGates(opp);
    report += `## ${opp.title} (${opp.id})\n\n`;
    report += `| Dimension | Value |\n`;
    report += `|---|---|\n`;
    report += `| **JTBD** | ${opp.job_to_be_done} |\n`;
    report += `| **Judge Verdict** | ${opp.judge_verdict} |\n`;
    report += `| **Competition** | ${opp.competition_score}/5 |\n`;
    report += `| **Pain** | ${opp.pain_score}/5 |\n`;
    report += `| **Evidence** | ${opp.independent_sources} independent sources |\n`;

    report += `\n### Rejection Reasons\n\n`;
    for (const failure of gateResult.failures) {
      report += `- **${failure.gate}**: ${failure.message}\n`;
    }

    if (opp.rejection_reasons.length > 0) {
      for (const reason of opp.rejection_reasons) {
        report += `- ${reason}\n`;
      }
    }

    report += `\n---\n\n`;
  }

  return report;
}

/**
 * Write reports to disk.
 */
export function writeReports(
  opportunities: Opportunity[],
  runId: string,
  topN: number = 10,
): { topPath: string; rejectedPath: string } {
  ensureReportsDir();

  // Archive previous reports
  const archiveDir = resolve(REPORTS_DIR, 'archive');
  if (!existsSync(archiveDir)) {
    mkdirSync(archiveDir, { recursive: true });
  }

  const topReport = generateTopReport(opportunities, topN);
  const rejectedReport = generateRejectedReport(opportunities);

  const topPath = resolve(REPORTS_DIR, 'TOP-10.md');
  const rejectedPath = resolve(REPORTS_DIR, 'REJECTED.md');

  // Archive old reports
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  if (existsSync(topPath)) {
    const archivedTop = readThenArchive(topPath, archiveDir, `TOP-10-${timestamp}.md`);
    if (archivedTop) {
      writeFileSync(resolve(archiveDir, `TOP-10-${runId}.md`), archivedTop, 'utf-8');
    }
  }
  if (existsSync(rejectedPath)) {
    const archivedRej = readThenArchive(rejectedPath, archiveDir, `REJECTED-${timestamp}.md`);
    if (archivedRej) {
      writeFileSync(resolve(archiveDir, `REJECTED-${runId}.md`), archivedRej, 'utf-8');
    }
  }

  writeFileSync(topPath, topReport, 'utf-8');
  writeFileSync(rejectedPath, rejectedReport, 'utf-8');

  return { topPath, rejectedPath };
}

function readThenArchive(path: string, _archiveDir: string, _archiveName: string): string | null {
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return null;
  }
}
