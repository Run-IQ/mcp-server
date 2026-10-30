import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import type { EngineContext } from '../../src/engine.js';
import { registerSimulateGraphTool } from '../../src/tools/simulate-graph.js';
import { callTool, callToolRaw } from '../helpers.js';
import { mockBundle } from '../mocks.js';
import { linearGraph, execMeta } from '../graph-fixtures.js';

function makeServer(ctx: EngineContext): McpServer {
  const server = new McpServer({ name: 'test', version: '0.0.1' });
  registerSimulateGraphTool(server, ctx.compiler, ctx.orchestrator, ctx.graphStore);
  return server;
}

describe('simulate_graph tool', () => {
  it('runs each scenario and returns labelled results', async () => {
    const ctx = createEngine([mockBundle]);

    const result = await callTool(makeServer(ctx), 'simulate_graph', {
      graph: linearGraph(),
      scenarios: [
        { label: 'Small', input: { revenue: 100 }, meta: execMeta('sim-1') },
        { label: 'Large', input: { revenue: 100000 }, meta: execMeta('sim-2') },
      ],
    });

    const results = result.results as Array<Record<string, unknown>>;
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.label)).toEqual(['Small', 'Large']);
    for (const r of results) {
      expect(r.status).toBe('completed');
      expect(r.executedCount).toBe(2);
      expect(r.failedCount).toBe(0);
    }
  });

  it('returns an error when no graph is found', async () => {
    const ctx = createEngine([mockBundle]);

    const result = await callToolRaw(makeServer(ctx), 'simulate_graph', {
      graphHash: 'unknown-hash',
      scenarios: [{ label: 'A', input: {}, meta: execMeta('sim-3') }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('No graph found');
  });
});
