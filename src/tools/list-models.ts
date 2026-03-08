import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CalculationModel } from '@run-iq/core';

interface ModelInfo {
  name: string;
  version: string;
  plugin?: string;
  paramsSchema: Record<string, string>;
}

export function registerListModelsTool(
  server: McpServer,
  models: ReadonlyMap<string, CalculationModel & { pluginName?: string }>,
): void {
  server.tool(
    'list_models',
    'List all available calculation models with their parameter schemas. Shows model name, version, source plugin, and expected parameters.',
    {},
    () => {
      const result: ModelInfo[] = [];

      for (const [, model] of models) {
        // Infer param schema from validation errors with empty object
        const validation = model.validateParams({});
        const paramsSchema: Record<string, string> = {};

        if (validation.errors) {
          for (const error of validation.errors) {
            // Parse error messages like '"rate" must be a number' or '"base" must be a string'
            const match = error.match(/^"(\w+)"\s+must be (?:a |an )?(.+)$/);
            if (match?.[1] && match[2]) {
              paramsSchema[match[1]] = match[2];
            }
          }
        }

        result.push({
          name: model.name,
          version: model.version,
          plugin: model.pluginName,
          paramsSchema,
        });
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ models: result }, null, 2) }],
      };
    },
  );
}
