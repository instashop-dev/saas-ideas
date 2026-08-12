import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  saveOpportunity,
  loadOpportunity,
  listOpportunities,
  saveOpportunityArtifact,
  loadOpportunityArtifact,
} from '../../src/state/opportunities.js';
import { fixtureA } from '../fixtures/opportunities.js';

describe('Opportunity State (integration)', () => {
  const testOppId = 'OP-TEST99';

  beforeEach(() => {
    // Ensure clean state
    const dir = resolve(process.cwd(), 'opportunities', testOppId);
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    const dir = resolve(process.cwd(), 'opportunities', testOppId);
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('saves and loads an opportunity', () => {
    const opp = { ...fixtureA, id: testOppId };
    saveOpportunity(opp);

    const loaded = loadOpportunity(testOppId);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(testOppId);
    expect(loaded!.title).toBe(fixtureA.title);
  });

  it('returns null for non-existent opportunity', () => {
    const loaded = loadOpportunity('OP-NONEXIST');
    expect(loaded).toBeNull();
  });

  it('saves and loads artifacts', () => {
    const opp = { ...fixtureA, id: testOppId };
    saveOpportunity(opp);

    const artifact = { key: 'value', nested: { deep: true } };
    saveOpportunityArtifact(testOppId, 'test-artifact.json', artifact);

    const loaded = loadOpportunityArtifact<typeof artifact>(testOppId, 'test-artifact.json');
    expect(loaded).toEqual(artifact);
  });

  it('lists opportunities', () => {
    const opp = { ...fixtureA, id: testOppId };
    saveOpportunity(opp);

    const opps = listOpportunities();
    expect(opps.some((o) => o.id === testOppId)).toBe(true);
  });
});
