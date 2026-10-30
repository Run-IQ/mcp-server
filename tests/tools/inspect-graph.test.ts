import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import type { EngineContext } from '../../src/engine.js';
import { registerInspectGraphTool } from '../../src/tools/inspect-graph.js';
import { callTool, callToolRaw } from '../helpers.js';
import { mockBundle } from '../mocks.js';
import { linearGraph, cyclicGraph } from '../graph-fixtures.js';

function makeServer(ctx: EngineContext): McpServer {
  const server = new McpServer({ name: 'test', version: '0.0.1' });
  registerInspectGraphTool(server, ctx.compiler, ctx.graphStore);
  return server;
}

describe('inspect_graph tool', () => {
  it('returns a Mermaid diagram and structural statistics', async () => {
    const ctx = createEngine([mockBundle]);

    const result = await callTool(makeServer(ctx), 'inspect_graph', { graph: linearGraph() });

    expect(result.mermaid).toContain('a');
    expect(result.mermaid).toContain('b');
    expect(result.compilation).toBe('Compiled into 2 execution levels');
    expect(result.totalNodes).toBe(2);
    expect(result.totalEdges).toBe(1);
    expect(result.rootNodes).toEqual(['a']);
    expect(result.leafNodes).toEqual(['b']);
    expect(ctx.graphStore.listCompiled()).toHaveLength(1);
  });

  it('inspects a graph stored by hash', async () => {
    const ctx = createEngine([mockBundle]);
    const compiled = ctx.compiler.compile(linearGraph());
    ctx.graphStore.storeCompiled(compiled);

    const result = await callTool(makeServer(ctx), 'inspect_graph', { graphHash: compiled.hash });

    expect(result.totalNodes).toBe(2);
  });

  it('still reports statistics when the graph does not compile', async () => {
    const ctx = createEngine([mockBundle]);

    const result = await callTool(makeServer(ctx), 'inspect_graph', { graph: cyclicGraph() });

    expect(result.compilation).toBe('Could not compile (structural errors exist)');
    expect(result.totalEdges).toBe(2);
  });

  it('returns an error when no graph is given', async () => {
    const ctx = createEngine([mockBundle]);

    const result = await callToolRaw(makeServer(ctx), 'inspect_graph', {});

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('No graph found');
  });
});
