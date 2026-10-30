import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import type { EngineContext } from '../../src/engine.js';
import { registerExplainGraphResultTool } from '../../src/tools/explain-graph-result.js';
import { callToolRaw } from '../helpers.js';
import { mockBundle } from '../mocks.js';
import { linearGraph } from '../graph-fixtures.js';

function makeServer(ctx: EngineContext): McpServer {
  const server = new McpServer({ name: 'test', version: '0.0.1' });
  registerExplainGraphResultTool(server, ctx.executionStore);
  return server;
}

describe('explain_graph_result tool', () => {
  it('returns a markdown narrative of the execution', async () => {
    const ctx = createEngine([mockBundle]);
    const compiled = ctx.compiler.compile(linearGraph());
    const run = await ctx.orchestrator.execute(
      compiled,
      { revenue: 1000 },
      { requestId: 'exp-1', tenantId: 'test', timestamp: new Date().toISOString() },
    );
    ctx.executionStore.store('exp-1', run);

    const result = await callToolRaw(makeServer(ctx), 'explain_graph_result', {
      requestId: 'exp-1',
    });

    const text = result.content[0]?.text ?? '';
    expect(result.isError).toBeFalsy();
    expect(text.startsWith('## Decision Graph Execution Summary')).toBe(true);
    expect(text).toContain('**Status**: completed');
    expect(text).toContain('### Executed Nodes (2)');
    expect(text).toContain('**a**');
    expect(text).toContain('### Final Outputs');
  });

  it('returns an error when no execution is stored', async () => {
    const ctx = createEngine([mockBundle]);

    const result = await callToolRaw(makeServer(ctx), 'explain_graph_result', {});

    expect(result.isError).toBe(true);
    expect(result.content[0]!.text).toContain('No execution found');
  });
});
