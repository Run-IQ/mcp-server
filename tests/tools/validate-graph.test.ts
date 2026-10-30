import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerValidateGraphTool } from '../../src/tools/validate-graph.js';
import { callTool } from '../helpers.js';
import { linearGraph } from '../graph-fixtures.js';

function makeServer(): McpServer {
  const server = new McpServer({ name: 'test', version: '0.0.1' });
  registerValidateGraphTool(server);
  return server;
}

describe('validate_graph tool', () => {
  it('accepts a well-formed graph', async () => {
    const result = await callTool(makeServer(), 'validate_graph', { graph: linearGraph() });

    expect(result.valid).toBe(true);
    expect(result.errors).toBe(0);
    expect(result.summary).toContain('Ready to compile');
  });

  it('reports structural errors', async () => {
    const graph = linearGraph();
    const broken = {
      ...graph,
      nodes: { ...graph.nodes, b: { ...graph.nodes['b']!, model: undefined } },
      edges: [
        ...graph.edges,
        { id: 'a_to_zz', from: { node: 'a', port: 'value' }, to: { node: 'zz', port: 'value' } },
        { id: 'a_to_a', from: { node: 'a', port: 'value' }, to: { node: 'a', port: 'value' } },
      ],
    };

    const result = await callTool(makeServer(), 'validate_graph', { graph: broken });

    expect(result.valid).toBe(false);
    const messages = (result.issues as Array<{ message: string }>).map((i) => i.message);
    expect(messages).toContain('Edge "a_to_zz" references non-existent target node "zz"');
    expect(messages).toContain('Self-loop detected on node "a"');
    expect(messages).toContain('Compute node "b" is missing a model');
  });

  it('rejects an empty graph', async () => {
    const result = await callTool(makeServer(), 'validate_graph', {
      graph: { id: 'empty', version: '1.0.0', nodes: {}, edges: [] },
    });

    expect(result.valid).toBe(false);
    expect(result.summary).toContain('1 error(s)');
  });
});
