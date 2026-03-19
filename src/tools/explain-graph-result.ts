import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ExecutionResultStore } from '../engine.js';

function buildNarrative(result: {
  status: string;
  executed: readonly string[];
  skipped: readonly string[];
  failed: readonly string[];
  events: readonly unknown[];
  outputs: Record<string, unknown>;
  durationMs: number;
}): string {
  const lines: string[] = [];

  lines.push(`## Decision Graph Execution Summary`);
  lines.push(`**Status**: ${result.status}`);
  lines.push(`**Duration**: ${result.durationMs}ms`);
  lines.push('');

  // Execution flow
  if (result.executed.length > 0) {
    lines.push(`### Executed Nodes (${result.executed.length})`);
    for (const nodeId of result.executed) {
      // Find completion event for this node
      const completionEvent = result.events.find((e) => {
        const ev = e as Record<string, unknown>;
        return ev['type'] === 'node.completed' && ev['nodeId'] === nodeId;
      }) as Record<string, unknown> | undefined;

      const duration = completionEvent?.['durationMs'] ?? '?';
      lines.push(`- ✅ **${nodeId}** — completed in ${duration}ms`);
    }
    lines.push('');
  }

  // Skipped nodes with explanations
  if (result.skipped.length > 0) {
    lines.push(`### Skipped Nodes (${result.skipped.length})`);
    for (const nodeId of result.skipped) {
      // Find skip event
      const skipEvent = result.events.find((e) => {
        const ev = e as Record<string, unknown>;
        return ev['type'] === 'node.skipped' && ev['nodeId'] === nodeId;
      }) as Record<string, unknown> | undefined;

      const reason = skipEvent?.['reason'] ?? 'edge condition evaluated to false';
      lines.push(`- ⏭️ **${nodeId}** — skipped (${reason})`);
    }
    lines.push('');
  }

  // Failed nodes
  if (result.failed.length > 0) {
    lines.push(`### Failed Nodes (${result.failed.length})`);
    for (const nodeId of result.failed) {
      const errorEvent = result.events.find((e) => {
        const ev = e as Record<string, unknown>;
        return ev['type'] === 'node.error' && ev['nodeId'] === nodeId;
      }) as Record<string, unknown> | undefined;

      const errorMsg = errorEvent?.['message'] ?? 'unknown error';
      lines.push(`- ❌ **${nodeId}** — failed: ${errorMsg}`);
    }
    lines.push('');
  }

  // Edge decisions
  const edgeEvents = result.events.filter((e) => {
    const ev = e as Record<string, unknown>;
    return ev['type'] === 'edge.inactive';
  });

  if (edgeEvents.length > 0) {
    lines.push(`### Edge Decisions (${edgeEvents.length} inactive)`);
    for (const event of edgeEvents) {
      const ev = event as Record<string, unknown>;
      const edgeId = ev['edgeId'] ?? '?';
      const scope = ev['scope'] ?? '?';
      const evaluated = ev['evaluated'] ?? 'false';
      lines.push(`- 🔗 Edge **${edgeId}**: inactive (${scope}: ${evaluated})`);
    }
    lines.push('');
  }

  // Merge events
  const mergeEvents = result.events.filter((e) => {
    const ev = e as Record<string, unknown>;
    return ev['type'] === 'merge.waiting';
  });

  if (mergeEvents.length > 0) {
    lines.push(`### Merge Points`);
    for (const event of mergeEvents) {
      const ev = event as Record<string, unknown>;
      const nodeId = ev['nodeId'] ?? '?';
      const strategy = ev['strategy'] ?? '?';
      const received = (ev['received'] as string[])?.length ?? 0;
      const waiting = (ev['waiting'] as string[])?.length ?? 0;
      lines.push(
        `- 🔀 **${nodeId}** (${strategy}): received ${received} parents, waiting for ${waiting}`,
      );
    }
    lines.push('');
  }

  // Final outputs
  lines.push(`### Final Outputs`);
  for (const [key, value] of Object.entries(result.outputs)) {
    lines.push(`- **${key}**: ${JSON.stringify(value)}`);
  }

  return lines.join('\n');
}

export function registerExplainGraphResultTool(
  server: McpServer,
  executionStore: ExecutionResultStore,
): void {
  server.tool(
    'explain_graph_result',
    'Generate a human-readable narrative explanation of a Decision Graph execution. Shows which nodes ran, which were skipped and why, edge decisions, merge points, and final outputs.',
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
                  error: 'No execution found. Run execute_graph first.',
                }),
              },
            ],
            isError: true,
          };
        }

        const narrative = buildNarrative(result);

        return {
          content: [{ type: 'text', text: narrative }],
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
