import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import type { PluginBundle } from '@run-iq/plugin-sdk';

const require = createRequire(import.meta.url);
const AUTO_PLUGINS_DIR = resolve(homedir(), '.run-iq', 'mcp-plugins');

/** Only packages matching this pattern can be auto-installed. */
const ALLOWED_PKG_PATTERN = /^@run-iq\//;

/**
 * Loads all plugin bundles from a directory.
 */
export async function loadPluginsFromDir(dir: string): Promise<PluginBundle[]> {
  const bundles: PluginBundle[] = [];
  const absoluteDir = resolve(dir);

  if (!existsSync(absoluteDir)) return [];

  const entries = await readdir(absoluteDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile() || !/\.(mjs|js)$/.test(entry.name)) continue;

    const filePath = resolve(absoluteDir, entry.name);
    const bundle = await importBundle(pathToFileURL(filePath).href);
    if (bundle) bundles.push(bundle);
  }

  return bundles;
}

/**
 * Loads plugin bundles from NPM packages, installing them if necessary.
 */
export async function loadNpmPlugins(packageNames: string[]): Promise<PluginBundle[]> {
  const bundles: PluginBundle[] = [];

  for (const pkgName of packageNames) {
    try {
      const resolvedPath = await resolveOrInstallPlugin(pkgName);
      const bundle = await importBundle(pathToFileURL(resolvedPath).href);

      if (bundle) {
        bundles.push(bundle);
      } else {
        process.stderr.write(`[PluginLoader] Invalid PluginBundle in package: ${pkgName}\n`);
      }
    } catch (err) {
      process.stderr.write(`[PluginLoader] Failed to load NPM plugin "${pkgName}": ${err instanceof Error ? err.message : String(err)}\n`);
    }
  }

  return bundles;
}

/**
 * Attempts to resolve a plugin package, installing it in .mcp-plugins if not found.
 */
async function resolveOrInstallPlugin(pkgName: string): Promise<string> {
  // 1. Try local node_modules first
  try {
    return require.resolve(pkgName, { paths: [process.cwd()] });
  } catch {
    /* Not found locally */
  }

  // 2. Try .mcp-plugins directory
  try {
    return require.resolve(pkgName, { paths: [AUTO_PLUGINS_DIR] });
  } catch {
    /* Not found in auto-plugins dir */
  }

  // 3. Install dynamically — only @run-iq/* packages allowed
  if (!ALLOWED_PKG_PATTERN.test(pkgName)) {
    throw new Error(
      `[PluginLoader] Package "${pkgName}" is not allowed. Only @run-iq/* packages can be auto-installed.`,
    );
  }

  ensurePluginsDir();
  process.stderr.write(`[PluginLoader] Installing ${pkgName} dynamically...\n`);

  execFileSync('npm', ['install', pkgName, '--no-save'], {
    cwd: AUTO_PLUGINS_DIR,
    stdio: 'inherit',
  });

  return require.resolve(pkgName, { paths: [AUTO_PLUGINS_DIR] });
}

/**
 * Ensures the .mcp-plugins directory exists and is initialized.
 */
function ensurePluginsDir(): void {
  if (!existsSync(AUTO_PLUGINS_DIR)) {
    mkdirSync(AUTO_PLUGINS_DIR, { recursive: true });
    writeFileSync(
      join(AUTO_PLUGINS_DIR, 'package.json'),
      JSON.stringify({ name: 'mcp-plugins', private: true, version: '1.0.0' }, null, 2),
    );
  }
}

/**
 * Safely imports a module and extracts the PluginBundle.
 */
async function importBundle(url: string): Promise<PluginBundle | null> {
  try {
    const mod = await import(url);
    let bundle: unknown = mod.default ?? mod;

    // Handle bundles nested under a 'bundle' property (common in some build setups)
    if (isRecord(bundle) && !bundle['plugin'] && isRecord(bundle['bundle']) && bundle['bundle']['plugin']) {
      bundle = bundle['bundle'];
    }

    if (isValidBundle(bundle)) {
      return bundle;
    }
  } catch (err) {
    process.stderr.write(`[PluginLoader] Import error for ${url}: ${err instanceof Error ? err.message : String(err)}\n`);
  }
  return null;
}

/**
 * Type guard: checks whether a value is a non-null record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Type guard: validates that an object conforms to the PluginBundle interface.
 */
function isValidBundle(obj: unknown): obj is PluginBundle {
  if (!isRecord(obj)) return false;
  const plugin = obj['plugin'];
  const descriptor = obj['descriptor'];
  if (!isRecord(plugin) || !isRecord(descriptor)) return false;
  if (typeof plugin['name'] !== 'string' || plugin['name'].length === 0) return false;
  if (typeof plugin['version'] !== 'string') return false;
  if (typeof descriptor['name'] !== 'string' || descriptor['name'].length === 0) return false;
  return true;
}
