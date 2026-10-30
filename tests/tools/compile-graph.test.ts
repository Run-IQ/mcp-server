import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import { registerCompileGraphTool } from '../../src/tools/compile-graph.js';
import { callTool, callToolRaw } from '../helpers.js';
import { mockBundle } from '../mocks.js';
import { linearGraph, cyclicGraph } from '../graph-fixtures.js';

describe('compile_graph tool', () => {
  it('compiles a graph, returns a summary and stores it by hash', async () => {
    const { compiler, graphStore } = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerCompileGraphTool(server, compiler, graphStore);

    const result = await callTool(server, 'compile_graph', { graph: linearGraph() });

    expect(typeof result.hash).toBe('string');
    expect(result.levels).toBe(2);
    expect(result.totalNodes).toBe(2);
    expect(result.totalEdges).toBe(1);
    expect(result.nodeTypes).toEqual({ compute: 2 });
    expect(result.storedForExecution).toBe(true);
    expect(graphStore.listCompiled()).toEqual([result.hash]);
  });

  it('returns an error for a cyclic graph', async () => {
    const { compiler, graphStore } = createEngine([mockBundle]);
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerCompileGraphTool(server, compiler, graphStore);

    const result = await callToolRaw(server, 'compile_graph', { graph: cyclicGraph() });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('cycle');
    expect(graphStore.listCompiled()).toEqual([]);
  });
});
