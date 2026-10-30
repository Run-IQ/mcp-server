import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DGOrchestrator, DGGraph, DGCompiler } from '@run-iq/dg';
import type { GraphStore, ExecutionResultStore } from '../engine.js';

export function registerExecuteGraphTool(
  server: McpServer,
  compiler: DGCompiler,
  orchestrator: DGOrchestrator,
  graphStore: GraphStore,
  executionStore: ExecutionResultStore,
): void {
  server.tool(
    'execute_graph',
    'Execute a compiled Decision Graph with input data. Accepts either a graph hash (from compile_graph) or an inline DGGraph JSON. Returns the DGResult: outputs, executed/skipped/failed nodes, events, and duration.',
    {
      graphHash: z
        .string()
        .optional()
        .describe('Hash of a previously compiled graph (from compile_graph)'),
      graph: z
        .record(z.unknown())
        .optional()
        .describe('Inline DGGraph JSON — will be compiled on-the-fly if no graphHash'),
      input: z.record(z.unknown()).describe('Input data for the graph execution'),
      meta: z
        .object({
          requestId: z.string().describe('Unique request identifier'),
          tenantId: z.string().describe('Tenant identifier'),
          effectiveDate: z.string().optional().describe('ISO 8601 effective date'),
        })
        .describe('Execution metadata'),
    },
    async (args) => {
      try {
        // Resolve compiled graph: from store or compile inline
        let compiled = args.graphHash ? graphStore.getCompiled(args.graphHash) : undefined;

        if (!compiled && args.graph) {
          compiled = compiler.compile(args.graph as unknown as DGGraph);
          graphStore.storeCompiled(compiled);
        }

        if (!compiled) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error:
                    'No graph found. Provide a graphHash from compile_graph or an inline graph JSON.',
                }),
              },
            ],
            isError: true,
          };
        }

        const result = await orchestrator.execute(compiled, args.input as Record<string, unknown>, {
          requestId: args.meta.requestId,
          tenantId: args.meta.tenantId,
          timestamp: new Date().toISOString(),
          ...(args.meta.effectiveDate ? { effectiveDate: args.meta.effectiveDate } : {}),
        });

        // Store for inspect_context / explain_graph_result
        executionStore.store(args.meta.requestId, result);

        const serializable = {
          status: result.status,
          requestId: result.requestId,
          graphHash: result.graphHash,
          outputs: result.outputs,
          executed: result.executed,
          skipped: result.skipped,
          failed: result.failed,
          durationMs: result.durationMs,
          eventCount: result.events.length,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(serializable, null, 2) }],
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
