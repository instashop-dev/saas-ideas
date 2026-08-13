import { describe, it, expect } from 'vitest';
import { loadConfig, resetConfigCache } from '../../src/state/config.js';

describe('loadConfig', () => {
  it('loads the default config.yaml', () => {
    resetConfigCache();
    const config = loadConfig();
    expect(config.models.pain_miner.primary).toBeTruthy();
    expect(config.research.max_signals_per_worker).toBeGreaterThan(0);
    expect(config.gates.min_pain_score).toBeGreaterThan(0);
    expect(config.llm.temperature).toBeDefined();
  });

  it('caches the config', () => {
    resetConfigCache();
    const config1 = loadConfig();
    const config2 = loadConfig();
    expect(config1).toBe(config2);
  });

  it('resetConfigCache forces reload', () => {
    resetConfigCache();
    const config1 = loadConfig();
    resetConfigCache();
    const config2 = loadConfig();
    expect(config1).not.toBe(config2);
    expect(config1).toEqual(config2);
  });
});
