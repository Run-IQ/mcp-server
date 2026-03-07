import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PPEEngine } from '@run-iq/core';
import { hydrateRules } from '@run-iq/core';

const ScenarioSchema = z.object({
  label: z.string().describe('Human-readable scenario label'),
  input: z.object({
    data: z.record(z.unknown()),
    requestId: z.string(),
    meta: z.object({
      tenantId: z.string(),
      userId: z.string().optional(),
      tags: z.array(z.string()).optional(),
      context: z.record(z.unknown()).optional(),
      effectiveDate: z.string().optional(),
    }),
  }),
});

export function registerSimulateTool(server: McpServer, engine: PPEEngine): void {
  server.tool(
    'simulate',
    'Compare N scenarios using the same rules. Evaluates each scenario independently and returns side-by-side results for comparison.',
    {
      rules: z
        .array(z.record(z.unknown()))
        .describe('Array of Rule JSON objects (shared across all scenarios)'),
      scenarios: z.array(ScenarioSchema).min(1).describe('Array of scenarios to compare'),
    },
    async (args) => {
      try {
        const rules = hydrateRules(args.rules);

        const results = [];
        for (const scenario of args.scenarios) {
          const input = {
            data: scenario.input.data,
            requestId: scenario.input.requestId,
            meta: {
              ...scenario.input.meta,
              effectiveDate: scenario.input.meta.effectiveDate
                ? new Date(scenario.input.meta.effectiveDate)
                : undefined,
            },
          };

          const result = await engine.evaluate(rules, input);

          results.push({
            label: scenario.label,
            value: result.value,
            appliedCount: result.appliedRules.length,
            skippedCount: result.skippedRules.length,
            breakdown: result.breakdown.map((b) => ({
              ruleId: b.ruleId,
              contribution: b.contribution,
              modelUsed: b.modelUsed,
            })),
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
