import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCreateRuleTool } from '../../src/tools/create-rule.js';
import { fiscalDescriptor } from '@run-iq/plugin-fiscal';
import { callTool } from '../helpers.js';

describe('create_rule tool (plugin-aware)', () => {
  it('creates a rule with fiscal extension fields', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerCreateRuleTool(server, [fiscalDescriptor]);

    const params = { rate: 0.18, base: 'revenue' };
    const result = await callTool(server, 'create_rule', {
      id: 'tva-18',
      model: 'FLAT_RATE',
      params,
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      jurisdiction: 'NATIONAL',
      scope: 'GLOBAL',
      country: 'TG',
      category: 'TVA',
    });

    const expectedChecksum = createHash('sha256').update(JSON.stringify(params)).digest('hex');

    expect(result.rule.id).toBe('tva-18');
    expect(result.rule.version).toBe(1);
    expect(result.rule.model).toBe('FLAT_RATE');
    expect(result.rule.checksum).toBe(expectedChecksum);
    expect(result.rule.jurisdiction).toBe('NATIONAL');
    expect(result.rule.scope).toBe('GLOBAL');
    expect(result.rule.country).toBe('TG');
    expect(result.rule.category).toBe('TVA');
    expect(result.rule.priority).toBe(1000);
  });

  it('creates a rule without extension fields when no descriptors', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerCreateRuleTool(server, []);

    const params = { rate: 0.1, base: 'amount' };
    const result = await callTool(server, 'create_rule', {
      id: 'basic-rule',
      model: 'FLAT_RATE',
      params,
      effectiveFrom: '2025-01-01T00:00:00.000Z',
    });

    expect(result.rule.id).toBe('basic-rule');
    expect(result.rule.jurisdiction).toBeUndefined();
  });

  it('includes condition when provided', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerCreateRuleTool(server, [fiscalDescriptor]);

    const result = await callTool(server, 'create_rule', {
      id: 'cond-rule',
      model: 'FLAT_RATE',
      params: { rate: 0.1, base: 'revenue' },
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      jurisdiction: 'NATIONAL',
      scope: 'GLOBAL',
      country: 'TG',
      category: 'TVA',
      condition: { dsl: 'jsonlogic', value: { '>=': [{ var: 'revenue' }, 100000] } },
    });

    expect(result.rule.condition).toEqual({
      dsl: 'jsonlogic',
      value: { '>=': [{ var: 'revenue' }, 100000] },
    });
  });
});
