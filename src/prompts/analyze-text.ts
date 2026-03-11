import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CalculationModel, DSLEvaluator, DSLSyntaxDoc } from '@run-iq/core';
import type { DescriptorRegistry } from '../descriptors/registry.js';

function buildDomainLabel(registry: DescriptorRegistry): string {
  const descriptors = registry.getAll();
  if (descriptors.length === 0) return 'policy';
  return descriptors.map((d) => d.domainLabel).join(' / ');
}

function buildModelDocs(models: ReadonlyMap<string, CalculationModel>): string {
  const lines: string[] = [];
  for (const [, model] of models) {
    lines.push(`### ${model.name} (v${model.version})`);
    if ('describeParams' in model && typeof model.describeParams === 'function') {
      // justification: narrowed by 'in' check + typeof guard
      const paramDocs = model.describeParams() as Record<string, { type: string; description?: string | undefined }>;
      for (const [name, desc] of Object.entries(paramDocs)) {
        lines.push(`- \`${name}\` (${desc.type}): ${desc.description ?? ''}`);
      }
    } else {
      const validation = model.validateParams({});
      const paramHints = validation.errors ? validation.errors.join('; ') : 'none';
      lines.push(`- params: ${paramHints}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function buildDSLDocs(dsls: readonly DSLEvaluator[]): string {
  if (dsls.length === 0) return '';

  const lines: string[] = ['\n## Available DSL Condition Syntax'];
  for (const dsl of dsls) {
    lines.push(`\n### ${dsl.dsl} (v${dsl.version})`);
    if ('describeSyntax' in dsl && typeof dsl.describeSyntax === 'function') {
      // justification: narrowed by 'in' check + typeof guard
      const syntax = dsl.describeSyntax() as DSLSyntaxDoc;
      lines.push(syntax.description);
      lines.push(`\nFormat: \`${syntax.conditionFormat}\``);
      lines.push('\n**Operators:**');
      for (const op of syntax.operators) {
        lines.push(`- \`${op.syntax}\` — ${op.description}`);
      }
      if (syntax.examples.length > 0) {
        lines.push('\n**Examples:**');
        for (const ex of syntax.examples) {
          lines.push(`- ${ex.description}:`);
          lines.push('```json');
          lines.push(JSON.stringify({ dsl: dsl.dsl, value: ex.expression }, null, 2));
          lines.push('```');
        }
      }
    } else {
      lines.push(`Format: \`{ "dsl": "${dsl.dsl}", "value": <expression> }\``);
    }
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

function buildGuidelinesSection(registry: DescriptorRegistry): string {
  const descriptors = registry.getAll();
  const lines: string[] = [];

  for (const desc of descriptors) {
    if (desc.promptGuidelines.length > 0) {
      lines.push(`\n## ${desc.domainLabel} Guidelines`);
      for (const g of desc.promptGuidelines) {
        lines.push(`- ${g}`);
      }
    }
  }

  return lines.join('\n');
}

export function registerAnalyzeTextPrompt(
  server: McpServer,
  models: ReadonlyMap<string, CalculationModel>,
  registry: DescriptorRegistry,
  dsls: readonly DSLEvaluator[],
): void {
  const domainLabel = buildDomainLabel(registry);

  server.prompt(
    'analyze-text',
    `Translate a ${domainLabel} text (law, regulation, policy) into Run-IQ rule definitions. Plugin-aware: includes all required fields.`,
    {
      source_text: z
        .string()
        .describe('The regulatory, legal, or policy text to analyze and convert into rules'),
      country: z.string().optional().describe('ISO country code (e.g. TG, FR, US, IN)'),
    },
    (args) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are an expert at translating regulatory and policy texts into structured Run-IQ rules.

## Available Calculation Models
${buildModelDocs(models)}
${buildExtensionDocs(registry)}
${buildInputDocs(registry)}
${buildDSLDocs(dsls)}
${buildGuidelinesSection(registry)}

## Rule Creation Workflow
1. Read the source text carefully
2. Identify each rule, rate, threshold, bracket, condition, or exemption
3. Map each identified element to the appropriate calculation model
4. Use the \`create_rule\` tool — it knows ALL required fields for loaded plugins
5. Use the \`validate_rules\` tool to verify your rules are valid
6. Read \`schema://rules\` for the complete field reference if needed
${buildExampleDocs(registry)}
${args.country ? `\n## Target Country: ${args.country}\n` : ''}
## Source Text to Analyze
${args.source_text}`,
            },
          },
        ],
      };
    },
  );
}
