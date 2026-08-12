import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Opportunity } from '../schemas/index.js';

const OPPORTUNITIES_DIR = resolve(process.cwd(), 'opportunities');

export function getOpportunityDir(opportunityId: string): string {
  return resolve(OPPORTUNITIES_DIR, opportunityId);
}

export function saveOpportunity(opportunity: Opportunity): void {
  const dir = getOpportunityDir(opportunity.id);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const path = resolve(dir, 'verdict.json');
  writeFileSync(path, JSON.stringify(opportunity, null, 2), 'utf-8');
}

export function loadOpportunity(opportunityId: string): Opportunity | null {
  const path = resolve(getOpportunityDir(opportunityId), 'verdict.json');
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as Opportunity;
}

export function listOpportunities(): Opportunity[] {
  if (!existsSync(OPPORTUNITIES_DIR)) return [];
  return readdirSync(OPPORTUNITIES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => loadOpportunity(d.name))
    .filter((o): o is Opportunity => o !== null);
}

export function saveOpportunityArtifact(
  opportunityId: string,
  filename: string,
  data: unknown,
): void {
  const dir = getOpportunityDir(opportunityId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const path = resolve(dir, filename);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

export function loadOpportunityArtifact<T>(opportunityId: string, filename: string): T | null {
  const path = resolve(getOpportunityDir(opportunityId), filename);
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw) as T;
}
