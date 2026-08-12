import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { load as parseYaml } from 'js-yaml';
import { AppConfigSchema, type AppConfig } from '../schemas/config.js';

const CONFIG_PATH = resolve(process.cwd(), 'config', 'config.yaml');

let cachedConfig: AppConfig | null = null;

export function loadConfig(path?: string): AppConfig {
  if (cachedConfig) return cachedConfig;

  const filePath = path ?? CONFIG_PATH;
  let raw: unknown;
  try {
    const content = readFileSync(filePath, 'utf-8');
    raw = parseYaml(content);
  } catch (err) {
    throw new Error(`Failed to read config at ${filePath}: ${err}`);
  }

  const parsed = AppConfigSchema.safeParse(raw);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid config: ${errors}`);
  }

  cachedConfig = parsed.data;
  return parsed.data;
}

export function resetConfigCache(): void {
  cachedConfig = null;
}

export function getConfig(): AppConfig {
  if (!cachedConfig) {
    return loadConfig();
  }
  return cachedConfig;
}
