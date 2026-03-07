import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CalculationModel } from '@run-iq/core';

function buildModelsCatalog(models: ReadonlyMap<string, CalculationModel>): string {
  const lines: string[] = [];

  lines.push('# Run-IQ Fiscal Calculation Models');
  lines.push('');

  for (const [, model] of models) {
    lines.push(`## ${model.name} (v${model.version})`);
    lines.push('');

    // Infer params from validation errors
    const validation = model.validateParams({});
    if (validation.errors) {
      lines.push('### Parameters');
      lines.push('');
      for (const error of validation.errors) {
        lines.push(`- ${error}`);
      }
      lines.push('');
    }

    // Model-specific documentation
    switch (model.name) {
      case 'FLAT_RATE':
        lines.push('Applies a flat rate to a base value: `base_value * rate`.');
        lines.push('');
        lines.push('**Example params**: `{ "rate": 0.18, "base": "revenue" }`');
        lines.push('**Use case**: TVA, flat tax rates.');
        break;
      case 'PROGRESSIVE_BRACKET':
        lines.push(
          'Applies progressive tax brackets cumulatively. Each bracket taxes only the portion within its range.',
        );
        lines.push('');
        lines.push(
          '**Example params**: `{ "base": "income", "brackets": [{ "from": 0, "to": 500000, "rate": 0 }, { "from": 500000, "to": 1000000, "rate": 0.1 }] }`',
        );
        lines.push('**Use case**: IRPP (income tax), progressive taxes.');
        break;
      case 'MINIMUM_TAX':
        lines.push('Computes `MAX(base_value * rate, minimum)`. Ensures a minimum tax amount.');
        lines.push('');
        lines.push('**Example params**: `{ "rate": 0.01, "base": "revenue", "minimum": 50000 }`');
        lines.push('**Use case**: Minimum corporate tax.');
        break;
      case 'THRESHOLD_BASED':
        lines.push(
          'Applies a rate only when the base value exceeds a threshold. If `above_only` is true, taxes only the amount above the threshold.',
        );
        lines.push('');
        lines.push(
          '**Example params**: `{ "base": "revenue", "threshold": 1000000, "rate": 0.05, "above_only": true }`',
        );
        lines.push('**Use case**: Luxury tax, excess profit tax.');
        break;
      case 'FIXED_AMOUNT':
        lines.push('Returns a fixed amount regardless of input values.');
        lines.push('');
        lines.push('**Example params**: `{ "amount": 25000, "currency": "XOF" }`');
        lines.push('**Use case**: Fixed registration fees, stamps.');
        break;
      case 'COMPOSITE':
        lines.push(
          'Combines multiple sub-models using an aggregation function (SUM, MAX, or MIN).',
        );
        lines.push('');
        lines.push(
          '**Example params**: `{ "steps": [{ "model": "FLAT_RATE", "params": { "rate": 0.18, "base": "revenue" } }], "aggregation": "SUM" }`',
        );
        lines.push('**Use case**: Complex tax calculations combining multiple methods.');
        break;
    }

    lines.push('');
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
        'Documentation of all available fiscal calculation models with parameter schemas and usage examples',
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
