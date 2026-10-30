import type { DGGraph } from '@run-iq/dg';

const policy = { onError: 'skip', onFailPropagation: 'continue' } as const;

/** Two compute nodes in sequence: a → b. */
export function linearGraph(): DGGraph {
  return {
    id: 'linear',
    version: '1.0.0',
    meta: { description: 'Linear test graph' },
    nodes: {
      a: {
        id: 'a',
        type: 'compute',
        model: 'MOCK_RATE',
        ports: { in: [], out: [{ name: 'value', required: true }] },
        policy,
      },
      b: {
        id: 'b',
        type: 'compute',
        model: 'MOCK_RATE',
        ports: {
          in: [{ name: 'value', required: true }],
          out: [{ name: 'value', required: true }],
        },
        policy,
      },
    },
    edges: [{ id: 'a_to_b', from: { node: 'a', port: 'value' }, to: { node: 'b', port: 'value' } }],
  };
}

/** Same as linearGraph, plus an edge b → a that closes a cycle. */
export function cyclicGraph(): DGGraph {
  const graph = linearGraph();
  const a = graph.nodes['a']!;
  return {
    ...graph,
    id: 'cyclic',
    nodes: {
      ...graph.nodes,
      a: { ...a, ports: { ...a.ports, in: [{ name: 'value', required: false }] } },
    },
    edges: [
      ...graph.edges,
      { id: 'b_to_a', from: { node: 'b', port: 'value' }, to: { node: 'a', port: 'value' } },
    ],
  };
}

export const execMeta = (requestId: string) => ({ requestId, tenantId: 'test' });
