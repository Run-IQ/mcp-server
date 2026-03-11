import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PPEEngine } from '@run-iq/core';
import { hydrateRules } from '@run-iq/core';
import { sanitizeMcpInput } from '../utils/sanitizer.js';

export function registerEvaluateTool(server: McpServer, engine: PPEEngine): void {
  server.tool(
    'evaluate',
    'Evaluate Run-IQ rules against input data in dry-run mode. Returns the computed value, breakdown per rule, applied/skipped rules, and execution trace.',
    {
      rules: z.array(z.record(z.unknown())).max(100).describe('Array of Rule JSON objects'),
      input: z
        .object({
          data: z.record(z.unknown()).describe('Input data for evaluation'),
          requestId: z.string().describe('Unique request identifier'),
          meta: z.object({
            tenantId: z.string().describe('Tenant identifier'),
            userId: z.string().optional().describe('User identifier'),
            tags: z.array(z.string()).optional().describe('Tags for rule filtering'),
            context: z.record(z.unknown()).optional().describe('Additional context'),
            effectiveDate: z
              .string()
              .optional()
              .describe('ISO 8601 date for effective date evaluation'),
          }),
        })
        .describe('Evaluation input'),
    },
    async (args) => {
      try {
        // justification: sanitizeMcpInput returns unknown but preserves array/object shape
        const sanitizedRules = sanitizeMcpInput(args.rules) as Record<string, unknown>[];
        const rules = hydrateRules(sanitizedRules);

        const input = {
          data: sanitizeMcpInput(args.input.data) as Record<string, unknown>,
          requestId: args.input.requestId,
          meta: {
            ...args.input.meta,
            context: args.input.meta.context ? sanitizeMcpInput(args.input.meta.context) as Record<string, unknown> : undefined,
            effectiveDate: args.input.meta.effectiveDate
              ? new Date(args.input.meta.effectiveDate)
              : undefined,
          },
        };

        const result = await engine.evaluate(rules, input);

        const serializable = {
          value: result.value,
          breakdown: result.breakdown,
          appliedRules: result.appliedRules.map((r) => ({
            id: r.id,
            model: r.model,
            priority: r.priority,
          })),
          skippedRules: result.skippedRules.map((s) => ({
            ruleId: s.rule.id,
            reason: s.reason,
          })),
          trace: {
            steps: result.trace.steps.map((s) => ({
              ruleId: s.ruleId,
              modelUsed: s.modelUsed,
              contribution: s.contribution,
              durationMs: s.durationMs,
            })),
            totalDurationMs: result.trace.totalDurationMs,
          },
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
