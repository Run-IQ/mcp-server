import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DescriptorRegistry } from '../descriptors/registry.js';

export function registerFiscalExpertPrompt(server: McpServer, registry: DescriptorRegistry): void {
  const descriptors = registry.getAll();
  const pluginList = descriptors.map((d) => `- ${d.name}: ${d.description}`).join('\n');

  server.prompt(
    'fiscal-expert',
    'Fiscal calculation expertise: scenario comparison, result explanation, recommendations',
    {
      question: z.string().describe('The fiscal question or scenario to analyze'),
    },
    (args) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are a fiscal expert assistant powered by the Run-IQ PPE (Parametric Policy Engine).

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

## Guidelines
1. Always read \`schema://rules\` before creating rules — it has ALL required fields
2. When comparing scenarios, use the \`simulate\` tool with clear labels
3. Always validate rules after creating them
4. Reference applicable tax codes and jurisdictions

## Question
${args.question}`,
            },
          },
        ],
      };
    },
  );
}
