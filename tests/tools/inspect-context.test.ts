import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import type { EngineContext } from '../../src/engine.js';
import { registerInspectContextTool } from '../../src/tools/inspect-context.js';
import { callTool, callToolRaw } from '../helpers.js';
import { mockBundle } from '../mocks.js';
import { linearGraph } from '../graph-fixtures.js';

async function runGraph(ctx: EngineContext, requestId: string): Promise<void> {
  const compiled = ctx.compiler.compile(linearGraph());
  const result = await ctx.orchestrator.execute(
    compiled,
    { revenue: 1000 },
    { requestId, tenantId: 'test', timestamp: new Date().toISOString() },
  );
  ctx.executionStore.store(requestId, result);
}

function makeServer(ctx: EngineContext): McpServer {
  const server = new McpServer({ name: 'test', version: '0.0.1' });
  registerInspectContextTool(server, ctx.executionStore);
  return server;
}

describe('inspect_context tool', () => {
  it('returns per-node outputs and events of a stored execution', async () => {
    const ctx = createEngine([mockBundle]);
    await runGraph(ctx, 'ctx-1');

    const result = await callTool(makeServer(ctx), 'inspect_context', { requestId: 'ctx-1' });

    expect(result.requestId).toBe('ctx-1');
    expect(result.status).toBe('completed');
    expect(result.executed).toEqual(['a', 'b']);
    expect(Object.keys(result.nodeOutputs as object).sort()).toEqual(['a', 'b']);
    expect(result.totalEvents).toBeGreaterThan(0);
    expect(result.eventsByNode).toHaveProperty('a');
  });

  it('uses the last execution when requestId is omitted', async () => {
    const ctx = createEngine([mockBundle]);
    await runGraph(ctx, 'ctx-1');
    await runGraph(ctx, 'ctx-2');

    const result = await callTool(makeServer(ctx), 'inspect_context', {});

    expect(result.requestId).toBe('ctx-2');
  });

  it('returns an error for an unknown requestId', async () => {
    const ctx = createEngine([mockBundle]);

    const result = await callToolRaw(makeServer(ctx), 'inspect_context', { requestId: 'missing' });

    expect(result.isError).toBe(true);
    expect(JSON.parse(result.content[0]!.text)).toEqual({
      error: 'No execution found for requestId "missing"',
    });
  });
});
