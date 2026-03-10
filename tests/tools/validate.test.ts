import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { computeRuleChecksum } from '@run-iq/core';
import { createEngine } from '../../src/engine.js';
import { registerValidateRulesTool } from '../../src/tools/validate.js';
import { callTool } from '../helpers.js';
import { mockBundle } from '../mocks.js';

function makeRule(overrides: Record<string, unknown> = {}) {
  const base = {
    id: 'test-rule',
    version: 1,
    model: 'MOCK_RATE',
    params: { rate: 0.18, base: 'revenue' },
    priority: 1000,
    effectiveFrom: '2025-01-01T00:00:00.000Z',
    effectiveUntil: null,
    tags: [],
    region: 'NORTH',
    sector: 'PUBLIC',
  };
  const merged = { ...base, ...overrides };
  if (!overrides['checksum']) {
    merged['checksum'] = computeRuleChecksum(merged);
  }
  return merged;
}

describe('validate_rules tool (plugin-aware)', () => {
  it('validates a correct rule with extension fields', async () => {
    const { models, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerValidateRulesTool(server, models, descriptorRegistry.getAll());

    const result = await callTool(server, 'validate_rules', {
      rules: [makeRule()],
    });

    expect(result.entries).toHaveLength(1);
    expect((result.entries as Array<{ valid: boolean }>)[0]!.valid).toBe(true);
  });

  it('detects missing extension fields', async () => {
    const { models, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerValidateRulesTool(server, models, descriptorRegistry.getAll());

    const ruleWithoutExtension = makeRule();
    delete (ruleWithoutExtension as Record<string, unknown>)['region'];
    delete (ruleWithoutExtension as Record<string, unknown>)['sector'];

    const result = await callTool(server, 'validate_rules', {
      rules: [ruleWithoutExtension],
    });

    const entry = (result.entries as Array<{ valid: boolean; errors: string[] }>)[0]!;
    expect(entry.valid).toBe(false);
    expect(entry.errors.some((e: string) => e.includes('region'))).toBe(true);
    expect(entry.errors.some((e: string) => e.includes('sector'))).toBe(true);
  });

  it('detects invalid enum values', async () => {
    const { models, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerValidateRulesTool(server, models, descriptorRegistry.getAll());

    const result = await callTool(server, 'validate_rules', {
      rules: [makeRule({ region: 'INVALID_REGION' })],
    });

    const entry = (result.entries as Array<{ valid: boolean; errors: string[] }>)[0]!;
    expect(entry.valid).toBe(false);
    expect(entry.errors.some((e: string) => e.includes('NORTH'))).toBe(true);
  });

  it('detects checksum mismatch', async () => {
    const { models, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerValidateRulesTool(server, models, descriptorRegistry.getAll());

    const result = await callTool(server, 'validate_rules', {
      rules: [makeRule({ checksum: 'bad-checksum' })],
    });

    const entry = (result.entries as Array<{ valid: boolean; errors: string[] }>)[0]!;
    expect(entry.valid).toBe(false);
    expect(entry.errors[0]).toContain('Checksum mismatch');
  });

  it('detects unknown model', async () => {
    const { models, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerValidateRulesTool(server, models, descriptorRegistry.getAll());

    const unknownRule = makeRule({ model: 'UNKNOWN_MODEL', params: { foo: 'bar' } });
    // Recompute checksum for the modified rule
    delete (unknownRule as Record<string, unknown>)['checksum'];
    unknownRule['checksum'] = computeRuleChecksum(unknownRule);

    const result = await callTool(server, 'validate_rules', {
      rules: [unknownRule],
    });

    const entry = (result.entries as Array<{ valid: boolean; errors: string[] }>)[0]!;
    expect(entry.valid).toBe(false);
    expect(entry.errors.some((e: string) => e.includes('not found'))).toBe(true);
  });
});
