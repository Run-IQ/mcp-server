import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import type { PluginBundle } from '@run-iq/plugin-sdk';

const require = createRequire(import.meta.url);
const AUTO_PLUGINS_DIR = resolve(homedir(), '.run-iq', 'mcp-plugins');

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
        console.error(`[PluginLoader] Invalid PluginBundle in package: ${pkgName}`);
      }
    } catch (err) {
      console.error(`[PluginLoader] Failed to load NPM plugin "${pkgName}":`, err instanceof Error ? err.message : err);
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

  // 3. Install dynamically
  ensurePluginsDir();
  console.log(`[PluginLoader] Installing ${pkgName} dynamically...`);
  
  execSync(`npm install ${pkgName} --no-save`, {
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
    let bundle = (mod.default ?? mod) as any;

    // Handle bundles nested under a 'bundle' property (common in some build setups)
    if (!bundle.plugin && bundle.bundle?.plugin) {
      bundle = bundle.bundle;
    }

    if (isValidBundle(bundle)) {
      return bundle as PluginBundle;
    }
  } catch (err) {
    console.error(`[PluginLoader] Import error for ${url}:`, err);
  }
  return null;
}

/**
 * Validates that an object conforms to the PluginBundle interface.
 */
function isValidBundle(obj: any): boolean {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.plugin === 'object' &&
    typeof obj.descriptor === 'object'
  );
}
