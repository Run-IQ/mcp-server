import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { computeRuleChecksum } from '@run-iq/core';
import { createEngine } from '../../src/engine.js';
import { registerInspectRuleTool } from '../../src/tools/inspect-rule.js';
import { callTool } from '../helpers.js';
import { mockBundle } from '../mocks.js';

function makeRule(overrides: Record<string, unknown> = {}) {
  const base = {
    id: 'inspect-test',
    version: 1,
    model: 'MOCK_RATE',
    params: { rate: 0.18, base: 'revenue' },
    priority: 1000,
    effectiveFrom: '2020-01-01T00:00:00.000Z',
    effectiveUntil: null,
    tags: [],
    region: 'NORTH',
    sector: 'PUBLIC',
  };
  const merged = { ...base, ...overrides };
  if (!overrides['checksum']) {
    // Compute checksum from the full rule (without checksum field)
    merged['checksum'] = computeRuleChecksum(merged);
  }
  return merged;
}

describe('inspect_rule tool (plugin-aware)', () => {
  it('reports a valid active rule with extension fields', async () => {
    const { models, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerInspectRuleTool(server, models, descriptorRegistry.getAll());

    const result = await callTool(server, 'inspect_rule', { rule: makeRule() });

    expect(result.valid).toBe(true);
    expect(result.checksumMatch).toBe(true);
    expect(result.modelFound).toBe(true);
    expect(result.isActive).toBe(true);
    expect(result.extensionErrors).toBeUndefined();
  });

  it('detects missing extension fields', async () => {
    const { models, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerInspectRuleTool(server, models, descriptorRegistry.getAll());

    const ruleWithout = makeRule();
    delete (ruleWithout as Record<string, unknown>)['region'];

    const result = await callTool(server, 'inspect_rule', { rule: ruleWithout });

    expect(result.valid).toBe(false);
    expect(result.extensionErrors).toBeDefined();
    expect((result.extensionErrors as string[]).some((e) => e.includes('region'))).toBe(true);
  });

  it('detects checksum mismatch', async () => {
    const { models, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerInspectRuleTool(server, models, descriptorRegistry.getAll());

    const result = await callTool(server, 'inspect_rule', {
      rule: makeRule({ checksum: 'wrong' }),
    });

    expect(result.checksumMatch).toBe(false);
    expect(result.valid).toBe(false);
  });

  it('detects expired rule', async () => {
    const { models, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerInspectRuleTool(server, models, descriptorRegistry.getAll());

    const result = await callTool(server, 'inspect_rule', {
      rule: makeRule({ effectiveUntil: '2020-06-01T00:00:00.000Z' }),
    });

    expect(result.isActive).toBe(false);
    expect(result.valid).toBe(false);
  });
});
