import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { PluginBundle } from '@run-iq/plugin-sdk';

export async function loadPluginsFromDir(dir: string): Promise<PluginBundle[]> {
  const bundles: PluginBundle[] = [];
  const absoluteDir = resolve(dir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.js') && !entry.name.endsWith('.mjs')) continue;

    const filePath = resolve(absoluteDir, entry.name);
    const mod: Record<string, unknown> = await import(filePath);

    const bundle = (mod['default'] ?? mod) as Record<string, unknown>;

    if (
      bundle['plugin'] &&
      typeof bundle['plugin'] === 'object' &&
      bundle['descriptor'] &&
      typeof bundle['descriptor'] === 'object'
    ) {
      bundles.push(bundle as unknown as PluginBundle);
    }
  }

  return bundles;
}

export async function loadNpmPlugins(packageNames: string[]): Promise<PluginBundle[]> {
  const bundles: PluginBundle[] = [];

  for (const pkgName of packageNames) {
    try {
      const mod = await import(pkgName);
      const bundle = (mod['default'] ?? mod) as Record<string, unknown>;

      if (
        bundle['plugin'] &&
        typeof bundle['plugin'] === 'object' &&
        bundle['descriptor'] &&
        typeof bundle['descriptor'] === 'object'
      ) {
        bundles.push(bundle as unknown as PluginBundle);
      } else {
        // eslint-disable-next-line no-console
        console.error(`Invalid PluginBundle exported by NPM package: ${pkgName}`);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Failed to load NPM plugin: ${pkgName}`, err);
    }
  }

  return bundles;
}
