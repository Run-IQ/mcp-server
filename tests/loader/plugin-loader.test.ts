import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadPluginsFromDir, loadNpmPlugins } from '../../src/loader/plugin-loader.js';

/**
 * Create a temporary directory with a unique name for each test.
 */
function makeTmpDir(): string {
  const dir = resolve(tmpdir(), `run-iq-loader-test-${Date.now()}-${Math.floor(Math.random() * 10000)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('loadPluginsFromDir', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns empty array for non-existent directory', async () => {
    const result = await loadPluginsFromDir(resolve(tmpDir, 'does-not-exist'));
    expect(result).toEqual([]);
  });

  it('returns empty array for empty directory', async () => {
    const result = await loadPluginsFromDir(tmpDir);
    expect(result).toEqual([]);
  });

  it('skips non-js/mjs files', async () => {
    writeFileSync(join(tmpDir, 'readme.txt'), 'not a plugin');
    writeFileSync(join(tmpDir, 'data.json'), '{}');

    const result = await loadPluginsFromDir(tmpDir);
    expect(result).toEqual([]);
  });

  it('skips js files that do not export a valid bundle', async () => {
    // Write a module that exports something that is NOT a valid PluginBundle
    writeFileSync(
      join(tmpDir, 'bad-plugin.mjs'),
      'export default { notAPlugin: true };',
    );

    // Suppress stderr output during test
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const result = await loadPluginsFromDir(tmpDir);
    expect(result).toEqual([]);

    stderrSpy.mockRestore();
  });

  it('loads a valid bundle from a .mjs file', async () => {
    // Write a module that exports a valid PluginBundle shape
    const bundleCode = `
export default {
  plugin: {
    name: 'test-plugin',
    version: '1.0.0',
    onInit() {},
    onError() {},
  },
  descriptor: {
    name: 'test-plugin',
    version: '1.0.0',
    description: 'Test plugin',
    domainLabel: 'test',
    ruleExtensions: [],
    inputFields: [],
    examples: [],
    promptGuidelines: [],
  },
};
`;
    writeFileSync(join(tmpDir, 'valid-plugin.mjs'), bundleCode);

    const result = await loadPluginsFromDir(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0]!.plugin.name).toBe('test-plugin');
    expect(result[0]!.descriptor.name).toBe('test-plugin');
  });
});

describe('isValidBundle (via loadPluginsFromDir)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('rejects bundle with missing plugin property', async () => {
    writeFileSync(
      join(tmpDir, 'no-plugin.mjs'),
      'export default { descriptor: { name: "x" } };',
    );

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const result = await loadPluginsFromDir(tmpDir);
    expect(result).toEqual([]);
    stderrSpy.mockRestore();
  });

  it('rejects bundle with missing descriptor property', async () => {
    writeFileSync(
      join(tmpDir, 'no-descriptor.mjs'),
      'export default { plugin: { name: "x", version: "1.0.0" } };',
    );

    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const result = await loadPluginsFromDir(tmpDir);
    expect(result).toEqual([]);
    stderrSpy.mockRestore();
  });

  it('accepts bundle with valid plugin and descriptor objects', async () => {
    const bundleCode = `
export default {
  plugin: { name: 'ok', version: '1.0.0', onInit() {}, onError() {} },
  descriptor: {
    name: 'ok',
    version: '1.0.0',
    description: 'ok',
    domainLabel: 'ok',
    ruleExtensions: [],
    inputFields: [],
    examples: [],
    promptGuidelines: [],
  },
};
`;
    writeFileSync(join(tmpDir, 'ok-bundle.mjs'), bundleCode);

    const result = await loadPluginsFromDir(tmpDir);
    expect(result).toHaveLength(1);
  });
});

describe('loadNpmPlugins allowlist', () => {
  it('rejects non-@run-iq packages', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    // This should fail because 'some-random-pkg' does not match @run-iq/*
    const result = await loadNpmPlugins(['some-random-pkg']);
    expect(result).toEqual([]);

    // Verify that an error was written to stderr about the package not being allowed
    const calls = stderrSpy.mock.calls.map((c) => String(c[0]));
    const hasAllowlistError = calls.some((msg) => msg.includes('not allowed'));
    expect(hasAllowlistError).toBe(true);

    stderrSpy.mockRestore();
  });
});
