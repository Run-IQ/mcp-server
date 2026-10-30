import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CalculationModel, DSLEvaluator } from '@run-iq/core';
import type { DescriptorRegistry } from '../descriptors/registry.js';

function buildDomainLabel(registry: DescriptorRegistry): string {
  const descriptors = registry.getAll();
  if (descriptors.length === 0) return 'policy';
  return descriptors.map((d) => d.domainLabel).join(' / ');
}

function buildModelList(models: ReadonlyMap<string, CalculationModel>): string {
  const list: string[] = [];
  for (const [name] of models) {
    list.push(`- \`${name}\``);
  }
  return list.length > 0 ? list.join('\n') : '(no models loaded)';
}

export function registerOrchestrationArchitectPrompt(
  server: McpServer,
  models: ReadonlyMap<string, CalculationModel>,
  registry: DescriptorRegistry,
  dsls: readonly DSLEvaluator[],
): void {
  const domainLabel = buildDomainLabel(registry);

  server.prompt(
    'orchestration-architect',
    `Design and build a complete Decision Graph for complex ${domainLabel} workflows. Guides step-by-step from requirements to executable graph.`,
    {
      requirement: z
        .string()
        .describe('The business requirement to transform into a Decision Graph'),
      country: z.string().optional().describe('ISO country code (e.g. TG, FR, US)'),
    },
    (args) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are a Decision Graph Architect for the Run-IQ platform.

Your job is to transform business requirements into an optimal, executable Decision Graph.

## Important Architecture Principles

1. **The DG orchestrates DECISIONS, not business processes** — no retries, no timers, no long-running state
2. **Each node is either a PPE computation or an API enrichment** — nothing else
3. **Side-effects (emails, PDFs) belong to the OutputLayer AFTER the DG** — never inside nodes
4. **The DG is ephemeral** — it runs, produces a result, and dies

## Available Calculation Models
${buildModelList(models)}

## Available DSLs for Edge Conditions
${dsls.map((d) => `- \`${d.dsl}\` (v${d.version})`).join('\n') || '(none loaded)'}

## Your Workflow

Follow this EXACT sequence:

### Phase 1 — Analysis
1. Read \`schema://graph\` for the complete DGGraph format
2. Read \`graph://examples\` for reference patterns
3. Break down the requirement into:
   - **Computations** → \`compute\` nodes (which model for each?)
   - **External data needed** → \`enrich\` nodes
   - **Decision points** → conditional edges
   - **Aggregation points** → \`merge\` nodes
   - **Nested workflows** → \`subgraph\` nodes

### Phase 2 — Design
4. Use \`design_graph\` to incrementally build the graph:
   - Start with \`set_meta\` to name the graph
   - Add nodes one by one with \`add_node\`
   - Wire them with \`add_edge\` (add conditions where needed)
   - Use \`get_current\` to review the graph so far

### Phase 3 — Validation
5. Use \`validate_graph\` to check for structural issues
6. Fix any errors using \`remove_node\` / \`remove_edge\` / \`add_node\` / \`add_edge\`
7. Use \`compile_graph\` for full compilation (cycle detection, wiring, etc.)

### Phase 4 — Testing
8. Use \`inspect_graph\` to visualize the compiled graph (Mermaid diagram)
9. Use \`execute_graph\` with realistic test data
10. Use \`inspect_context\` to verify per-node outputs
11. Use \`explain_graph_result\` for a human-readable execution summary
12. Use \`simulate_graph\` to compare different scenarios

${args.country ? `\n## Target Country: ${args.country}\n` : ''}
## Business Requirement
${args.requirement}

Begin by reading the schema and examples, then proceed step by step.`,
            },
          },
        ],
      };
    },
  );
}
