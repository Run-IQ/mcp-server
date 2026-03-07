import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import { registerValidateRulesTool } from '../../src/tools/validate.js';
import { callTool } from '../helpers.js';

function makeRule(overrides: Record<string, unknown> = {}) {
  const params = { rate: 0.18, base: 'revenue' };
  return {
    id: 'test-rule',
    version: 1,
    model: 'FLAT_RATE',
    params,
    priority: 1000,
    effectiveFrom: '2025-01-01T00:00:00.000Z',
    effectiveUntil: null,
    tags: [],
    checksum: createHash('sha256').update(JSON.stringify(params)).digest('hex'),
    ...overrides,
  };
}

describe('validate_rules tool', () => {
  it('validates a correct rule', async () => {
    const { models } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerValidateRulesTool(server, models);

    const result = await callTool(server, 'validate_rules', {
      rules: [makeRule()],
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].valid).toBe(true);
  });

  it('detects checksum mismatch', async () => {
    const { models } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerValidateRulesTool(server, models);

    const result = await callTool(server, 'validate_rules', {
      rules: [makeRule({ checksum: 'bad-checksum' })],
    });

    expect(result.entries[0].valid).toBe(false);
    expect(result.entries[0].errors[0]).toContain('Checksum mismatch');
  });

  it('detects unknown model', async () => {
    const { models } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerValidateRulesTool(server, models);

    const params = { foo: 'bar' };
    const checksum = createHash('sha256').update(JSON.stringify(params)).digest('hex');
    const result = await callTool(server, 'validate_rules', {
      rules: [makeRule({ model: 'UNKNOWN_MODEL', params, checksum })],
    });

    expect(result.entries[0].valid).toBe(false);
    expect(result.entries[0].errors[0]).toContain('not found');
  });

  it('detects invalid params', async () => {
    const { models } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerValidateRulesTool(server, models);

    const params = { rate: 'not-a-number', base: 123 };
    const checksum = createHash('sha256').update(JSON.stringify(params)).digest('hex');
    const result = await callTool(server, 'validate_rules', {
      rules: [makeRule({ params, checksum })],
    });

    expect(result.entries[0].valid).toBe(false);
  });

  it('detects missing required fields', async () => {
    const { models } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerValidateRulesTool(server, models);

    const result = await callTool(server, 'validate_rules', {
      rules: [{ id: 'incomplete' }],
    });

    expect(result.entries[0].valid).toBe(false);
    expect(result.entries[0].errors.length).toBeGreaterThan(0);
  });
});
