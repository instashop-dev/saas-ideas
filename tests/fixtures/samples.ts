import type { EvidenceItem, RawSignal, Cluster } from '../../src/schemas/index.js';

export const sampleEvidence: EvidenceItem[] = [
  {
    source_id: 'SRC-001',
    url: 'https://www.reddit.com/r/stripe/comments/example1',
    source_type: 'forum',
    publisher_or_site: 'Reddit r/stripe',
    date_published: '2024-01-10T00:00:00Z',
    date_accessed: '2024-01-15T00:00:00Z',
    claim: 'Stripe reconciliation is a major pain point for finance teams',
    paraphrased_evidence:
      'Multiple finance professionals report spending 5-10 hours per week manually reconciling Stripe payouts. They describe using Excel VLOOKUPs and manual line-by-line matching.',
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
    paraphrased_evidence:
      'A GitHub issue with 150+ thumbs-up requesting Stripe add native reconciliation features. Multiple commenters describe building their own scripts.',
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
      'Job posting seeking a developer to build automated Stripe-to-QuickBooks reconciliation. Budget: $5,000-$10,000. Multiple similar postings exist.',
    evidence_strength: 5,
    independence_group: 'upwork-003',
  },
];

export const sampleSignals: RawSignal[] = [
  {
    signal_id: 'SIG-0001',
    source_ids: ['SRC-001'],
    target_role: 'Finance Manager',
    workflow:
      'Export Stripe payouts, export invoices from billing system, manually match line by line using Excel',
    trigger: 'Weekly or monthly close process',
    frequency: 'Weekly',
    current_workaround: 'Excel VLOOKUPs, manual matching, occasional Python scripts',
    consequence: 'Delayed financial close, reconciliation errors, hours of wasted time per week',
    ecosystem: 'reddit',
    source_type: 'forum',
    collected_at: '2024-01-15T00:00:00Z',
  },
  {
    signal_id: 'SIG-0002',
    source_ids: ['SRC-002'],
    target_role: 'Developer / Finance Ops',
    workflow:
      'Build and maintain custom reconciliation scripts between Stripe and accounting systems',
    trigger: 'Each payout batch from Stripe',
    frequency: 'Daily',
    current_workaround: 'Custom Python/Node.js scripts, fragile and hard to maintain',
    consequence: 'Scripts break on API changes, maintenance burden, errors go unnoticed',
    ecosystem: 'github-issues',
    source_type: 'github',
    collected_at: '2024-01-15T00:00:00Z',
  },
];

export const sampleClusters: Cluster[] = [
  {
    cluster_id: 'CL-0001',
    canonical_jtbd:
      'When Stripe payouts arrive, finance teams need to automatically match them to invoices/orders so they can close books faster and reduce errors.',
    target_user: 'Finance Manager / Accountant',
    painful_workflow:
      'Weekly: export payout CSV from Stripe, export invoices from billing system, manually match line by line, investigate discrepancies, re-enter into accounting system.',
    current_workaround:
      'Excel VLOOKUPs, manual matching, fragile custom scripts, part-time bookkeepers.',
    source_signal_ids: ['SIG-0001', 'SIG-0002'],
    source_evidence: sampleEvidence,
    independent_sources: 3,
    source_type_count: 3,
    ambiguity_flag: false,
    created_at: '2024-01-15T00:00:00Z',
  },
];

export const sampleConfig = {
  models: {
    pain_miner: { primary: 'test-model', fallbacks: [] },
    clusterer: { primary: 'test-model', fallbacks: [] },
    validator: { primary: 'test-model', fallbacks: [] },
    competition: { primary: 'test-model', fallbacks: [] },
    bull: { primary: 'test-model', fallbacks: [] },
    bear: { primary: 'test-model', fallbacks: [] },
    customer: { primary: 'test-model', fallbacks: [] },
    judge: { primary: 'test-model', fallbacks: [] },
  },
  research: {
    ecosystems: ['test-ecosystem'],
    max_signals_per_worker: 10,
    max_clusters_per_run: 5,
    max_candidates_after_validation: 3,
    max_candidates_after_competition: 2,
    max_finalists: 2,
  },
  parallelism: {
    pain_miners: 1,
    validators: 1,
    competition: 1,
    debate: 3,
  },
  gates: {
    min_independent_sources: 3,
    min_pain_score: 4,
    min_frequency_score: 3,
    min_wtp_score: 3,
    min_global_score: 4,
    max_competition_score: 2,
    min_evidence_quality: 3,
  },
  llm: {
    temperature: 0.2,
    timeout_seconds: 30,
    max_retries: 1,
  },
  budget: {
    max_cost_per_run_usd: null,
  },
  schedule: {
    enabled: false,
    cron: '',
  },
};
