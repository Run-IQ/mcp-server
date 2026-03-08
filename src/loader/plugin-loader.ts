import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import type { PluginBundle } from '@run-iq/plugin-sdk';

const require = createRequire(import.meta.url);

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
      const resolvedPath = require.resolve(pkgName, { paths: [process.cwd()] });
      const mod = await import(pathToFileURL(resolvedPath).href);
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
