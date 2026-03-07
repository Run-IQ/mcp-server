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
    jurisdiction: 'NATIONAL',
    scope: 'GLOBAL',
    country: 'TG',
    category: 'TVA',
    ...overrides,
  };
}

describe('validate_rules tool (plugin-aware)', () => {
  it('validates a correct rule with fiscal fields', async () => {
    const { models, descriptorRegistry } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerValidateRulesTool(server, models, descriptorRegistry.getAll());

    const result = await callTool(server, 'validate_rules', {
      rules: [makeRule()],
    });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].valid).toBe(true);
  });

  it('detects missing fiscal extension fields', async () => {
    const { models, descriptorRegistry } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerValidateRulesTool(server, models, descriptorRegistry.getAll());

    const ruleWithoutFiscal = makeRule();
    delete (ruleWithoutFiscal as Record<string, unknown>)['jurisdiction'];
    delete (ruleWithoutFiscal as Record<string, unknown>)['scope'];

    const result = await callTool(server, 'validate_rules', {
      rules: [ruleWithoutFiscal],
    });

    expect(result.entries[0].valid).toBe(false);
    expect(result.entries[0].errors.some((e: string) => e.includes('jurisdiction'))).toBe(true);
    expect(result.entries[0].errors.some((e: string) => e.includes('scope'))).toBe(true);
  });

  it('detects invalid enum values', async () => {
    const { models, descriptorRegistry } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerValidateRulesTool(server, models, descriptorRegistry.getAll());

    const result = await callTool(server, 'validate_rules', {
      rules: [makeRule({ jurisdiction: 'INVALID_JURISDICTION' })],
    });

    expect(result.entries[0].valid).toBe(false);
    expect(result.entries[0].errors.some((e: string) => e.includes('NATIONAL'))).toBe(true);
  });

  it('detects checksum mismatch', async () => {
    const { models, descriptorRegistry } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerValidateRulesTool(server, models, descriptorRegistry.getAll());

    const result = await callTool(server, 'validate_rules', {
      rules: [makeRule({ checksum: 'bad-checksum' })],
    });

    expect(result.entries[0].valid).toBe(false);
    expect(result.entries[0].errors[0]).toContain('Checksum mismatch');
  });

  it('detects unknown model', async () => {
    const { models, descriptorRegistry } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerValidateRulesTool(server, models, descriptorRegistry.getAll());

    const params = { foo: 'bar' };
    const checksum = createHash('sha256').update(JSON.stringify(params)).digest('hex');
    const result = await callTool(server, 'validate_rules', {
      rules: [makeRule({ model: 'UNKNOWN_MODEL', params, checksum })],
    });

    expect(result.entries[0].valid).toBe(false);
    expect(result.entries[0].errors.some((e: string) => e.includes('not found'))).toBe(true);
  });
});
