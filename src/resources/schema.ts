import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CalculationModel } from '@run-iq/core';
import type { DescriptorRegistry } from '../descriptors/registry.js';

function buildSchemaDocument(
  models: ReadonlyMap<string, CalculationModel>,
  registry: DescriptorRegistry,
): string {
  const lines: string[] = [];

  lines.push('# Run-IQ Rule Schema');
  lines.push('');
  lines.push('Complete schema for creating valid rules with the currently loaded plugins.');
  lines.push('');

  // Base Rule fields
  lines.push('## Base Rule Fields (always required)');
  lines.push('');
  lines.push('| Field | Type | Required | Description |');
  lines.push('|-------|------|----------|-------------|');
  lines.push('| id | string | yes | Unique rule identifier |');
  lines.push('| version | number | auto (=1) | Rule version |');
  lines.push('| model | string | yes | Calculation model name |');
  lines.push('| params | object | yes | Model-specific parameters |');
  lines.push(
    '| priority | number | optional | Auto-computed by plugins (e.g. jurisdiction+scope) |',
  );
  lines.push('| effectiveFrom | string | yes | ISO 8601 date |');
  lines.push('| effectiveUntil | string\\|null | optional | ISO 8601 date or null |');
  lines.push('| tags | string[] | optional | Filtering tags |');
  lines.push('| checksum | string | auto | SHA-256 of params (auto-computed by create_rule) |');
  lines.push('| condition | {dsl,value} | optional | DSL condition (e.g. jsonlogic) |');
  lines.push('');

  // Plugin extension fields
  const descriptors = registry.getAll();
  if (descriptors.length > 0) {
    lines.push('## Plugin Extension Fields');
    lines.push('');

    for (const desc of descriptors) {
      lines.push(`### ${desc.name} (v${desc.version})`);
      lines.push('');
      lines.push(desc.description);
      lines.push('');
      lines.push('| Field | Type | Required | Values | Description |');
      lines.push('|-------|------|----------|--------|-------------|');

      for (const field of desc.ruleExtensions) {
        const values = field.enum ? field.enum.join(', ') : '-';
        lines.push(
          `| ${field.name} | ${field.type} | ${field.required ? 'yes' : 'no'} | ${values} | ${field.description} |`,
        );
      }
      lines.push('');
    }
  }

  // Available models + params
  lines.push('## Available Calculation Models');
  lines.push('');

  for (const [, model] of models) {
    lines.push(`### ${model.name} (v${model.version})`);
    lines.push('');

    const validation = model.validateParams({});
    if (validation.errors) {
      lines.push('**Required params:**');
      for (const error of validation.errors) {
        lines.push(`- ${error}`);
      }
    }
    lines.push('');
  }

  // Input data fields
  const inputFields = registry.getInputFields();
  if (inputFields.length > 0) {
    lines.push('## Input Data Fields (input.data)');
    lines.push('');
    lines.push('Variables available for use in JSONLogic conditions (`{"var": "fieldName"}`)');
    lines.push('and as `base` parameter in calculation models.');
    lines.push('');
    lines.push('| Field | Type | Description | Examples |');
    lines.push('|-------|------|-------------|----------|');

    for (const field of inputFields) {
      const examples = field.examples ? field.examples.join(', ') : '-';
      lines.push(`| ${field.name} | ${field.type} | ${field.description} | ${examples} |`);
    }
    lines.push('');
  }

  // JSONLogic DSL reference
  lines.push('## JSONLogic Condition Syntax');
  lines.push('');
  lines.push('Conditions use the `jsonlogic` DSL. Format:');
  lines.push('```json');
  lines.push('{ "dsl": "jsonlogic", "value": <expression> }');
  lines.push('```');
  lines.push('');
  lines.push('**Common operators:**');
  lines.push('- `{">=": [{"var": "revenue"}, 1000000]}` - comparison');
  lines.push('- `{"and": [expr1, expr2]}` - logical AND');
  lines.push('- `{"or": [expr1, expr2]}` - logical OR');
  lines.push('- `{"!": expr}` - logical NOT');
  lines.push('- `{"in": ["value", {"var": "tags"}]}` - membership');
  lines.push('- `{"==": [{"var": "type"}, "enterprise"]}` - equality');
  lines.push('');

  // Examples
  const examples = registry.getExamples();
  if (examples.length > 0) {
    lines.push('## Complete Rule Examples');
    lines.push('');

    for (const example of examples) {
      lines.push(`### ${example.title}`);
      lines.push('');
      lines.push(example.description);
      lines.push('');
      lines.push('**Rule:**');
      lines.push('```json');
      lines.push(JSON.stringify(example.rule, null, 2));
      lines.push('```');

      if (example.input) {
        lines.push('');
        lines.push('**Input data:**');
        lines.push('```json');
        lines.push(JSON.stringify(example.input, null, 2));
        lines.push('```');
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

export function registerSchemaResource(
  server: McpServer,
  models: ReadonlyMap<string, CalculationModel>,
  registry: DescriptorRegistry,
): void {
  server.resource(
    'rule-schema',
    'schema://rules',
    {
      description:
        'Complete rule schema including base fields, plugin extensions, model params, input variables, DSL syntax, and examples. THE reference for creating valid rules.',
    },
    () => ({
      contents: [
        {
          uri: 'schema://rules',
          mimeType: 'text/markdown',
          text: buildSchemaDocument(models, registry),
        },
      ],
    }),
  );
}
