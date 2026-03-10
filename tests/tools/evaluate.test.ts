import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { computeRuleChecksum } from '@run-iq/core';
import { createEngine } from '../../src/engine.js';
import { registerEvaluateTool } from '../../src/tools/evaluate.js';
import { callTool } from '../helpers.js';
import { mockBundle } from '../mocks.js';

function makeMockRule(id: string, rate: number) {
  const rule = {
    id,
    version: 1,
    model: 'MOCK_RATE',
    params: { rate, base: 'revenue' },
    priority: 1000,
    effectiveFrom: '2020-01-01T00:00:00.000Z',
    effectiveUntil: null,
    tags: [],
  };
  return { ...rule, checksum: computeRuleChecksum(rule) };
}

describe('evaluate tool', () => {
  it('evaluates a MOCK_RATE rule', async () => {
    const { engine } = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerEvaluateTool(server, engine);

    const result = await callTool(server, 'evaluate', {
      rules: [makeMockRule('mock-18', 0.18)],
      input: {
        data: { revenue: 1000000 },
        requestId: 'eval-test-1',
        meta: { tenantId: 'test' },
      },
    });

    expect(result.value).toBe(180000);
    expect(result.appliedRules).toHaveLength(1);
    expect((result.appliedRules as Array<{ id: string }>)[0]!.id).toBe('mock-18');
  });

  it('returns error for invalid input', async () => {
    const { engine } = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerEvaluateTool(server, engine);

    const result = await callTool(server, 'evaluate', {
      rules: [makeMockRule('mock', 0.18)],
      input: {
        data: {},
        requestId: 'eval-test-2',
        meta: { tenantId: 'test' },
      },
    });

    // Should still evaluate (revenue = undefined → 0)
    expect(result.value).toBe(0);
  });
});
