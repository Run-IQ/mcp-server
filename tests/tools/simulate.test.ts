import { createHash } from 'node:crypto';
import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import { registerSimulateTool } from '../../src/tools/simulate.js';
import { callTool } from '../helpers.js';

function makeFlatRateRule(rate: number) {
  const params = { rate, base: 'revenue' };
  return {
    id: `flat-${rate}`,
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

describe('simulate tool', () => {
  it('compares two scenarios', async () => {
    const { engine } = createEngine();
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerSimulateTool(server, engine);

    const result = await callTool(server, 'simulate', {
      rules: [makeFlatRateRule(0.18)],
      scenarios: [
        {
          label: 'Small business',
          input: {
            data: { revenue: 500000 },
            requestId: 'sim-1',
            meta: { tenantId: 'test' },
          },
        },
        {
          label: 'Large business',
          input: {
            data: { revenue: 5000000 },
            requestId: 'sim-2',
            meta: { tenantId: 'test' },
          },
        },
      ],
    });

    expect(result.results).toHaveLength(2);
    expect(result.results[0].label).toBe('Small business');
    expect(result.results[0].value).toBe(90000);
    expect(result.results[1].label).toBe('Large business');
    expect(result.results[1].value).toBe(900000);
  });
});
