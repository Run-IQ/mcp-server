import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import { registerInspectRuleTool } from '../../src/tools/inspect-rule.js';
import { callTool } from '../helpers.js';

function makeRule(overrides: Record<string, unknown> = {}) {
  const params = { rate: 0.18, base: 'revenue' };
  return {
    id: 'inspect-test',
    version: 1,
    model: 'FLAT_RATE',
    params,
    priority: 1000,
    effectiveFrom: '2020-01-01T00:00:00.000Z',
    effectiveUntil: null,
    tags: [],
    checksum: createHash('sha256').update(JSON.stringify(params)).digest('hex'),
    ...overrides,
  };
}

describe('inspect_rule tool', () => {
  it('reports a valid active rule', async () => {
    const { models } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerInspectRuleTool(server, models);

    const result = await callTool(server, 'inspect_rule', { rule: makeRule() });

    expect(result.valid).toBe(true);
    expect(result.checksumMatch).toBe(true);
    expect(result.modelFound).toBe(true);
    expect(result.isActive).toBe(true);
  });

  it('detects checksum mismatch', async () => {
    const { models } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerInspectRuleTool(server, models);

    const result = await callTool(server, 'inspect_rule', {
      rule: makeRule({ checksum: 'wrong' }),
    });

    expect(result.checksumMatch).toBe(false);
    expect(result.valid).toBe(false);
  });

  it('detects expired rule', async () => {
    const { models } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerInspectRuleTool(server, models);

    const result = await callTool(server, 'inspect_rule', {
      rule: makeRule({ effectiveUntil: '2020-06-01T00:00:00.000Z' }),
    });

    expect(result.isActive).toBe(false);
    expect(result.valid).toBe(false);
  });

  it('detects unknown model', async () => {
    const { models } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerInspectRuleTool(server, models);

    const result = await callTool(server, 'inspect_rule', {
      rule: makeRule({ model: 'NONEXISTENT' }),
    });

    expect(result.modelFound).toBe(false);
    expect(result.valid).toBe(false);
  });
});
