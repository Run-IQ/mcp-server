import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import type { EngineContext } from '../../src/engine.js';
import { registerDesignGraphTool } from '../../src/tools/design-graph.js';
import { callTool, callToolRaw } from '../helpers.js';
import { mockBundle } from '../mocks.js';

// Each call uses a fresh server (helpers close it) but the same GraphStore,
// as within one MCP session.
async function design(
  ctx: EngineContext,
  action: Record<string, unknown>,
  sessionId?: string,
): Promise<Record<string, unknown>> {
  const server = new McpServer({ name: 'test', version: '0.0.1' });
  registerDesignGraphTool(server, ctx.graphStore);
  return callTool(server, 'design_graph', { action, ...(sessionId ? { sessionId } : {}) });
}

async function buildLinear(ctx: EngineContext): Promise<void> {
  await design(ctx, { action: 'set_meta', description: 'Built step by step' });
  await design(ctx, {
    action: 'add_node',
    id: 'a',
    type: 'compute',
    model: 'MOCK_RATE',
    portsOut: [{ name: 'value', required: true }],
  });
  await design(ctx, {
    action: 'add_node',
    id: 'b',
    type: 'compute',
    model: 'MOCK_RATE',
    portsIn: [{ name: 'value', required: true }],
    portsOut: [{ name: 'value', required: true }],
  });
  await design(ctx, { action: 'add_edge', from: { node: 'a' }, to: { node: 'b' } });
}

interface DesignState {
  nodeCount: number;
  edgeCount: number;
  description: string;
  edges: Array<{ from: string; to: string }>;
}

describe('design_graph tool', () => {
  it('builds a graph incrementally across calls', async () => {
    const ctx = createEngine([mockBundle]);
    await buildLinear(ctx);

    const result = await design(ctx, { action: 'get_current' });
    const state = result.currentState as DesignState;

    expect(result.sessionId).toBe('default');
    expect(state.description).toBe('Built step by step');
    expect(state.nodeCount).toBe(2);
    expect(state.edgeCount).toBe(1);
    expect(state.edges[0]).toMatchObject({ from: 'a.value', to: 'b.value' });
    expect(result.graph).toBeDefined();
  });

  it('produces a graph that compiles', async () => {
    const ctx = createEngine([mockBundle]);
    await buildLinear(ctx);

    const graph = ctx.graphStore.getBuilder('default')!;

    expect(() => ctx.compiler.compile(graph)).not.toThrow();
  });

  it('removes a node together with its edges', async () => {
    const ctx = createEngine([mockBundle]);
    await buildLinear(ctx);

    const result = await design(ctx, { action: 'remove_node', id: 'a' });
    const state = result.currentState as DesignState;

    expect(state.nodeCount).toBe(1);
    expect(state.edgeCount).toBe(0);
  });

  it('removes an edge and resets the graph', async () => {
    const ctx = createEngine([mockBundle]);
    await buildLinear(ctx);

    const removed = await design(ctx, { action: 'remove_edge', from: 'a', to: 'b' });
    expect((removed.currentState as DesignState).edgeCount).toBe(0);

    const reset = await design(ctx, { action: 'reset' });
    expect((reset.currentState as DesignState).nodeCount).toBe(0);
  });

  it('keeps sessions separate', async () => {
    const ctx = createEngine([mockBundle]);
    await buildLinear(ctx);

    const result = await design(ctx, { action: 'get_current' }, 'other');

    expect(result.sessionId).toBe('other');
    expect((result.currentState as DesignState).nodeCount).toBe(0);
  });

  it('rejects an unknown action', async () => {
    const ctx = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerDesignGraphTool(server, ctx.graphStore);

    const result = await callToolRaw(server, 'design_graph', { action: { action: 'explode' } });

    expect(result.isError).toBe(true);
    expect(ctx.graphStore.getBuilder('default')).toBeUndefined();
  });
});
