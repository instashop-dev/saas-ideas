import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { OpenRouterCallOptions, OpenRouterCallResult } from '../../src/openrouter/provider.js';
import type { Cluster, RawSignal, EvidenceItem, DebateResult } from '../../src/schemas/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

/**
 * Full pipeline lifecycle test (mocked LLM).
 *
 * Runs the REAL stage CLIs back-to-back (as the GitHub Actions chained workflows do),
 * with the OpenRouter provider mocked to return deterministic agent responses.
 * Validates the complete discovery cycle: manifest -> raw signals -> clusters ->
 * validation -> competition -> debate -> judge -> gates -> scoring -> reports.
 *
 * Work happens in a temp directory so the repository stays pristine.
 */

// ---- Mock agent responses (deterministic) ---------------------------------
const mockData = vi.hoisted(() => {
  const evidence: EvidenceItem[] = [
    {
      source_id: 'SRC-001',
      url: 'https://www.reddit.com/r/stripe/comments/example1',
      source_type: 'forum',
      publisher_or_site: 'Reddit r/stripe',
      date_published: '2024-01-10T00:00:00Z',
      date_accessed: '2024-01-15T00:00:00Z',
      claim: 'Stripe reconciliation is a major pain point for finance teams',
      paraphrased_evidence:
        'Finance professionals report hours per week manually reconciling payouts.',
      evidence_strength: 4,
      independence_group: 'reddit-thread-001',
    },
    {
      source_id: 'SRC-002',
      url: 'https://github.com/stripe/stripe-python/issues/example',
      source_type: 'github',
      publisher_or_site: 'GitHub',
      date_published: '2024-01-05T00:00:00Z',
      date_accessed: '2024-01-15T00:00:00Z',
      claim: 'Feature request for automated reconciliation in Stripe API',
      paraphrased_evidence: 'A GitHub issue with many thumbs-up requesting native reconciliation.',
      evidence_strength: 4,
      independence_group: 'github-issue-002',
    },
    {
      source_id: 'SRC-003',
      url: 'https://www.upwork.com/jobs/example',
      source_type: 'job',
      publisher_or_site: 'Upwork',
      date_published: '2024-01-08T00:00:00Z',
      date_accessed: '2024-01-15T00:00:00Z',
      claim: 'Companies hiring for Stripe reconciliation automation',
      paraphrased_evidence:
        'Job posting seeking automated Stripe-to-books reconciliation, budget $5k-$10k.',
      evidence_strength: 5,
      independence_group: 'upwork-003',
    },
  ];

  const signals: RawSignal[] = [
    {
      signal_id: 'SIG-0001',
      source_ids: ['SRC-001'],
      target_role: 'Finance Manager',
      workflow: 'Export Stripe payouts, export invoices, manually match line by line in Excel',
      trigger: 'Weekly or monthly close process',
      frequency: 'Weekly',
      current_workaround: 'Excel VLOOKUPs, manual matching',
      consequence: 'Delayed financial close, reconciliation errors',
      ecosystem: 'reddit',
      source_type: 'forum',
      collected_at: '2024-01-15T00:00:00Z',
    },
    {
      signal_id: 'SIG-0002',
      source_ids: ['SRC-002'],
      target_role: 'Finance Ops',
      workflow:
        'Build and maintain custom reconciliation scripts between Stripe and accounting systems',
      trigger: 'Each payout batch from Stripe',
      frequency: 'Daily',
      current_workaround: 'Custom Python scripts, fragile and hard to maintain',
      consequence: 'Scripts break on API changes, errors go unnoticed',
      ecosystem: 'github-issues',
      source_type: 'github',
      collected_at: '2024-01-15T00:00:00Z',
    },
  ];

  const clusterA: Cluster = {
    cluster_id: 'CL-0001',
    canonical_jtbd:
      'When Stripe payouts arrive, finance teams need to automatically match them to invoices so they can close books faster and reduce errors.',
    target_user: 'Finance Manager / Accountant',
    painful_workflow: 'Weekly: export payout CSV, export invoices, manually match line by line.',
    current_workaround: 'Excel VLOOKUPs, manual matching, fragile custom scripts.',
    source_signal_ids: ['SIG-0001', 'SIG-0002'],
    source_evidence: evidence,
    independent_sources: 3,
    source_type_count: 3,
    ambiguity_flag: false,
    created_at: '2024-01-15T00:00:00Z',
  };

  const clusterB: Cluster = {
    cluster_id: 'CL-0002',
    canonical_jtbd:
      'When restaurant owners process weekly payroll across multiple locations, they need to consolidate hours from POS systems so payroll runs do not consume a full day.',
    target_user: 'Restaurant Owner / Bookkeeper',
    painful_workflow:
      'Weekly: export hours from each POS, combine in spreadsheets, re-key into payroll.',
    current_workaround: 'Spreadsheets and manual re-keying.',
    source_signal_ids: ['SIG-0001'],
    source_evidence: evidence,
    independent_sources: 3,
    source_type_count: 3,
    ambiguity_flag: false,
    created_at: '2024-01-15T00:00:00Z',
  };

  const clusterC: Cluster = {
    cluster_id: 'CL-0003',
    canonical_jtbd:
      'When e-commerce sellers manage inventory management across multiple marketplaces, they need to reconcile stock levels so overselling does not damage their reputation.',
    target_user: 'E-commerce Seller / Ops Manager',
    painful_workflow:
      'Daily: export stock from each marketplace, compare in spreadsheets, adjust listings.',
    current_workaround: 'Spreadsheets and manual listing updates.',
    source_signal_ids: ['SIG-0001'],
    source_evidence: evidence,
    independent_sources: 3,
    source_type_count: 3,
    ambiguity_flag: false,
    created_at: '2024-01-15T00:00:00Z',
  };

  const validationHigh = {
    scores: {
      pain_intensity: 5,
      frequency: 4,
      urgency: 4,
      economic_impact: 4,
      operational_impact: 4,
      workaround_intensity: 4,
      willingness_to_pay: 4,
      global_applicability: 4,
      customer_accessibility: 4,
      evidence_quality: 4,
    },
    reasoning: { pain: 'Multiple independent sources describe the same manual workflow.' },
    verified_facts: ['Reconciliation is manual across several industries'],
    inferences: ['Teams would pay to automate the matching'],
    assumptions: ['API access is sufficient'],
    unknowns: ['Exact market size'],
    overall_assessment: 'Burning need with clear manual workaround.',
  };

  const validationLow = {
    scores: {
      pain_intensity: 2,
      frequency: 4,
      urgency: 3,
      economic_impact: 3,
      operational_impact: 3,
      workaround_intensity: 3,
      willingness_to_pay: 4,
      global_applicability: 4,
      customer_accessibility: 3,
      evidence_quality: 4,
    },
    reasoning: { pain: 'Workaround exists and is not strongly complained about.' },
    verified_facts: ['Payroll consolidation is occasionally manual'],
    inferences: [],
    assumptions: [],
    unknowns: ['Real demand unclear'],
    overall_assessment: 'Weak pain intensity; workaround is tolerable.',
  };

  const competition = {
    competition_score: 2,
    queries_attempted: ['stripe reconciliation tool'],
    competitors: [
      {
        name: 'Payment platform native features',
        url: 'https://stripe.com',
        classification: 'PARTIAL',
        notes: 'Partial native reconciliation features',
        feature_overlap: 'Low',
        pricing: 'Per transaction',
        market_positioning: 'Payment processor',
      },
    ],
    substitutes: [],
    summary: 'Limited direct competition found.',
    research_evidence_urls: ['https://example.com/evidence'],
  };

  const debate = (position: DebateResult['position']): DebateResult => ({
    position,
    summary: 'Reasonable arguments on both sides with cited evidence.',
    strongest_points: ['Evidence shows recurring manual work'],
    weaknesses: ['Market size uncertain'],
    evidence_cited: ['SRC-001', 'SRC-002'],
    confidence: 0.7,
  });

  const judgeApprove = {
    verdict: 'APPROVE',
    strongest_reason: 'Clear recurring pain with manual workaround and limited competition.',
    strongest_risk: 'Distribution is hard for a narrow niche.',
    unresolved_assumption: 'Willingness to pay at scale.',
    confidence: 0.8,
    recommended_next_step: 'Interview 10 target users.',
  };

  const judgeNeedsEvidence = {
    verdict: 'NEEDS_MORE_EVIDENCE',
    strongest_reason: 'Pain intensity is weak relative to the workaround cost.',
    strongest_risk: 'No verified buyer intent.',
    unresolved_assumption: 'Demand existence.',
    confidence: 0.5,
    recommended_next_step: 'Gather more independent evidence.',
  };

  return {
    evidence,
    signals,
    clusterA,
    clusterB,
    clusterC,
    validationHigh,
    validationLow,
    competition,
    debate,
    judgeApprove,
    judgeNeedsEvidence,
  };
});

