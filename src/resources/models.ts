import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CalculationModel } from '@run-iq/core';

function buildModelsCatalog(models: ReadonlyMap<string, CalculationModel>): string {
  const lines: string[] = [];

  lines.push('# Run-IQ Calculation Models');
  lines.push('');

  for (const [, model] of models) {
    lines.push(`## ${model.name} (v${model.version})`);
    lines.push('');

    // Use describeParams() if available — structured, explicit documentation
    if ('describeParams' in model && typeof model.describeParams === 'function') {
      // justification: narrowed by 'in' check + typeof guard
      const paramDocs = model.describeParams() as Record<string, { type: string; description?: string | undefined }>;
      lines.push('### Parameters');
      lines.push('');
      lines.push('| Parameter | Type | Description |');
      lines.push('|-----------|------|-------------|');
      for (const [name, desc] of Object.entries(paramDocs)) {
        lines.push(`| \`${name}\` | ${desc.type} | ${desc.description ?? ''} |`);
      }
      lines.push('');
    } else {
      // Fallback: infer params from validation errors
      const validation = model.validateParams({});
      if (validation.errors) {
        lines.push('### Parameters (inferred from validation)');
        lines.push('');
        for (const error of validation.errors) {
          lines.push(`- ${error}`);
        }
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}

export function registerModelsResource(
  server: McpServer,
  models: ReadonlyMap<string, CalculationModel>,
): void {
  server.resource(
    'models-catalog',
    'models://catalog',
    {
      description:
        'Documentation of all available calculation models with parameter schemas and usage examples',
    },
    () => {
      const catalog = buildModelsCatalog(models);
      return {
        contents: [
          {
            uri: 'models://catalog',
            mimeType: 'text/markdown',
            text: catalog,
          },
        ],
      };
    },
  );
}
