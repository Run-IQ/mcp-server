import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DGGraph } from '@run-iq/dg';

// justification: examples use cast to avoid strict-mode type errors on NodePolicy required fields.
// These are reference examples for LLMs; runtime validation happens in compile_graph.
function buildExamples(): Array<{ title: string; description: string; graph: DGGraph }> {
  const defaultPolicy = { onError: 'skip' as const, onFailPropagation: 'continue' as const };
  const failPolicy = { onError: 'skip' as const, onFailPropagation: 'skip-descendants' as const };

  return [
    // ─── Example 1: Simple Linear ────────────────────────────
    {
      title: 'Simple Linear (2 compute nodes)',
      description:
        'Two PPE calculations in sequence. Node A computes a base tax, Node B applies a surcharge using the result from A.',
      graph: {
        id: 'ex-linear',
        version: '1.0.0',
        meta: { description: 'Linear Tax Calculation' },
        nodes: {
          base_tax: {
            id: 'base_tax',
            type: 'compute',
            model: 'FLAT_RATE',
            ports: {
              in: [{ name: 'value', required: true }],
              out: [{ name: 'value', required: true }],
            },
            policy: defaultPolicy,
          },
          surcharge: {
            id: 'surcharge',
            type: 'compute',
            model: 'FLAT_RATE',
            ports: {
              in: [{ name: 'value', required: true }],
              out: [{ name: 'value', required: true }],
            },
            policy: defaultPolicy,
          },
        },
        edges: [
          {
            id: 'base→surcharge',
            from: { node: 'base_tax', port: 'value' },
            to: { node: 'surcharge', port: 'value' },
          },
        ],
      },
    },

    // ─── Example 2: Multi-tax with Merge ─────────────────────
    {
      title: 'Multi-Tax Bilan with Enrich + Merge',
      description:
        'Parallel computation of IRPP and TVA, enrichment from an external API for compliance, and a merge node that sums all results.',
      graph: {
        id: 'ex-bilan-fiscal',
        version: '1.0.0',
        meta: {
          description: 'Enterprise annual tax summary',
          domain: 'fiscal',
        },
        nodes: {
          calc_irpp: {
            id: 'calc_irpp',
            type: 'compute',
            model: 'PROGRESSIVE_BRACKET',
            ports: {
              in: [{ name: 'value', required: true }],
              out: [
                { name: 'value', required: true },
                { name: 'breakdown', required: false },
              ],
            },
            policy: defaultPolicy,
          },
          calc_tva: {
            id: 'calc_tva',
            type: 'compute',
            model: 'FLAT_RATE',
            ports: {
              in: [{ name: 'value', required: true }],
              out: [{ name: 'value', required: true }],
            },
            policy: defaultPolicy,
          },
          check_compliance: {
            id: 'check_compliance',
            type: 'enrich',
            ports: {
              in: [{ name: 'value', required: true }],
              out: [{ name: 'value', required: true }],
            },
            policy: failPolicy,
            meta: {
              enrichConfig: {
                url: 'https://api.otr.tg/compliance/status',
                method: 'GET',
                bodyMapping: { nif: 'nif' },
                outputMapping: { status: 'value' },
                timeoutMs: 3000,
              },
            },
          },
          merge_results: {
            id: 'merge_results',
            type: 'merge',
            ports: {
              in: [
                { name: 'irpp', required: true },
                { name: 'tva', required: true },
                { name: 'compliance', required: false },
              ],
              out: [{ name: 'value', required: true }],
            },
            policy: defaultPolicy,
            meta: {
              mergeConfig: {
                strategy: 'wait-all',
                onPartialInputs: 'proceed-with-available',
              },
            },
          },
        },
        edges: [
          {
            id: 'irpp→merge',
            from: { node: 'calc_irpp', port: 'value' },
            to: { node: 'merge_results', port: 'irpp' },
          },
          {
            id: 'tva→merge',
            from: { node: 'calc_tva', port: 'value' },
            to: { node: 'merge_results', port: 'tva' },
          },
          {
            id: 'compliance→merge',
            from: { node: 'check_compliance', port: 'value' },
            to: { node: 'merge_results', port: 'compliance' },
          },
        ],
      },
    },

    // ─── Example 3: Conditional Branching ────────────────────
    {
      title: 'Conditional Branch (Regime-based)',
      description:
        'Uses conditional edges to route to different calculation models based on the tax regime (simplified vs normal).',
      graph: {
        id: 'ex-branch',
        version: '1.0.0',
        meta: { description: 'Regime-Based Tax' },
        nodes: {
          entry: {
            id: 'entry',
            type: 'guard',
            ports: {
              in: [{ name: 'value', required: true }],
              out: [{ name: 'value', required: true }],
            },
            policy: defaultPolicy,
          },
          simplified: {
            id: 'simplified',
            type: 'compute',
            model: 'FLAT_RATE',
            ports: {
              in: [{ name: 'value', required: true }],
              out: [{ name: 'value', required: true }],
            },
            policy: defaultPolicy,
          },
          normal: {
            id: 'normal',
            type: 'compute',
            model: 'PROGRESSIVE_BRACKET',
            ports: {
              in: [{ name: 'value', required: true }],
              out: [{ name: 'value', required: true }],
            },
            policy: defaultPolicy,
          },
        },
        edges: [
          {
            id: 'entry→simplified',
            from: { node: 'entry', port: 'value' },
            to: { node: 'simplified', port: 'value' },
            condition: {
              dsl: 'jsonlogic',
              expression: { '==': [{ var: 'regime' }, 'simplified'] },
              scope: 'full-context',
            },
          },
          {
            id: 'entry→normal',
            from: { node: 'entry', port: 'value' },
            to: { node: 'normal', port: 'value' },
            condition: {
              dsl: 'jsonlogic',
              expression: { '==': [{ var: 'regime' }, 'normal'] },
              scope: 'full-context',
            },
          },
        ],
      },
    },
  ];
}

export function registerGraphExamplesResource(server: McpServer): void {
  const examples = buildExamples();

  server.resource(
    'graph-examples',
    'graph://examples',
    {
      description:
        'Example Decision Graphs: simple linear, multi-tax with merge and enrichment, conditional branching. Use as patterns for building new graphs.',
    },
    () => {
      const lines: string[] = [];
      lines.push('# Decision Graph Examples');
      lines.push('');
      lines.push('Use these as patterns for building new graphs with the `design_graph` tool.');
      lines.push('');

      for (const ex of examples) {
        lines.push(`## ${ex.title}`);
        lines.push('');
        lines.push(ex.description);
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(ex.graph, null, 2));
        lines.push('```');
        lines.push('');
      }

      return {
        contents: [
          {
            uri: 'graph://examples',
            mimeType: 'text/markdown',
            text: lines.join('\n'),
          },
        ],
      };
    },
  );
}
