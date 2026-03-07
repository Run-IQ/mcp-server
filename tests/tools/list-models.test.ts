import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import { registerListModelsTool } from '../../src/tools/list-models.js';
import { callTool } from '../helpers.js';

describe('list_models tool', () => {
  it('lists all 6 fiscal models', async () => {
    const { models } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerListModelsTool(server, models);

    const result = await callTool(server, 'list_models', {});
    const names = result.models.map((m: { name: string }) => m.name);

    expect(names).toContain('FLAT_RATE');
    expect(names).toContain('PROGRESSIVE_BRACKET');
    expect(names).toContain('MINIMUM_TAX');
    expect(names).toContain('THRESHOLD_BASED');
    expect(names).toContain('FIXED_AMOUNT');
    expect(names).toContain('COMPOSITE');
  });

  it('includes version info', async () => {
    const { models } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerListModelsTool(server, models);

    const result = await callTool(server, 'list_models', {});

    for (const model of result.models) {
      expect(model.version).toBeDefined();
      expect(typeof model.version).toBe('string');
    }
  });
});
