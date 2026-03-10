import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import { registerListModelsTool } from '../../src/tools/list-models.js';
import { callTool } from '../helpers.js';
import { mockBundle } from '../mocks.js';

describe('list_models tool', () => {
  it('lists all mock models', async () => {
    const { models } = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerListModelsTool(server, models);

    const result = await callTool(server, 'list_models', {});
    const names = (result.models as Array<{ name: string }>).map((m) => m.name);

    expect(names).toContain('MOCK_RATE');
    expect(names).toContain('MOCK_DOUBLE');
  });

  it('includes version info', async () => {
    const { models } = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerListModelsTool(server, models);

    const result = await callTool(server, 'list_models', {});

    for (const model of result.models as Array<{ version: string }>) {
      expect(model.version).toBeDefined();
      expect(typeof model.version).toBe('string');
    }
  });
});
