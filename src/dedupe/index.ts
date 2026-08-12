import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Cluster, Opportunity } from '../schemas/index.js';

export type DuplicateResult =
  | { status: 'NEW' }
  | { status: 'DUPLICATE'; duplicateOf: string }
  | { status: 'POSSIBLE_DUPLICATE'; candidates: string[] };

/**
 * Generate a deterministic canonical key from a JTBD description.
 * Used for collision-safe opportunity IDs and duplicate detection.
 */
export function generateCanonicalKey(jtbd: string): string {
  // Normalize: lowercase, replace punctuation with spaces, collapse whitespace
  const normalized = jtbd
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Take first 64 chars and hash
  const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 16);

  return `CK-${hash}`;
}

/**
 * Generate a deterministic opportunity ID from a canonical key.
 */
export function generateOpportunityId(canonicalKey: string): string {
  const hash = createHash('sha256').update(canonicalKey).digest('hex').slice(0, 4);
  return `OP-${hash.toUpperCase()}`;
}

/**
 * Stage 1: Deterministic dedup using normalized JTBD text.
 */
function deterministicDedup(
  newJtbd: string,
  existingClusters: Array<{ id: string; canonical_jtbd: string }>,
  existingOpportunities: Array<{ id: string; job_to_be_done: string }>,
): DuplicateResult {
  const newKey = generateCanonicalKey(newJtbd);

  // Check clusters
  for (const cluster of existingClusters) {
    const clusterKey = generateCanonicalKey(cluster.canonical_jtbd);
    if (clusterKey === newKey) {
      return { status: 'DUPLICATE', duplicateOf: cluster.id };
    }
  }

  // Check opportunities
  for (const opp of existingOpportunities) {
    const oppKey = generateCanonicalKey(opp.job_to_be_done);
    if (oppKey === newKey) {
      return { status: 'DUPLICATE', duplicateOf: opp.id };
    }
  }

  // Check for close matches using normalized string similarity
  const normalized = newJtbd
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const possibleDupes: string[] = [];

  for (const cluster of existingClusters) {
    const clusterNorm = cluster.canonical_jtbd
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (normalized.includes(clusterNorm) || clusterNorm.includes(normalized)) {
      possibleDupes.push(cluster.id);
    }
  }

  if (possibleDupes.length > 0) {
    return { status: 'POSSIBLE_DUPLICATE', candidates: possibleDupes };
  }

  return { status: 'NEW' };
}

/**
 * Stage 2: Semantic comparison (placeholder for LLM-based dedup).
 * In production, this would use an embedding-based similarity check.
 */
export async function semanticDedup(
  _newJtbd: string,
  _existingDescriptions: Array<{ id: string; description: string }>,
): Promise<DuplicateResult> {
  // For deterministic MVP, fall through to NEW
  // When a similarity threshold is configured, use embeddings here
  return { status: 'NEW' };
}

/**
 * Full two-stage dedup check.
 */
export async function checkDuplicate(
  cluster: Cluster,
  existingClusters: Cluster[],
  existingOpportunities: Opportunity[],
): Promise<DuplicateResult> {
  // Stage 1: Deterministic
  const stage1 = deterministicDedup(
    cluster.canonical_jtbd,
    existingClusters.map((c) => ({ id: c.cluster_id, canonical_jtbd: c.canonical_jtbd })),
    existingOpportunities.map((o) => ({ id: o.id, job_to_be_done: o.job_to_be_done })),
  );

  if (stage1.status !== 'NEW') return stage1;

  // Stage 2: Semantic (if configured)
  return semanticDedup(cluster.canonical_jtbd, []);
}

/**
 * Check if an opportunity ID already exists in the filesystem.
 */
export function opportunityIdExists(opportunityId: string): boolean {
  return existsSync(resolve(process.cwd(), 'opportunities', opportunityId));
}
