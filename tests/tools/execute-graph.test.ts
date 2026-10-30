import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import type { EngineContext } from '../../src/engine.js';
import { registerExecuteGraphTool } from '../../src/tools/execute-graph.js';
import { callTool, callToolRaw } from '../helpers.js';
import { mockBundle } from '../mocks.js';
import { linearGraph, execMeta } from '../graph-fixtures.js';

function makeServer(ctx: EngineContext): McpServer {
  const server = new McpServer({ name: 'test', version: '0.0.1' });
  registerExecuteGraphTool(
    server,
    ctx.compiler,
    ctx.orchestrator,
    ctx.graphStore,
    ctx.executionStore,
  );
  return server;
}

describe('execute_graph tool', () => {
  it('compiles and executes an inline graph', async () => {
    const ctx = createEngine([mockBundle]);

    const result = await callTool(makeServer(ctx), 'execute_graph', {
      graph: linearGraph(),
      input: { revenue: 1000 },
      meta: execMeta('exec-1'),
    });

    expect(result.status).toBe('completed');
    expect(result.requestId).toBe('exec-1');
    expect(result.executed).toEqual(['a', 'b']);
    expect(result.failed).toEqual([]);
    expect(result.outputs).toHaveProperty('a.value');
    expect(result.outputs).toHaveProperty('b.value');
    expect(ctx.executionStore.get('exec-1')?.status).toBe('completed');
    expect(ctx.graphStore.getCompiled(result.graphHash as string)).toBeDefined();
  });

  it('executes a previously compiled graph by hash', async () => {
    const ctx = createEngine([mockBundle]);
    const compiled = ctx.compiler.compile(linearGraph());
    ctx.graphStore.storeCompiled(compiled);

    const result = await callTool(makeServer(ctx), 'execute_graph', {
      graphHash: compiled.hash,
      input: { revenue: 1000 },
      meta: execMeta('exec-2'),
    });

    expect(result.status).toBe('completed');
    expect(result.graphHash).toBe(compiled.hash);
  });

  it('returns an error when no graph is found', async () => {
    const ctx = createEngine([mockBundle]);

    const result = await callToolRaw(makeServer(ctx), 'execute_graph', {
      graphHash: 'unknown-hash',
      input: {},
      meta: execMeta('exec-3'),
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('No graph found');
  });
});
