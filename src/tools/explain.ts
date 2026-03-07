import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const EvaluationResultSchema = {
  result: z
    .object({
      value: z.unknown(),
      breakdown: z.array(
        z.object({
          ruleId: z.string(),
          contribution: z.unknown(),
          modelUsed: z.string(),
          label: z.string().optional(),
        }),
      ),
      appliedRules: z.array(
        z.object({
          id: z.string(),
          model: z.string(),
          priority: z.number(),
        }),
      ),
      skippedRules: z.array(
        z.object({
          ruleId: z.string(),
          reason: z.string(),
        }),
      ),
      trace: z
        .object({
          totalDurationMs: z.number(),
          steps: z.array(z.record(z.unknown())).optional(),
        })
        .optional(),
    })
    .describe('An EvaluationResult (or simplified result from the evaluate tool)'),
};

export function registerExplainResultTool(server: McpServer): void {
  server.tool(
    'explain_result',
    'Generate a human-readable explanation of an evaluation result. Summarizes the total value, applied rules with their contributions, skipped rules with reasons, and execution timing.',
    EvaluationResultSchema,
    (args) => {
      const { result } = args;
      const lines: string[] = [];

      lines.push(`## Evaluation Result Summary`);
      lines.push('');
      lines.push(`**Total Value**: ${String(result.value)}`);
      lines.push('');

      // Applied rules
      if (result.appliedRules.length > 0) {
        lines.push(`### Applied Rules (${result.appliedRules.length})`);
        lines.push('');

        for (const applied of result.appliedRules) {
          const breakdown = result.breakdown.find((b) => b.ruleId === applied.id);
          const contribution = breakdown ? String(breakdown.contribution) : 'N/A';
          const label = breakdown?.label ? ` (${breakdown.label})` : '';

          lines.push(
            `- **${applied.id}**${label}: model=${applied.model}, priority=${applied.priority}, contribution=${contribution}`,
          );
        }
        lines.push('');
      } else {
        lines.push('### No rules were applied.');
        lines.push('');
      }

      // Skipped rules
      if (result.skippedRules.length > 0) {
        lines.push(`### Skipped Rules (${result.skippedRules.length})`);
        lines.push('');

        for (const skipped of result.skippedRules) {
          lines.push(`- **${skipped.ruleId}**: ${skipped.reason}`);
        }
        lines.push('');
      }

      // Timing
      if (result.trace?.totalDurationMs !== undefined) {
        lines.push(`### Timing`);
        lines.push('');
        lines.push(`Total duration: ${result.trace.totalDurationMs}ms`);
      }

      const explanation = lines.join('\n');

      return {
        content: [{ type: 'text', text: JSON.stringify({ explanation }, null, 2) }],
      };
    },
  );
}
