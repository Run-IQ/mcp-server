import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DGGraph, CompiledGraph, DGCompiler } from '@run-iq/dg';
import { toMermaid } from '@run-iq/dg';
import type { GraphStore } from '../engine.js';

function analyzeGraph(graph: DGGraph): Record<string, unknown> {
  const nodes = Object.values(graph.nodes);
  const nodeTypes: Record<string, number> = {};
  for (const node of nodes) {
    nodeTypes[node.type] = (nodeTypes[node.type] ?? 0) + 1;
  }

  const conditionalEdges = graph.edges.filter((e) => e.condition != null).length;
  const mergeNodes = nodes.filter((n) => n.type === 'merge');
  const enrichNodes = nodes.filter((n) => n.type === 'enrich');
  const subgraphNodes = nodes.filter((n) => n.type === 'subgraph');

  // Find root nodes (no incoming edges)
  const nodesWithIncoming = new Set(graph.edges.map((e) => e.to.node));
  const rootNodes = nodes.filter((n) => !nodesWithIncoming.has(n.id)).map((n) => n.id);

  // Find leaf nodes (no outgoing edges)
  const nodesWithOutgoing = new Set(graph.edges.map((e) => e.from.node));
  const leafNodes = nodes.filter((n) => !nodesWithOutgoing.has(n.id)).map((n) => n.id);

  return {
    totalNodes: nodes.length,
    totalEdges: graph.edges.length,
    nodeTypes,
    conditionalEdges,
    mergeNodes: mergeNodes.map((n) => n.id),
    enrichNodes: enrichNodes.map((n) => n.id),
    subgraphNodes: subgraphNodes.map((n) => n.id),
    rootNodes,
    leafNodes,
    ports: nodes.map((n) => ({
      id: n.id,
      type: n.type,
      in: n.ports.in.map((p) => ({ name: p.name, required: p.required })),
      out: n.ports.out.map((p) => ({ name: p.name, required: p.required })),
    })),
  };
}

export function registerInspectGraphTool(
  server: McpServer,
  compiler: DGCompiler,
  graphStore: GraphStore,
): void {
  server.tool(
    'inspect_graph',
    'Inspect a Decision Graph structure. Returns a Mermaid diagram, statistics (node counts by type, conditional edges, merge points), port listings, and root/leaf identification.',
    {
      graphHash: z.string().optional().describe('Hash of a compiled graph'),
      graph: z.record(z.unknown()).optional().describe('Inline DGGraph JSON'),
    },
    async (args) => {
      try {
        let sourceGraph: DGGraph | undefined;

        if (args.graphHash) {
          const compiled = graphStore.getCompiled(args.graphHash);
          if (compiled) sourceGraph = compiled.source;
        }

        if (!sourceGraph && args.graph) {
          sourceGraph = args.graph as unknown as DGGraph;
        }

        if (!sourceGraph) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: 'No graph found. Provide graphHash or inline graph.' }),
              },
            ],
            isError: true,
          };
        }

        // Try to compile for level info (non-strict, best-effort)
        let levelInfo: string | undefined;
        try {
          const compiled = compiler.compile(sourceGraph);
          levelInfo = `Compiled into ${compiled.levels.length} execution levels`;
          graphStore.storeCompiled(compiled);
        } catch {
          levelInfo = 'Could not compile (structural errors exist)';
        }

        const stats = analyzeGraph(sourceGraph);
        let mermaid: string;
        try {
          mermaid = toMermaid(sourceGraph);
        } catch {
          mermaid = '(Could not generate Mermaid diagram)';
        }

        const output = {
          mermaid,
          compilation: levelInfo,
          ...stats,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
          isError: true,
        };
      }
    },
  );
}
