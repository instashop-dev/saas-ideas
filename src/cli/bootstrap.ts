#!/usr/bin/env node
/**
 * Bootstrap CLI — idempotent setup for the repository.
 *
 * Validates config, checks secrets, creates required directories,
 * and verifies the environment is ready.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig, resetConfigCache } from '../state/config.js';

const REQUIRED_DIRS = [
  'research/runs',
  'research/raw-signals',
  'research/clusters',
  'opportunities',
  'reports/archive',
  'schemas',
];

const REQUIRED_ENV_VARS = ['OPENROUTER_API_KEY'];

function main(): void {
  console.log('=== SaaS Ideas Bootstrap ===\n');

  let errors = 0;
  const warnings = 0;

  // 1. Validate config
  console.log('[1/4] Validating config...');
  try {
    resetConfigCache();
    const config = loadConfig();
    console.log(`  ✓ config/config.yaml loaded successfully`);
    console.log(`  ✓ Models configured: ${Object.keys(config.models).length} agents`);
    console.log(`  ✓ Gates: ${Object.keys(config.gates).length} rules`);
  } catch (err) {
    console.error(`  ✗ Config error: ${err}`);
    errors++;
  }

  // 2. Create required directories
  console.log('\n[2/4] Creating required directories...');
  const cwd = process.cwd();
  for (const dir of REQUIRED_DIRS) {
    const fullPath = resolve(cwd, dir);
    if (!existsSync(fullPath)) {
      try {
        mkdirSync(fullPath, { recursive: true });
        console.log(`  ✓ Created: ${dir}`);
      } catch (err) {
        console.error(`  ✗ Failed to create ${dir}: ${err}`);
        errors++;
      }
    } else {
      console.log(`  - Exists: ${dir}`);
    }
  }

  // 3. Verify secrets
  console.log('\n[3/4] Checking secrets...');
  for (const envVar of REQUIRED_ENV_VARS) {
    if (process.env[envVar]) {
      const masked = process.env[envVar]!.slice(0, 8) + '...';
      console.log(`  ✓ ${envVar} is set (${masked})`);
    } else {
      console.error(`  ✗ ${envVar} is NOT set`);
      errors++;
    }
  }

  // 4. Validate schemas directory
  console.log('\n[4/4] Verifying schema files...');
  const schemasDir = resolve(cwd, 'schemas');
  if (existsSync(schemasDir)) {
    console.log(`  ✓ schemas/ directory exists`);
  } else {
    console.log(`  - schemas/ directory is optional (Zod schemas are in src/)`);
  }

  console.log('\n=== Bootstrap Complete ===');
  console.log(`Errors: ${errors}, Warnings: ${warnings}`);

  if (errors > 0) {
    console.log('\n⚠ Fix errors above before running the discovery pipeline.');
    process.exit(1);
  }

  console.log('\n✓ Repository is ready for discovery runs.');
  console.log('  Run: npm run discovery');
  process.exit(0);
}

main();
