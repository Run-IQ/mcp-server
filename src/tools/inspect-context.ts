import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ExecutionResultStore } from '../engine.js';

export function registerInspectContextTool(
  server: McpServer,
  executionStore: ExecutionResultStore,
): void {
  server.tool(
    'inspect_context',
    'Inspect the execution context of a completed Decision Graph. Shows the values produced by each node, events emitted, timing, and raw data. Use after execute_graph for debugging.',
    {
      requestId: z
        .string()
        .optional()
        .describe('Request ID from execute_graph. If omitted, uses the last execution.'),
    },
    async (args) => {
      try {
        const result = args.requestId
          ? executionStore.get(args.requestId)
          : executionStore.getLast();

        if (!result) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: args.requestId
                    ? `No execution found for requestId "${args.requestId}"`
                    : 'No executions stored yet. Run execute_graph first.',
                }),
              },
            ],
            isError: true,
          };
        }

        // Group events by node
        const nodeEvents: Record<string, unknown[]> = {};
        for (const event of result.events) {
          const nodeId =
            (event as Record<string, unknown>)['nodeId'] as string | undefined;
          const key = nodeId ?? '__graph__';
          if (!nodeEvents[key]) nodeEvents[key] = [];
          nodeEvents[key].push(event);
        }

        // Extract per-node outputs from events
        const nodeOutputs: Record<string, unknown> = {};
        for (const event of result.events) {
          const ev = event as Record<string, unknown>;
          if (ev['type'] === 'node.completed' && ev['outputs']) {
            nodeOutputs[ev['nodeId'] as string] = ev['outputs'];
          }
        }

        // Extract timing from events
        const nodeTiming: Record<string, number> = {};
        for (const event of result.events) {
          const ev = event as Record<string, unknown>;
          if (ev['type'] === 'node.completed' && typeof ev['durationMs'] === 'number') {
            nodeTiming[ev['nodeId'] as string] = ev['durationMs'];
          }
        }

        const context = {
          requestId: result.requestId,
          graphHash: result.graphHash,
          status: result.status,
          finalOutputs: result.outputs,
          nodeOutputs,
          nodeTiming,
          executed: result.executed,
          skipped: result.skipped,
          failed: result.failed,
          totalEvents: result.events.length,
          eventsByNode: Object.fromEntries(
            Object.entries(nodeEvents).map(([k, v]) => [k, v.length]),
          ),
          totalDurationMs: result.durationMs,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(context, null, 2) }],
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
