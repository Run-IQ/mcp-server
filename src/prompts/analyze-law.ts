import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CalculationModel } from '@run-iq/core';

export function registerAnalyzeLawPrompt(
  server: McpServer,
  models: ReadonlyMap<string, CalculationModel>,
): void {
  const modelNames = [...models.keys()].join(', ');

  server.prompt(
    'analyze-law',
    'Translate a legal/fiscal text into Run-IQ rule definitions',
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
              text: `You are a fiscal law expert specialized in translating legal texts into structured Run-IQ rules.

## Available Calculation Models
${modelNames}

## Rule Format
A Run-IQ Rule has this structure:
\`\`\`json
{
  "id": "unique-id",
  "version": 1,
  "model": "MODEL_NAME",
  "params": { /* model-specific params */ },
  "priority": 1000,
  "effectiveFrom": "2025-01-01T00:00:00.000Z",
  "effectiveUntil": null,
  "tags": ["tax-type"],
  "checksum": "sha256-of-params",
  "condition": { "dsl": "jsonlogic", "value": { /* condition */ } }
}
\`\`\`

## Model Parameters
- **FLAT_RATE**: \`{ "rate": number (0-1), "base": "field_name" }\`
  Example: TVA 18% → rate=0.18, base="revenue"

- **PROGRESSIVE_BRACKET**: \`{ "base": "field_name", "brackets": [{ "from": number, "to": number|null, "rate": number }] }\`
  Example: IRPP with progressive tax brackets

- **MINIMUM_TAX**: \`{ "rate": number, "base": "field_name", "minimum": number }\`
  Example: Minimum corporate tax = MAX(revenue * 1%, 50000 XOF)

- **THRESHOLD_BASED**: \`{ "base": "field_name", "threshold": number, "rate": number, "above_only": boolean }\`
  Example: Tax only on amounts above a threshold

- **FIXED_AMOUNT**: \`{ "amount": number, "currency": "XOF" }\`
  Example: Fixed registration fee

- **COMPOSITE**: \`{ "steps": [{ "model": "...", "params": {...} }], "aggregation": "SUM"|"MAX"|"MIN" }\`
  Example: Complex multi-step calculation

## Conditions (JSONLogic)
Use JSONLogic DSL for conditions:
\`\`\`json
{ "dsl": "jsonlogic", "value": { ">=": [{ "var": "revenue" }, 100000] } }
\`\`\`

## Instructions
1. Read the legal text carefully
2. Identify each tax rule, rate, threshold, bracket, or exemption
3. For each identified rule, create a Rule JSON using the appropriate model
4. Use the \`create_rule\` tool to generate rules with proper checksums
5. Use the \`validate_rules\` tool to verify your rules are valid
${args.country ? `\n## Country: ${args.country}\n` : ''}
## Legal Text to Analyze
${args.legal_text}`,
            },
          },
        ],
      };
    },
  );
}
