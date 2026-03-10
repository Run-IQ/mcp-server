import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { computeRuleChecksum } from '@run-iq/core';
import { registerCreateRuleTool } from '../../src/tools/create-rule.js';
import { mockDescriptor } from '../mocks.js';
import { callTool } from '../helpers.js';

describe('create_rule tool (plugin-aware)', () => {
  it('creates a rule with extension fields', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerCreateRuleTool(server, [mockDescriptor]);

    const params = { rate: 0.18, base: 'revenue' };
    const result = await callTool(server, 'create_rule', {
      id: 'mock-18',
      model: 'MOCK_RATE',
      params,
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      region: 'NORTH',
      sector: 'PUBLIC',
    });

    // The checksum is computed from the full rule including extension fields
    const expectedRule = {
      id: 'mock-18',
      version: 1,
      model: 'MOCK_RATE',
      params,
      priority: 1000,
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      effectiveUntil: null,
      tags: [],
      region: 'NORTH',
      sector: 'PUBLIC',
    };
    const expectedChecksum = computeRuleChecksum(expectedRule);

    expect(result.rule.id).toBe('mock-18');
    expect(result.rule.version).toBe(1);
    expect(result.rule.model).toBe('MOCK_RATE');
    expect(result.rule.checksum).toBe(expectedChecksum);
    expect(result.rule.region).toBe('NORTH');
    expect(result.rule.sector).toBe('PUBLIC');
    expect(result.rule.priority).toBe(1000);
  });

  it('creates a rule without extension fields when no descriptors', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerCreateRuleTool(server, []);

    const params = { rate: 0.1, base: 'amount' };
    const result = await callTool(server, 'create_rule', {
      id: 'basic-rule',
      model: 'MOCK_RATE',
      params,
      effectiveFrom: '2025-01-01T00:00:00.000Z',
    });

    expect(result.rule.id).toBe('basic-rule');
    expect(result.rule.region).toBeUndefined();
  });

  it('includes condition when provided', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerCreateRuleTool(server, [mockDescriptor]);

    const result = await callTool(server, 'create_rule', {
      id: 'cond-rule',
      model: 'MOCK_RATE',
      params: { rate: 0.1, base: 'revenue' },
      effectiveFrom: '2025-01-01T00:00:00.000Z',
      region: 'NORTH',
      sector: 'PUBLIC',
      condition: { dsl: 'jsonlogic', value: { '>=': [{ var: 'revenue' }, 100000] } },
    });

    expect(result.rule.condition).toEqual({
      dsl: 'jsonlogic',
      value: { '>=': [{ var: 'revenue' }, 100000] },
    });
  });
});
