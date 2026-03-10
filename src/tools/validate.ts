import { computeRuleChecksum } from '@run-iq/core';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CalculationModel } from '@run-iq/core';
import type { PluginDescriptor } from '@run-iq/plugin-sdk';
import { buildValidateExtensionErrors } from './schema-builder.js';

const RuleSchema = z.object({
  id: z.string(),
  version: z.number(),
  model: z.string(),
  params: z.unknown(),
  priority: z.number(),
  effectiveFrom: z.string(),
  effectiveUntil: z.string().nullable(),
  tags: z.array(z.string()),
  checksum: z.string(),
  condition: z.object({ dsl: z.string(), value: z.unknown() }).optional(),
});

interface ValidationEntry {
  ruleId: string;
  valid: boolean;
  errors?: string[];
}

export function registerValidateRulesTool(
  server: McpServer,
  models: ReadonlyMap<string, CalculationModel>,
  descriptors: readonly PluginDescriptor[],
): void {
  server.tool(
    'validate_rules',
    'Validate the structure, checksum, model params, and plugin-specific fields of Run-IQ rules.',
    {
      rules: z.array(z.record(z.unknown())).describe('Array of Rule JSON objects to validate'),
    },
    (args) => {
      const entries: ValidationEntry[] = [];

      for (const raw of args.rules) {
        const parsed = RuleSchema.safeParse(raw);
        const ruleId = typeof raw['id'] === 'string' ? raw['id'] : 'unknown';

        if (!parsed.success) {
          entries.push({
            ruleId,
            valid: false,
            errors: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
          });
          continue;
        }

        const rule = parsed.data;
        const errors: string[] = [];

        // Checksum verification — pass full raw rule, computeRuleChecksum excludes checksum internally
        const computed = computeRuleChecksum(raw);
        if (computed !== rule.checksum) {
          errors.push(`Checksum mismatch: expected ${computed}, got ${rule.checksum}`);
        }

        // Model existence
        const model = models.get(rule.model);
        if (!model) {
          errors.push(
            `Model "${rule.model}" not found. Available: ${[...models.keys()].join(', ')}`,
          );
        } else {
          // Param validation via model
          const validation = model.validateParams(rule.params);
          if (!validation.valid && validation.errors) {
            errors.push(...validation.errors);
          }
        }

        // Plugin extension validation
        const extensionErrors = buildValidateExtensionErrors(raw, descriptors);
        errors.push(...extensionErrors);

        entries.push({
          ruleId: rule.id,
          valid: errors.length === 0,
          ...(errors.length > 0 ? { errors } : {}),
        });
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ entries }, null, 2) }],
      };
    },
  );
}
