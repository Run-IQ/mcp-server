import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DGGraph, DGNode, DGEdge } from '@run-iq/dg';
import type { GraphStore } from '../engine.js';

// ─── Default empty graph ────────────────────────────────────────────────────

function emptyGraph(): DGGraph {
  return {
    id: `dg-${Date.now()}`,
    version: '1.0.0',
    nodes: {},
    edges: [],
    meta: { description: 'Untitled Graph' },
  };
}

// ─── Default node policy ────────────────────────────────────────────────────
const DEFAULT_NODE_POLICY = {
  onError: 'skip' as const,
  onFailPropagation: 'continue' as const,
};

// ─── Actions ────────────────────────────────────────────────────────────────

const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('add_node'),
    id: z.string().describe('Node ID (e.g. "calc_irpp")'),
    type: z
      .enum(['compute', 'enrich', 'branch', 'guard', 'merge', 'subgraph'])
      .describe('Node type'),
    model: z.string().optional().describe('Model name (for compute nodes)'),
    portsIn: z
      .array(z.object({ name: z.string(), required: z.boolean().optional() }))
      .optional()
      .describe('Input port definitions'),
    portsOut: z
      .array(z.object({ name: z.string(), required: z.boolean().optional() }))
      .optional()
      .describe('Output port definitions'),
    meta: z.record(z.unknown()).optional().describe('Node metadata (enrichConfig, mergeConfig, etc.)'),
  }),
  z.object({
    action: z.literal('add_edge'),
    from: z.object({ node: z.string(), port: z.string().optional() }),
    to: z.object({ node: z.string(), port: z.string().optional() }),
    condition: z
      .object({
        dsl: z.string(),
        expression: z.unknown(),
        scope: z.enum(['source-output', 'full-context']).optional(),
      })
      .optional()
      .describe('Optional condition for this edge'),
  }),
  z.object({
    action: z.literal('remove_node'),
    id: z.string().describe('Node ID to remove'),
  }),
  z.object({
    action: z.literal('remove_edge'),
    from: z.string().describe('Source node ID'),
    to: z.string().describe('Target node ID'),
  }),
  z.object({
    action: z.literal('set_meta'),
    description: z.string().optional(),
    domain: z.string().optional(),
  }),
  z.object({
    action: z.literal('get_current'),
  }),
  z.object({
    action: z.literal('reset'),
  }),
]);

export function registerDesignGraphTool(server: McpServer, graphStore: GraphStore): void {
  server.tool(
    'design_graph',
    'Incrementally build a Decision Graph step by step. Supports actions: add_node, add_edge, remove_node, remove_edge, set_meta, get_current, reset. The graph state persists across calls within the session.',
    {
      sessionId: z
        .string()
        .optional()
        .default('default')
        .describe('Session ID for the builder (default: "default")'),
      action: ActionSchema.describe('The action to perform'),
    },
    async (args) => {
      try {
        const sessionId = args.sessionId ?? 'default';
        const action = args.action;
        let graph = graphStore.getBuilder(sessionId) ?? emptyGraph();

        switch (action.action) {
          case 'add_node': {
            const node: DGNode = {
              id: action.id,
              type: action.type,
              ...(action.model ? { model: action.model } : {}),
              ports: {
                in: (action.portsIn ?? []).map((p) => ({
                  name: p.name,
                  required: p.required ?? false,
                })),
                out: (action.portsOut ?? []).map((p) => ({
                  name: p.name,
                  required: p.required ?? false,
                })),
              },
              policy: DEFAULT_NODE_POLICY,
              ...(action.meta ? { meta: action.meta } : {}),
            };
            graph = { ...graph, nodes: { ...graph.nodes, [action.id]: node } };
            break;
          }

          case 'add_edge': {
            const edgeId = `${action.from.node}→${action.to.node}`;
            const edge: DGEdge = {
              id: edgeId,
              from: { node: action.from.node, port: action.from.port ?? 'value' },
              to: { node: action.to.node, port: action.to.port ?? 'value' },
              ...(action.condition
                ? {
                    condition: {
                      dsl: action.condition.dsl,
                      expression: action.condition.expression,
                      scope: action.condition.scope ?? 'source-output',
                    },
                  }
                : {}),
            };
            graph = { ...graph, edges: [...graph.edges, edge] };
            break;
          }

          case 'remove_node': {
            const { [action.id]: _removed, ...remaining } = graph.nodes;
            graph = {
              ...graph,
              nodes: remaining,
              edges: graph.edges.filter(
                (e) => e.from.node !== action.id && e.to.node !== action.id,
              ),
            };
            break;
          }

          case 'remove_edge': {
            graph = {
              ...graph,
              edges: graph.edges.filter(
                (e) => !(e.from.node === action.from && e.to.node === action.to),
              ),
            };
            break;
          }

          case 'set_meta': {
            graph = {
              ...graph,
              meta: {
                ...graph.meta,
                ...(action.description !== undefined ? { description: action.description } : {}),
                ...(action.domain !== undefined ? { domain: action.domain } : {}),
              },
            };
            break;
          }

          case 'get_current':
            // No-op, just return current state
            break;

          case 'reset':
            graph = emptyGraph();
            break;
        }

        graphStore.setBuilder(sessionId, graph);

        const summary = {
          sessionId,
          action: action.action,
          currentState: {
            id: graph.id,
            description: graph.meta?.description,
            nodeCount: Object.keys(graph.nodes).length,
            edgeCount: graph.edges.length,
            nodes: Object.values(graph.nodes).map((n) => ({
              id: n.id,
              type: n.type,
              model: n.model,
            })),
            edges: graph.edges.map((e) => ({
              id: e.id,
              from: `${e.from.node}.${e.from.port}`,
              to: `${e.to.node}.${e.to.port}`,
              hasCondition: e.condition != null,
            })),
          },
          hint:
            action.action === 'reset'
              ? 'Graph reset. Use add_node to start building.'
              : action.action === 'get_current'
                ? 'Use compile_graph with this graph JSON to validate and compile.'
                : `Node/edge ${action.action.replace('_', ' ')} successful.`,
          graph: action.action === 'get_current' ? graph : undefined,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
          isError: true,
        };
      }
    },
  );
}
