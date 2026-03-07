import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CalculationModel } from '@run-iq/core';
import type { DescriptorRegistry } from '../descriptors/registry.js';

function buildModelDocs(models: ReadonlyMap<string, CalculationModel>): string {
  const lines: string[] = [];
  for (const [, model] of models) {
    const validation = model.validateParams({});
    const paramHints = validation.errors ? validation.errors.join('; ') : 'none';
    lines.push(`- **${model.name}** (v${model.version}): ${paramHints}`);
  }
  return lines.join('\n');
}

function buildExtensionDocs(registry: DescriptorRegistry): string {
  const descriptors = registry.getAll();
  if (descriptors.length === 0) return '';

  const lines: string[] = [];
  for (const desc of descriptors) {
    lines.push(`\n### Plugin: ${desc.name}`);
    lines.push(desc.description);
    lines.push('\n**Required fields on each rule:**');
    for (const field of desc.ruleExtensions) {
      const values = field.enum ? ` (values: ${field.enum.join(', ')})` : '';
      const req = field.required ? ' [REQUIRED]' : ' [optional]';
      lines.push(`- \`${field.name}\`${req}: ${field.description}${values}`);
    }
  }
  return lines.join('\n');
}

function buildExampleDocs(registry: DescriptorRegistry): string {
  const examples = registry.getExamples();
  if (examples.length === 0) return '';

  const lines: string[] = ['\n## Concrete Examples'];
  for (const ex of examples) {
    lines.push(`\n### ${ex.title}`);
    lines.push(ex.description);
    lines.push('```json');
    lines.push(JSON.stringify(ex.rule, null, 2));
    lines.push('```');
  }
  return lines.join('\n');
}

function buildInputDocs(registry: DescriptorRegistry): string {
  const fields = registry.getInputFields();
  if (fields.length === 0) return '';

  const lines: string[] = ['\n## Available input.data Fields'];
  lines.push('Use these as `{"var": "fieldName"}` in JSONLogic conditions');
  lines.push('and as `"base"` parameter in calculation models:\n');
  for (const f of fields) {
    const examples = f.examples ? ` (e.g. ${f.examples.join(', ')})` : '';
    lines.push(`- \`${f.name}\` (${f.type}): ${f.description}${examples}`);
  }
  return lines.join('\n');
}

export function registerAnalyzeLawPrompt(
  server: McpServer,
  models: ReadonlyMap<string, CalculationModel>,
  registry: DescriptorRegistry,
): void {
  server.prompt(
    'analyze-law',
    'Translate a legal/fiscal text into Run-IQ rule definitions. Plugin-aware: includes all required fields.',
    {
      legal_text: z.string().describe('The legal or fiscal text to analyze and convert into rules'),
      country: z.string().optional().describe('Country code (e.g. TG for Togo)'),
    },
    (args) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are an expert at translating legal texts into structured Run-IQ rules.

## Available Calculation Models
${buildModelDocs(models)}
${buildExtensionDocs(registry)}
${buildInputDocs(registry)}

## Rule Creation Workflow
1. Read the legal text carefully
2. Identify each tax rule, rate, threshold, bracket, or exemption
3. Use the \`create_rule\` tool — it knows ALL required fields for loaded plugins
4. Use the \`validate_rules\` tool to verify your rules are valid
5. Read \`schema://rules\` for the complete field reference if needed

## JSONLogic Conditions
\`\`\`json
{ "dsl": "jsonlogic", "value": { ">=": [{ "var": "revenue" }, 100000] } }
\`\`\`
${buildExampleDocs(registry)}
${args.country ? `\n## Target Country: ${args.country}\n` : ''}
## Legal Text to Analyze
${args.legal_text}`,
            },
          },
        ],
      };
    },
  );
}
