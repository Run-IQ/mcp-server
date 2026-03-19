import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DGCompiler, DGGraph } from '@run-iq/dg';
import type { GraphStore } from '../engine.js';

export function registerCompileGraphTool(
  server: McpServer,
  compiler: DGCompiler,
  graphStore: GraphStore,
): void {
  server.tool(
    'compile_graph',
    'Compile a Decision Graph (DGGraph) into an executable CompiledGraph. Performs static validation (cycles, ports, wiring, policies). Returns the compiled graph hash, level count, and any warnings.',
    {
      graph: z.record(z.unknown()).describe('The DGGraph JSON object (nodes, edges, meta)'),
      strict: z
        .boolean()
        .optional()
        .describe('If true, warnings become errors. Default: false'),
    },
    async (args) => {
      try {
        const graph = args.graph as unknown as DGGraph;
        const compiled = compiler.compile(graph, { strict: args.strict ?? false });

        // Store for later execute_graph calls
        graphStore.storeCompiled(compiled);

        const nodeTypes: Record<string, number> = {};
        for (const node of Object.values(compiled.source.nodes)) {
          nodeTypes[node.type] = (nodeTypes[node.type] ?? 0) + 1;
        }

        const summary = {
          hash: compiled.hash,
          levels: compiled.levels.length,
          totalNodes: Object.keys(compiled.source.nodes).length,
          totalEdges: compiled.source.edges.length,
          nodeTypes,
          warnings: compiled.warnings,
          compiledAt: compiled.compiled.at,
          storedForExecution: true,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
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
