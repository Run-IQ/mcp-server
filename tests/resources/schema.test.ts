import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import { registerSchemaResource } from '../../src/resources/schema.js';
import { readResource } from '../helpers.js';
import { mockBundle } from '../mocks.js';

describe('schema://rules resource', () => {
  it('returns complete rule schema documentation', async () => {
    const { models, descriptorRegistry, dsls } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { resources: {} } },
    );
    registerSchemaResource(server, models, descriptorRegistry, dsls);

    const text = await readResource(server, 'schema://rules');

    // Base fields
    expect(text).toContain('Base Rule Fields');
    expect(text).toContain('effectiveFrom');

    // Plugin extensions
    expect(text).toContain('Plugin Extension Fields');
    expect(text).toContain('region');
    expect(text).toContain('NORTH');
    expect(text).toContain('sector');

    // Models
    expect(text).toContain('MOCK_RATE');
    expect(text).toContain('MOCK_DOUBLE');

    // Input fields
    expect(text).toContain('Input Data Fields');
    expect(text).toContain('revenue');

    // DSL section only appears when DSLs are loaded (mock bundle has none)
    // Models section is always present
    expect(text).toContain('Available Calculation Models');

    // Examples
    expect(text).toContain('Complete Rule Examples');
    expect(text).toContain('Basic rate calculation');
  });
});
