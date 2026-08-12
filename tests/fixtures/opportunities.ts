import type { Opportunity } from '../../src/schemas/index.js';

/**
 * Fixture A — Excellent opportunity that passes all gates.
 */
export const fixtureA: Opportunity = {
  id: 'OP-0001',
  canonical_key: 'CK-fixture-a-excellent',
  title: 'Finance teams manually reconcile Stripe payouts against invoices',
  target_user: 'Finance Manager / Accountant',
  job_to_be_done:
    'When Stripe payouts arrive, I want to automatically match them to outstanding invoices, so I can close books faster and eliminate reconciliation errors.',
  painful_workflow:
    'Every week, finance teams export Stripe payouts to CSV, export invoices from their billing system, manually match line by line, investigate discrepancies, and re-enter reconciled data into the accounting system.',
  current_workaround:
    'Finance teams use Excel VLOOKUPs, manual line-by-line matching, and sometimes hire part-time bookkeepers. Some have built fragile Python scripts.',
  source_ids: ['SRC-001', 'SRC-002', 'SRC-003', 'SRC-004'],
  independent_sources: 5,
  source_type_count: 3,

  pain_score: 5,
  frequency_score: 5,
  urgency_score: 4,
  economic_impact_score: 4,
  operational_impact_score: 4,
  workaround_intensity_score: 5,
  willingness_to_pay_score: 5,
  distribution_score: 4,
  global_score: 5,
  mvp_complexity_score: 2,
  evidence_quality_score: 4,

  competition_score: 1,
  competitors: [],
  substitutes: [],

  verified_facts: [
    'Hundreds of forum threads about Stripe reconciliation pain',
    'Multiple job postings for "Stripe reconciliation specialist"',
    'Freelance gigs offering Stripe reconciliation automation',
  ],
  inferences: [
    'Companies paying for manual reconciliation would pay for automation',
    'Problem scales with transaction volume',
  ],
  assumptions: ['Stripe API is sufficient for building the solution'],
  unknowns: ['Exact market size for Stripe-specific reconciliation'],
  rejection_reasons: [],

  judge_verdict: 'APPROVE',
  confidence: 0.85,
  final_score: 0,

  run_id: 'RUN-FIXTURE',
  stage: 'complete',
  status: 'APPROVED',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

/**
 * Fixture B — Pain exists, but competition is high.
 */
export const fixtureB: Opportunity = {
  id: 'OP-0002',
  canonical_key: 'CK-fixture-b-competition',
  title: 'Project managers want better task management',
  target_user: 'Project Manager',
  job_to_be_done:
    'When managing team tasks, I want to track progress across multiple projects, so I can report status to stakeholders.',
  painful_workflow:
    'PMs juggle multiple tools, manually aggregate status updates, and build slide decks for weekly reviews.',
  current_workaround: 'PMs use Jira, Asana, Monday.com, Notion, Google Sheets, or a combination.',
  source_ids: ['SRC-010', 'SRC-011'],
  independent_sources: 3,
  source_type_count: 2,

  pain_score: 4,
  frequency_score: 4,
  urgency_score: 3,
  economic_impact_score: 3,
  operational_impact_score: 3,
  workaround_intensity_score: 3,
  willingness_to_pay_score: 4,
  distribution_score: 3,
  global_score: 4,
  mvp_complexity_score: 4,
  evidence_quality_score: 3,

  competition_score: 5,
  competitors: [
    {
      name: 'Jira',
      url: 'https://www.atlassian.com/jira',
      classification: 'DIRECT',
      notes: 'Dominant player in project management',
      feature_overlap: 'Task tracking, reporting, cross-project views',
      pricing: '$7.75/user/month',
      market_positioning: 'Enterprise project management',
    },
  ],
  substitutes: [],

  verified_facts: ['Project management is a well-served market'],
  inferences: ['High competition makes this unattractive'],
  assumptions: [],
  unknowns: [],
  rejection_reasons: ['Competition score 5/5 exceeds max 2'],

  judge_verdict: 'REJECT',
  confidence: 0.9,
  final_score: 0,

  run_id: 'RUN-FIXTURE',
  stage: 'complete',
  status: 'REJECTED',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

/**
 * Fixture C — Low competition but weak pain.
 */
export const fixtureC: Opportunity = {
  id: 'OP-0003',
  canonical_key: 'CK-fixture-c-weak-pain',
  title: 'Designers want a slightly better color picker',
  target_user: 'UI Designer',
  job_to_be_done:
    'When picking colors, I want more palette suggestions, so I can choose colors slightly faster.',
  painful_workflow: 'Designers spend a few extra seconds picking colors.',
  current_workaround: 'Existing color pickers in Figma/Sketch work fine.',
  source_ids: ['SRC-020'],
  independent_sources: 1,
  source_type_count: 1,

  pain_score: 2,
  frequency_score: 3,
  urgency_score: 1,
  economic_impact_score: 1,
  operational_impact_score: 1,
  workaround_intensity_score: 1,
  willingness_to_pay_score: 1,
  distribution_score: 2,
  global_score: 3,
  mvp_complexity_score: 1,
  evidence_quality_score: 1,

  competition_score: 2,
  competitors: [],
  substitutes: [],

  verified_facts: ['Designers use color pickers daily'],
  inferences: ['This is a minor inconvenience, not a business problem'],
  assumptions: [],
  unknowns: [],
  rejection_reasons: ['Pain score 2/5 below minimum 4'],

  judge_verdict: 'REJECT',
  confidence: 0.95,
  final_score: 0,

  run_id: 'RUN-FIXTURE',
  stage: 'complete',
  status: 'REJECTED',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

/**
 * Fixture D — Evidence insufficient (few sources, low quality).
 */
export const fixtureD: Opportunity = {
  id: 'OP-0004',
  canonical_key: 'CK-fixture-d-weak-evidence',
  title: 'Some people want a tool for something',
  target_user: 'Unknown',
  job_to_be_done: 'When doing some task, I want a tool, so I can do it better.',
  painful_workflow: 'Unclear workflow mentioned in one Reddit comment.',
  current_workaround: 'Unknown.',
  source_ids: ['SRC-030'],
  independent_sources: 1,
  source_type_count: 1,

  pain_score: 3,
  frequency_score: 2,
  urgency_score: 2,
  economic_impact_score: 2,
  operational_impact_score: 2,
  workaround_intensity_score: 2,
  willingness_to_pay_score: 2,
  distribution_score: 1,
  global_score: 2,
  mvp_complexity_score: 3,
  evidence_quality_score: 1,

  competition_score: 3,
  competitors: [],
  substitutes: [],

  verified_facts: [],
  inferences: [],
  assumptions: [],
  unknowns: ['Almost everything is unknown'],
  rejection_reasons: [
    'Insufficient independent sources: 1/3',
    'Insufficient source type diversity: 1/2',
    'Evidence quality too low: 1/3',
    'Pain score too low: 3/4',
  ],

  judge_verdict: 'REJECT',
  confidence: 0.98,
  final_score: 0,

  run_id: 'RUN-FIXTURE',
  stage: 'complete',
  status: 'REJECTED',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

/**
 * Fixture E — Duplicate opportunity.
 */
export const fixtureE: Opportunity = {
  id: 'OP-0005',
  canonical_key: 'CK-fixture-e-dup',
  title: 'Duplicate of Fixture A',
  target_user: 'Finance Manager',
  job_to_be_done: 'Duplicate opportunity that should be consolidated.',
  painful_workflow: 'Same as fixture A.',
  current_workaround: 'Same as fixture A.',
  source_ids: ['SRC-001'],
  independent_sources: 1,
  source_type_count: 1,

  pain_score: 3,
  frequency_score: 3,
  urgency_score: 3,
  economic_impact_score: 3,
  operational_impact_score: 3,
  workaround_intensity_score: 3,
  willingness_to_pay_score: 3,
  distribution_score: 3,
  global_score: 3,
  mvp_complexity_score: 3,
  evidence_quality_score: 3,

  competition_score: 3,
  competitors: [],
  substitutes: [],

  verified_facts: [],
  inferences: [],
  assumptions: [],
  unknowns: [],
  rejection_reasons: [],

  judge_verdict: 'REJECT',
  confidence: 0,
  final_score: 0,

  run_id: 'RUN-FIXTURE',
  stage: 'complete',
  status: 'DUPLICATE',
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-15T00:00:00Z',
};

/**
 * All fixtures for easy iteration.
 */
export const allFixtures: Opportunity[] = [fixtureA, fixtureB, fixtureC, fixtureD, fixtureE];
