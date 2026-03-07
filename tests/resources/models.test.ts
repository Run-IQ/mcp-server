import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import { registerModelsResource } from '../../src/resources/models.js';
import { readResource } from '../helpers.js';

describe('models://catalog resource', () => {
  it('returns markdown documentation of all models', async () => {
    const { models } = createEngine();
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { resources: {} } },
    );
    registerModelsResource(server, models);

    const text = await readResource(server, 'models://catalog');

    expect(text).toContain('FLAT_RATE');
    expect(text).toContain('PROGRESSIVE_BRACKET');
    expect(text).toContain('MINIMUM_TAX');
    expect(text).toContain('THRESHOLD_BASED');
    expect(text).toContain('FIXED_AMOUNT');
    expect(text).toContain('COMPOSITE');
    expect(text).toContain('# Run-IQ Fiscal Calculation Models');
  });
});
