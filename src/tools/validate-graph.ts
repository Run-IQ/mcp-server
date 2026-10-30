import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DGGraph } from '@run-iq/dg';

interface ValidationIssue {
  severity: 'error' | 'warning';
  nodeId?: string;
  edgeId?: string;
  message: string;
}

function validateGraphStructure(graph: DGGraph): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIds = new Set(Object.keys(graph.nodes));

  // 1. Check for empty graph
  if (nodeIds.size === 0) {
    issues.push({ severity: 'error', message: 'Graph has no nodes' });
    return issues;
  }

  // 2. Check edges reference valid nodes
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from.node)) {
      issues.push({
        severity: 'error',
        edgeId: edge.id,
        message: `Edge "${edge.id}" references non-existent source node "${edge.from.node}"`,
      });
    }
    if (!nodeIds.has(edge.to.node)) {
      issues.push({
        severity: 'error',
        edgeId: edge.id,
        message: `Edge "${edge.id}" references non-existent target node "${edge.to.node}"`,
      });
    }
  }

  // 3. Check for isolated nodes (no edges)
  const connectedNodes = new Set<string>();
  for (const edge of graph.edges) {
    connectedNodes.add(edge.from.node);
    connectedNodes.add(edge.to.node);
  }
  for (const nodeId of nodeIds) {
    if (!connectedNodes.has(nodeId) && nodeIds.size > 1) {
      issues.push({
        severity: 'warning',
        nodeId,
        message: `Node "${nodeId}" is isolated (no incoming or outgoing edges)`,
      });
    }
  }

  // 4. Check for self-loops
  for (const edge of graph.edges) {
    if (edge.from.node === edge.to.node) {
      issues.push({
        severity: 'error',
        edgeId: edge.id,
        nodeId: edge.from.node,
        message: `Self-loop detected on node "${edge.from.node}"`,
      });
    }
  }

  // 5. Check node types have required configuration
  for (const node of Object.values(graph.nodes)) {
    if (node.type === 'compute' && !node.model) {
      issues.push({
        severity: 'error',
        nodeId: node.id,
        message: `Compute node "${node.id}" is missing a model`,
      });
    }

    if (node.type === 'enrich' && !node.meta?.['enrichConfig']) {
      issues.push({
        severity: 'error',
        nodeId: node.id,
        message: `Enrich node "${node.id}" is missing meta.enrichConfig`,
      });
    }

    if (node.type === 'subgraph' && !node.meta?.['subGraphConfig']) {
      issues.push({
        severity: 'error',
        nodeId: node.id,
        message: `Subgraph node "${node.id}" is missing meta.subGraphConfig`,
      });
    }

    if (node.type === 'merge') {
      // Check merge has at least 2 incoming edges
      const incomingCount = graph.edges.filter((e) => e.to.node === node.id).length;
      if (incomingCount < 2) {
        issues.push({
          severity: 'warning',
          nodeId: node.id,
          message: `Merge node "${node.id}" has only ${incomingCount} incoming edge(s) — typically needs ≥2`,
        });
      }
    }
  }

  // 6. Check for duplicate edge IDs
  const edgeIds = new Set<string>();
  for (const edge of graph.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({
        severity: 'error',
        edgeId: edge.id,
        message: `Duplicate edge ID "${edge.id}"`,
      });
    }
    edgeIds.add(edge.id);
  }

  // 7. Check for output ports on leaf nodes
  const nodesWithOutgoing = new Set(graph.edges.map((e) => e.from.node));
  for (const node of Object.values(graph.nodes)) {
    if (!nodesWithOutgoing.has(node.id) && node.ports.out.length === 0) {
      issues.push({
        severity: 'warning',
        nodeId: node.id,
        message: `Leaf node "${node.id}" has no output ports — its results won't appear in the DGResult`,
      });
    }
  }

  return issues;
}

export function registerValidateGraphTool(server: McpServer): void {
  server.tool(
    'validate_graph',
    'Perform lightweight structural validation on a DGGraph without full compilation. Checks for: orphan edges, isolated nodes, self-loops, missing configurations (model, enrichConfig, subGraphConfig), merge node parents, and duplicate IDs.',
    {
      graph: z.record(z.unknown()).describe('DGGraph JSON to validate'),
    },
    async (args) => {
      try {
        const graph = args.graph as unknown as DGGraph;
        const issues = validateGraphStructure(graph);

        const errors = issues.filter((i) => i.severity === 'error');
        const warnings = issues.filter((i) => i.severity === 'warning');

        const result = {
          valid: errors.length === 0,
          errors: errors.length,
          warnings: warnings.length,
          issues,
          summary:
            errors.length === 0
              ? warnings.length > 0
                ? `Structure is valid with ${warnings.length} warning(s). Ready to compile.`
                : 'Structure is valid. Ready to compile.'
              : `${errors.length} error(s) must be fixed before compilation.`,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
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