vi.mock('../../src/openrouter/provider.js', () => ({
  callWithFallback: vi.fn(async (options: OpenRouterCallOptions): Promise<OpenRouterCallResult> => {
    const prompt = String(options?.userPrompt ?? '');
    let content: unknown;

    if (prompt.includes('Ecosystem: upwork-job-postings')) {
      // Simulate an upstream provider failure for one ecosystem to test graceful degradation.
      throw new Error('simulated upstream research failure');
    } else if (prompt.includes('Search Context:')) {
      content = { signals: mockData.signals, evidence: mockData.evidence };
    } else if (prompt.includes('RAW SIGNALS:')) {
      content = { clusters: [mockData.clusterA, mockData.clusterB, mockData.clusterC] };
    } else if (prompt.includes('DISPROVE')) {
      // Dispatch on the cluster's own JTBD keywords (evidence text contains 'Stripe' for all).
      content = prompt.includes('restaurant owners')
        ? mockData.validationLow
        : mockData.validationHigh;
    } else if (prompt.includes('OPPORTUNITY ASSASSIN')) {
      content = mockData.competition;
    } else if (prompt.includes('BULL case')) {
      content = mockData.debate('BULL');
    } else if (prompt.includes('KILL this opportunity')) {
      content = mockData.debate('BEAR');
    } else if (prompt.includes('target BUYER')) {
      content = mockData.debate('CUSTOMER');
    } else if (prompt.includes('final verdict')) {
      // restaurant opp: judge approves but deterministic gates reject (low pain).
      // inventory opp: judge asks for more evidence.
      content = prompt.includes('restaurant owners')
        ? mockData.judgeApprove
        : prompt.includes('inventory management')
          ? mockData.judgeNeedsEvidence
          : mockData.judgeApprove;
    } else {
      throw new Error(`mock: unexpected prompt: ${prompt.slice(0, 120)}`);
    }

    return {
      content: JSON.stringify(content),
      usage: { prompt_tokens: 100, completion_tokens: 100, total_tokens: 200, cost_usd: 0.0001 },
      durationMs: 5,
      model: 'mock/kimi-k3',
    };
  }),
  callOpenRouter: vi.fn(),
  callWithRetry: vi.fn(),
  fetchModelInfo: vi.fn(),
}));

