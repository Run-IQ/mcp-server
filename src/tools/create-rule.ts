import { computeRuleChecksum } from '@run-iq/core';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PluginDescriptor } from '@run-iq/plugin-sdk';
import { buildCreateRuleSchema } from './schema-builder.js';
import { sanitizeMcpInput } from '../utils/sanitizer.js';

export function registerCreateRuleTool(
  server: McpServer,
  descriptors: readonly PluginDescriptor[],
): void {
  const schema = buildCreateRuleSchema(descriptors);

  // Collect plugin extension field names
  const extensionFields = descriptors.flatMap((d) => d.ruleExtensions.map((f) => f.name));

  server.tool(
    'create_rule',
    'Generate a valid Run-IQ Rule JSON object with auto-computed SHA-256 checksum. Includes plugin-specific fields based on loaded plugins.',
    schema,
    (rawArgs: Record<string, unknown>) => {
      const args = sanitizeMcpInput(rawArgs);
      const params = args['params'] as Record<string, unknown>;

      const rule: Record<string, unknown> = {
        id: args['id'],
        version: 1,
        model: args['model'] as string,
        params,
        priority: (args['priority'] as number) ?? 1000,
        effectiveFrom: args['effectiveFrom'],
        effectiveUntil: args['effectiveUntil'] ?? null,
        tags: (args['tags'] as string[] | undefined) ?? [],
      };

      if (args['condition']) {
        rule['condition'] = args['condition'];
      }

      // Compute full integrity checksum
      rule['checksum'] = computeRuleChecksum(rule as any);

      // Add plugin extension fields
      for (const field of extensionFields) {
        if (args[field] !== undefined) {
          rule[field] = args[field];
        }
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ rule }, null, 2) }],
      };
    },
  );
}
