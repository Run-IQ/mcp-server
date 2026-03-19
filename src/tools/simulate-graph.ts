import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DGCompiler, DGOrchestrator, DGGraph } from '@run-iq/dg';
import type { GraphStore } from '../engine.js';

const ScenarioSchema = z.object({
  label: z.string().describe('Human-readable scenario label'),
  input: z.record(z.unknown()).describe('Input data for this scenario'),
  meta: z.object({
    requestId: z.string().describe('Unique request identifier'),
    tenantId: z.string().describe('Tenant identifier'),
    effectiveDate: z.string().optional().describe('ISO 8601 effective date'),
  }),
});

export function registerSimulateGraphTool(
  server: McpServer,
  compiler: DGCompiler,
  orchestrator: DGOrchestrator,
  graphStore: GraphStore,
): void {
  server.tool(
    'simulate_graph',
    'Compare N scenarios using the same Decision Graph. Executes each scenario independently and returns side-by-side results for comparison.',
    {
      graphHash: z
        .string()
        .optional()
        .describe('Hash of a previously compiled graph'),
      graph: z
        .record(z.unknown())
        .optional()
        .describe('Inline DGGraph JSON'),
      scenarios: z
        .array(ScenarioSchema)
        .min(1)
        .max(10)
        .describe('Array of scenarios to compare (max 10)'),
    },
    async (args) => {
      try {
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
                text: JSON.stringify({ error: 'No graph found. Provide graphHash or inline graph.' }),
              },
            ],
            isError: true,
          };
        }

        const results = [];
        for (const scenario of args.scenarios) {
          const result = await orchestrator.execute(
            compiled,
            scenario.input as Record<string, unknown>,
            {
              requestId: scenario.meta.requestId,
              tenantId: scenario.meta.tenantId,
              timestamp: new Date().toISOString(),
              ...(scenario.meta.effectiveDate ? { effectiveDate: scenario.meta.effectiveDate } : {}),
            },
          );

          results.push({
            label: scenario.label,
            status: result.status,
            outputs: result.outputs,
            executedCount: result.executed.length,
            skippedCount: result.skipped.length,
            failedCount: result.failed.length,
            durationMs: result.durationMs,
          });
        }

        return {
          content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }],
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
