import { computeRuleChecksum } from '@run-iq/core';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CalculationModel } from '@run-iq/core';
import type { PluginDescriptor } from '@run-iq/plugin-sdk';
import { buildValidateExtensionErrors } from './schema-builder.js';

export function registerInspectRuleTool(
  server: McpServer,
  models: ReadonlyMap<string, CalculationModel>,
  descriptors: readonly PluginDescriptor[],
): void {
  server.tool(
    'inspect_rule',
    'Analyze a single Run-IQ rule in detail: checksum, model, active dates, params, and plugin-specific fields.',
    {
      rule: z.record(z.unknown()).describe('A single Rule JSON object to inspect'),
    },
    (args) => {
      const rule = args.rule;
      const id = typeof rule['id'] === 'string' ? rule['id'] : 'unknown';
      const modelName = typeof rule['model'] === 'string' ? rule['model'] : '';
      const params = rule['params'];
      const checksum = typeof rule['checksum'] === 'string' ? rule['checksum'] : '';

      // Checksum match
      const computed = computeRuleChecksum(rule as any);
      const checksumMatch = computed === checksum;

      // Model found
      const model = models.get(modelName);
      const modelFound = model !== undefined;

      // Param validation
      let paramErrors: string[] | undefined;
      if (model) {
        const validation = model.validateParams(params);
        if (!validation.valid && validation.errors) {
          paramErrors = [...validation.errors];
        }
      }

      // Plugin extension validation
      const extensionErrors = buildValidateExtensionErrors(rule, descriptors);

      // Active date check
      const now = new Date();
      const effectiveFrom =
        typeof rule['effectiveFrom'] === 'string' ? new Date(rule['effectiveFrom']) : null;
      const effectiveUntil =
        typeof rule['effectiveUntil'] === 'string' ? new Date(rule['effectiveUntil']) : null;

      const isActive =
        effectiveFrom !== null &&
        effectiveFrom <= now &&
        (effectiveUntil === null || effectiveUntil > now);

      const effectivePeriod = {
        from: effectiveFrom?.toISOString() ?? null,
        until: effectiveUntil?.toISOString() ?? null,
      };

      const allErrors = [...(paramErrors ?? []), ...extensionErrors];
      const valid = checksumMatch && modelFound && allErrors.length === 0 && isActive;

      const result: Record<string, unknown> = {
        ruleId: id,
        valid,
        checksumMatch,
        modelFound,
        isActive,
        effectivePeriod,
      };

      if (paramErrors && paramErrors.length > 0) {
        result['paramErrors'] = paramErrors;
      }
      if (extensionErrors.length > 0) {
        result['extensionErrors'] = extensionErrors;
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
