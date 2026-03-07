import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CalculationModel } from '@run-iq/core';

export function registerInspectRuleTool(
  server: McpServer,
  models: ReadonlyMap<string, CalculationModel>,
): void {
  server.tool(
    'inspect_rule',
    'Analyze a single Run-IQ rule in detail. Checks checksum validity, model availability, active date status, and parameter errors.',
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
      const computed = createHash('sha256').update(JSON.stringify(params)).digest('hex');
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

      const valid = checksumMatch && modelFound && !paramErrors && isActive;

      const result = {
        ruleId: id,
        valid,
        checksumMatch,
        modelFound,
        isActive,
        effectivePeriod,
        ...(paramErrors ? { paramErrors } : {}),
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );
}
