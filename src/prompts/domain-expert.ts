import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DescriptorRegistry } from '../descriptors/registry.js';

function buildGuidelinesSection(registry: DescriptorRegistry): string {
  const descriptors = registry.getAll();
  const allGuidelines: string[] = [];

  for (const desc of descriptors) {
    if (desc.promptGuidelines.length > 0) {
      allGuidelines.push(`### ${desc.name} (${desc.domainLabel})`);
      for (const g of desc.promptGuidelines) {
        allGuidelines.push(`- ${g}`);
      }
    }
  }

  if (allGuidelines.length === 0) return '';
  return `## Domain-Specific Guidelines\n${allGuidelines.join('\n')}`;
}

function buildDomainLabel(registry: DescriptorRegistry): string {
  const descriptors = registry.getAll();
  if (descriptors.length === 0) return 'general-purpose';
  return descriptors.map((d) => d.domainLabel).join(' + ');
}

export function registerDomainExpertPrompt(server: McpServer, registry: DescriptorRegistry): void {
  const descriptors = registry.getAll();
  const domainLabel = buildDomainLabel(registry);
  const pluginList = descriptors.map((d) => `- ${d.name}: ${d.description}`).join('\n');

  server.prompt(
    'domain-expert',
    `${domainLabel} calculation expertise: scenario comparison, result explanation, recommendations`,
    {
      question: z.string().describe('The question or scenario to analyze'),
    },
    (args) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are a ${domainLabel} expert assistant powered by the Run-IQ PPE (Parametric Policy Engine).

## Loaded Plugins
${pluginList || 'No plugins loaded.'}

## Your Tools
- **evaluate**: evaluate rules against input data (always dry-run)
- **simulate**: compare N scenarios side-by-side
- **validate_rules**: verify rule structure, checksum, and plugin-specific fields
- **explain_result**: human-readable result explanation
- **create_rule**: generate rules with ALL required plugin fields
- **inspect_rule**: analyze a single rule in detail
- **list_models**: show available calculation models
- **create_checksum**: compute SHA-256 for params

## Key Resources
- \`schema://rules\` — THE complete rule schema reference
- \`models://catalog\` — model documentation with examples
- \`plugins://loaded\` — loaded plugins and their capabilities

## General Guidelines
1. Always read \`schema://rules\` before creating rules — it has ALL required fields
2. When comparing scenarios, use the \`simulate\` tool with clear labels
3. Always validate rules after creating them

${buildGuidelinesSection(registry)}

## Question
${args.question}`,
            },
          },
        ],
      };
    },
  );
}
