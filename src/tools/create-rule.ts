import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const CreateRuleInput = {
  id: z.string().describe('Unique rule identifier'),
  model: z.string().describe('Calculation model name (e.g. FLAT_RATE, PROGRESSIVE_BRACKET)'),
  params: z.record(z.unknown()).describe('Model-specific parameters'),
  priority: z.number().int().describe('Rule priority (higher = more important)'),
  effectiveFrom: z.string().describe('ISO 8601 date string for when the rule becomes active'),
  effectiveUntil: z
    .string()
    .nullable()
    .optional()
    .describe('ISO 8601 date string for when the rule expires (null = no expiry)'),
  tags: z.array(z.string()).optional().describe('Optional tags for filtering'),
  condition: z
    .object({
      dsl: z.string().describe('DSL identifier (e.g. "jsonlogic")'),
      value: z.unknown().describe('DSL-specific condition expression'),
    })
    .optional()
    .describe('Optional condition expression'),
};

export function registerCreateRuleTool(server: McpServer): void {
  server.tool(
    'create_rule',
    'Generate a valid Run-IQ Rule JSON object with auto-computed SHA-256 checksum. Returns a complete rule ready for evaluation.',
    CreateRuleInput,
    (args) => {
      const checksum = createHash('sha256').update(JSON.stringify(args.params)).digest('hex');

      const rule = {
        id: args.id,
        version: 1,
        model: args.model,
        params: args.params,
        priority: args.priority,
        effectiveFrom: args.effectiveFrom,
        effectiveUntil: args.effectiveUntil ?? null,
        tags: args.tags ?? [],
        checksum,
        ...(args.condition ? { condition: args.condition } : {}),
      };

      return {
        content: [{ type: 'text', text: JSON.stringify({ rule }, null, 2) }],
      };
    },
  );
}