// ---- Helpers ---------------------------------------------------------------

async function waitFor(cond: () => boolean, label: string, timeoutMs = 20_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (cond()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timed out waiting for: ${label}`);
}

let workDir: string;
let originalCwd: string;
let runId: string;

beforeAll(() => {
  originalCwd = process.cwd();
  workDir = join(tmpdir(), `saas-ideas-e2e-${Date.now()}`);
  mkdirSync(join(workDir, 'config'), { recursive: true });
  for (const d of [
    'research/runs',
    'research/raw-signals',
    'research/clusters',
    'opportunities',
    'reports/archive',
  ]) {
    mkdirSync(join(workDir, d), { recursive: true });
  }
  writeFileSync(
    join(workDir, 'config', 'config.yaml'),
    readFileSync(join(REPO_ROOT, 'config', 'config.yaml'), 'utf-8'),
    'utf-8',
  );
  process.chdir(workDir);
});

afterAll(() => {
  process.env.RUN_ID = '';
  process.chdir(originalCwd);
  rmSync(workDir, { recursive: true, force: true });
});

// ---- The full discovery cycle ---------------------------------------------

describe('Full pipeline lifecycle (mocked LLM)', () => {
  it('runs discovery through report and produces consistent artifacts', async () => {
    const { createRunManifest, loadRunManifest } = await import('../../src/state/run-manifest.js');
    const { listOpportunities } = await import('../../src/state/opportunities.js');
    const { calculateFinalScore } = await import('../../src/scoring/index.js');
    const { generateCanonicalKey, generateOpportunityId } =
      await import('../../src/dedupe/index.js');

    // Stage 0: Discovery
    const manifest = createRunManifest('manual');
    runId = manifest.run_id;
    process.env.RUN_ID = runId;
    expect(manifest.status).toBe('created');
    expect(manifest.run_id).toMatch(/^RUN-/);

    // Stage 1: Pain mining
    await import('../../src/cli/stage-pain-mine.js');
    await waitFor(
      () => (loadRunManifest(runId)?.candidate_counts.signals ?? -1) === 18,
      'pain mining to finish (18 signals = 9 ecosystems x 2, 1 ecosystem failed)',
    );

    const rawSignalsDir = join(workDir, 'research', 'raw-signals', runId);
    const ecoDirs = readdirSync(rawSignalsDir, { withFileTypes: true }).filter((d) =>
      d.isDirectory(),
    );
    // 9 ecosystems succeeded (upwork-job-postings simulated failure), each writes signals.json
    expect(ecoDirs.length).toBe(9);
    expect(existsSync(join(rawSignalsDir, 'upwork-job-postings'))).toBe(false);
    const signalFile = readFileSync(join(rawSignalsDir, 'reddit', 'signals.json'), 'utf-8');
    expect(JSON.parse(signalFile)).toHaveLength(2);

    // Stage 2: Clustering
    await import('../../src/cli/stage-cluster.js');
    await waitFor(
      () => (loadRunManifest(runId)?.candidate_counts.clusters ?? -1) === 3,
      'clustering to finish',
    );
    const clustersJson = JSON.parse(
      readFileSync(join(workDir, 'research', 'clusters', runId, 'clusters.json'), 'utf-8'),
    ) as Cluster[];
    expect(clustersJson).toHaveLength(3);

    // Stage 3: Validation
    await import('../../src/cli/stage-validate.js');
    await waitFor(
      () => (loadRunManifest(runId)?.candidate_counts.validated ?? -1) === 3,
      'validation to finish',
    );
    const oppDirs = readdirSync(join(workDir, 'opportunities'), { withFileTypes: true }).filter(
      (d) => d.isDirectory() && d.name.startsWith('OP-'),
    );
    expect(oppDirs.length).toBe(3);
    for (const d of oppDirs) {
      expect(existsSync(join(workDir, 'opportunities', d.name, 'verdict.json'))).toBe(true);
      expect(existsSync(join(workDir, 'opportunities', d.name, 'validation.json'))).toBe(true);
    }

    // Stage 4: Competition
    await import('../../src/cli/stage-competition.js');
    await waitFor(
      () => (loadRunManifest(runId)?.candidate_counts.competition_survivors ?? -1) === 3,
      'competition to finish',
    );
    for (const d of oppDirs) {
      expect(existsSync(join(workDir, 'opportunities', d.name, 'competition.json'))).toBe(true);
    }

    // Stage 5: Debate
    await import('../../src/cli/stage-debate.js');
    await waitFor(
      () => (loadRunManifest(runId)?.candidate_counts.finalists ?? -1) === 3,
      'debate to finish',
    );
    for (const d of oppDirs) {
      for (const f of ['bull.json', 'bear.json', 'customer.json']) {
        expect(existsSync(join(workDir, 'opportunities', d.name, f)), `${d.name}/${f}`).toBe(true);
      }
    }

    // Stage 6: Judge + deterministic gates
    await import('../../src/cli/stage-judge.js');
    await waitFor(
      () => (loadRunManifest(runId)?.candidate_counts.approved ?? -1) === 1,
      'judge to finish',
    );

    const opportunities = listOpportunities().filter((o) => o.run_id === runId);
    expect(opportunities).toHaveLength(3);
    const oppA = opportunities.find((o) => o.job_to_be_done.includes('Stripe'));
    const oppB = opportunities.find((o) => o.job_to_be_done.includes('restaurant owners'));
    const oppC = opportunities.find((o) => o.job_to_be_done.includes('inventory management'));
    expect(oppA).toBeDefined();
    expect(oppB).toBeDefined();
    expect(oppC).toBeDefined();
    // oppA: judge APPROVE + gates pass -> APPROVED
    expect(oppA!.status).toBe('APPROVED');
    // oppB: judge APPROVE but deterministic gate rejects low pain
    expect(oppB!.status).toBe('REJECTED');
    expect(oppB!.rejection_reasons.join(' ')).toContain('min_pain_score');
    // oppC: judge asks for more evidence
    expect(oppC!.status).toBe('NEEDS_MORE_EVIDENCE');
    expect(oppA!.id).toMatch(/^OP-/);
    expect(oppA!.id).toBe(generateOpportunityId(generateCanonicalKey(oppA!.job_to_be_done)));

    // Stage 7: Report
    await import('../../src/cli/stage-report.js');
    await waitFor(
      () => (loadRunManifest(runId)?.status ?? '') === 'completed',
      'report stage to mark run completed',
    );

    const finalManifest = loadRunManifest(runId)!;
    expect(finalManifest.status).toBe('completed');
    expect(finalManifest.completed_at).not.toBeNull();
    expect(finalManifest.candidate_counts).toEqual({
      signals: 18,
      clusters: 3,
      validated: 3,
      competition_survivors: 3,
      finalists: 3,
      approved: 1,
    });
    // Models used are now tracked per stage
    for (const stage of [
      'pain_miner',
      'clusterer',
      'validator',
      'competition',
      'bull',
      'bear',
      'customer',
      'judge',
    ]) {
      expect(finalManifest.models[stage]).toBe('mock/kimi-k3');
    }

    // Final output validation
    const topReport = readFileSync(join(workDir, 'reports', 'TOP-10.md'), 'utf-8');
    const rejectedReport = readFileSync(join(workDir, 'reports', 'REJECTED.md'), 'utf-8');

    expect(topReport).toContain(oppA!.id);
    expect(topReport).not.toContain(oppB!.id);
    expect(topReport).not.toContain(oppC!.id);
    expect(rejectedReport).toContain(oppB!.id);
    expect(rejectedReport).toContain(oppC!.id);
    expect(rejectedReport).not.toContain(oppA!.id);

    // Report score must match deterministic scoring of the saved opportunity
    const expectedScore = calculateFinalScore(oppA!);
    expect(topReport).toContain(`Score: ${expectedScore.toFixed(1)}`);
    // Approved opportunity must have a positive final score
    expect(expectedScore).toBeGreaterThan(0);
    // Rejected report explains the deterministic gate failures
    expect(rejectedReport).toContain('min_pain_score');
    expect(rejectedReport).toContain('judge_verdict');

    // Reports archive is populated for the next run
    const archiveDir = join(workDir, 'reports', 'archive');
    expect(existsSync(archiveDir)).toBe(true);

    // verify per-opportunity judge artifacts exist
    for (const d of oppDirs) {
      expect(existsSync(join(workDir, 'opportunities', d.name, 'judge_verdict.json'))).toBe(true);
    }
  }, 120_000);

  it('re-running the report stage is idempotent and archives previous reports', async () => {
    const { loadRunManifest } = await import('../../src/state/run-manifest.js');
    // Simulate a Recovery re-run of the report stage (fresh module registry).
    vi.resetModules();
    await import('../../src/cli/stage-report.js');

    expect(loadRunManifest(runId)?.status).toBe('completed');
    const archiveDir = join(workDir, 'reports', 'archive');
    const archiveFiles = readdirSync(archiveDir);
    expect(archiveFiles).toContain(`TOP-10-${runId}.md`);
    expect(archiveFiles).toContain(`REJECTED-${runId}.md`);
    expect(existsSync(join(workDir, 'reports', 'TOP-10.md'))).toBe(true);
    expect(existsSync(join(workDir, 'reports', 'REJECTED.md'))).toBe(true);
  }, 30_000);

  it('re-running a mid-pipeline stage (Recovery) does not double-count candidates', async () => {
    const { loadRunManifest } = await import('../../src/state/run-manifest.js');
    expect(loadRunManifest(runId)?.candidate_counts.signals).toBe(18);

    // Simulate a Recovery re-run of pain mining on the same run (fresh module registry).
    vi.resetModules();
    await import('../../src/cli/stage-pain-mine.js');
    await waitFor(
      () => (loadRunManifest(runId)?.candidate_counts.signals ?? -1) === 18,
      'pain mining re-run to finish',
    );

    // Idempotent: still 18, not 36.
    expect(loadRunManifest(runId)?.candidate_counts.signals).toBe(18);

    // Re-running an earlier stage must not corrupt later-stage counts,
    // and moves the run back into the re-run stage's status (documented Recovery behavior).
    const manifest = loadRunManifest(runId)!;
    expect(manifest.candidate_counts.clusters).toBe(3);
    expect(manifest.candidate_counts.approved).toBe(1);
    expect(manifest.status).toBe('pain_mining');
  }, 30_000);
});
