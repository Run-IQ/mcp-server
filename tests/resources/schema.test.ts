import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import { registerSchemaResource } from '../../src/resources/schema.js';
import { readResource } from '../helpers.js';

describe('schema://rules resource', () => {
  it('returns complete rule schema documentation', async () => {
    const { models, descriptorRegistry } = createEngine();
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { resources: {} } },
    );
    registerSchemaResource(server, models, descriptorRegistry);

    const text = await readResource(server, 'schema://rules');

    // Base fields
    expect(text).toContain('Base Rule Fields');
    expect(text).toContain('effectiveFrom');

    // Plugin extensions
    expect(text).toContain('Plugin Extension Fields');
    expect(text).toContain('jurisdiction');
    expect(text).toContain('NATIONAL');
    expect(text).toContain('scope');
    expect(text).toContain('country');
    expect(text).toContain('category');

    // Models
    expect(text).toContain('FLAT_RATE');
    expect(text).toContain('PROGRESSIVE_BRACKET');

    // Input fields
    expect(text).toContain('Input Data Fields');
    expect(text).toContain('revenue');

    // JSONLogic
    expect(text).toContain('JSONLogic');

    // Examples
    expect(text).toContain('Complete Rule Examples');
    expect(text).toContain('VAT / TVA');
  });
});
