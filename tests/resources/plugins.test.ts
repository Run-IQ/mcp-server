import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import { registerPluginsResource } from '../../src/resources/plugins.js';
import { readResource } from '../helpers.js';
import { mockBundle } from '../mocks.js';

describe('plugins://loaded resource', () => {
  it('returns JSON with loaded plugins and DSLs', async () => {
    const { plugins, dsls, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { resources: {} } },
    );
    registerPluginsResource(server, plugins, dsls, descriptorRegistry);

    const text = await readResource(server, 'plugins://loaded');
    const data = JSON.parse(text) as Record<string, unknown>;

    expect(data['plugins']).toBeDefined();
    expect(data['dsls']).toBeDefined();
  });

  it('includes plugin name, version, models, and descriptor info', async () => {
    const { plugins, dsls, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { resources: {} } },
    );
    registerPluginsResource(server, plugins, dsls, descriptorRegistry);

    const text = await readResource(server, 'plugins://loaded');
    const data = JSON.parse(text) as {
      plugins: Array<{
        name: string;
        version: string;
        models: string[];
        hasDescriptor: boolean;
        ruleExtensions: string[];
      }>;
    };

    expect(data.plugins).toHaveLength(1);
    const plugin = data.plugins[0]!;
    expect(plugin.name).toBe('mock-plugin');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.models).toContain('MOCK_RATE');
    expect(plugin.models).toContain('MOCK_DOUBLE');
    expect(plugin.hasDescriptor).toBe(true);
    expect(plugin.ruleExtensions).toContain('region');
    expect(plugin.ruleExtensions).toContain('sector');
  });

  it('includes DSL evaluator info', async () => {
    const { plugins, dsls, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { resources: {} } },
    );
    registerPluginsResource(server, plugins, dsls, descriptorRegistry);

    const text = await readResource(server, 'plugins://loaded');
    const data = JSON.parse(text) as {
      dsls: Array<{ name: string; version: string }>;
    };

    expect(data.dsls).toHaveLength(1);
    expect(data.dsls[0]!.name).toBe('mock-dsl');
    expect(data.dsls[0]!.version).toBe('1.0.0');
  });

  it('returns empty arrays when no bundles loaded', async () => {
    const { plugins, dsls, descriptorRegistry } = createEngine([]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { resources: {} } },
    );
    registerPluginsResource(server, plugins, dsls, descriptorRegistry);

    const text = await readResource(server, 'plugins://loaded');
    const data = JSON.parse(text) as {
      plugins: unknown[];
      dsls: unknown[];
    };

    expect(data.plugins).toEqual([]);
    expect(data.dsls).toEqual([]);
  });
});
