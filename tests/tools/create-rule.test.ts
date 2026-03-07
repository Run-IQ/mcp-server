import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCreateRuleTool } from '../../src/tools/create-rule.js';
import { callTool } from '../helpers.js';

describe('create_rule tool', () => {
  it('creates a rule with correct checksum', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerCreateRuleTool(server);

    const params = { rate: 0.18, base: 'revenue' };
    const result = await callTool(server, 'create_rule', {
      id: 'tva-18',
      model: 'FLAT_RATE',
      params,
      priority: 1000,
      effectiveFrom: '2025-01-01T00:00:00.000Z',
    });

    const expectedChecksum = createHash('sha256').update(JSON.stringify(params)).digest('hex');

    expect(result.rule.id).toBe('tva-18');
    expect(result.rule.version).toBe(1);
    expect(result.rule.model).toBe('FLAT_RATE');
    expect(result.rule.checksum).toBe(expectedChecksum);
    expect(result.rule.tags).toEqual([]);
    expect(result.rule.effectiveUntil).toBeNull();
  });

  it('includes condition when provided', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerCreateRuleTool(server);

    const result = await callTool(server, 'create_rule', {
      id: 'cond-rule',
      model: 'FLAT_RATE',
      params: { rate: 0.1, base: 'amount' },
      priority: 500,
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      condition: { dsl: 'jsonlogic', value: { '>=': [{ var: 'amount' }, 100000] } },
    });

    expect(result.rule.condition).toEqual({
      dsl: 'jsonlogic',
      value: { '>=': [{ var: 'amount' }, 100000] },
    });
  });
});
