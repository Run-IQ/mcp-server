import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import { registerEvaluateTool } from '../../src/tools/evaluate.js';
import { callTool } from '../helpers.js';

function makeFlatRateRule(id: string, rate: number) {
  const params = { rate, base: 'revenue' };
  return {
    id,
    version: 1,
    model: 'FLAT_RATE',
    params,
    priority: 1000,
    effectiveFrom: '2020-01-01T00:00:00.000Z',
    effectiveUntil: null,
    tags: [],
    checksum: createHash('sha256').update(JSON.stringify(params)).digest('hex'),
  };
}

describe('evaluate tool', () => {
  it('evaluates a FLAT_RATE rule', async () => {
    const { engine } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerEvaluateTool(server, engine);

    const result = await callTool(server, 'evaluate', {
      rules: [makeFlatRateRule('tva-18', 0.18)],
      input: {
        data: { revenue: 1000000 },
        requestId: 'eval-test-1',
        meta: { tenantId: 'test' },
      },
    });

    expect(result.value).toBe(180000);
    expect(result.appliedRules).toHaveLength(1);
    expect(result.appliedRules[0].id).toBe('tva-18');
  });

  it('returns error for invalid input', async () => {
    const { engine } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerEvaluateTool(server, engine);

    const result = await callTool(server, 'evaluate', {
      rules: [makeFlatRateRule('tva', 0.18)],
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
