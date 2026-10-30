import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

function buildGraphSchemaDocument(): string {
  const lines: string[] = [];

  lines.push('# Decision Graph Schema Reference');
  lines.push('');
  lines.push('Complete specification for building valid `DGGraph` objects.');
  lines.push('');

  // Top-level structure
  lines.push('## DGGraph Structure');
  lines.push('');
  lines.push('```typescript');
  lines.push('interface DGGraph {');
  lines.push('  id: string;           // Unique graph identifier');
  lines.push('  version: string;      // Semver version');
  lines.push('  nodes: Record<string, DGNode>;');
  lines.push('  edges: DGEdge[];');
  lines.push('  meta?: GraphMeta;');
  lines.push('}');
  lines.push('```');
  lines.push('');
  lines.push(
    'Identifiers (`graph.id`, node ids, edge ids and port names) must match `^[a-zA-Z0-9_-]+$`. A node key must equal its `id`.',
  );
  lines.push('');

  // Node types
  lines.push('## Node Types');
  lines.push('');
  lines.push('| Type | Purpose | Required Config |');
  lines.push('|------|---------|-----------------|');
  lines.push('| `compute` | Execute PPE rules via a model | `model` field |');
  lines.push('| `enrich` | Fetch external data (HTTP) | `meta.enrichConfig` |');
  lines.push('| `branch` | Route execution to different paths | Conditional edges out |');
  lines.push('| `guard` | Block execution if condition fails | Conditional edges |');
  lines.push('| `merge` | Join multiple branches | `meta.mergeConfig` (strategy) |');
  lines.push('| `subgraph` | Execute a nested Decision Graph | `meta.subGraphConfig` |');
  lines.push('');

  // DGNode
  lines.push('## DGNode');
  lines.push('');
  lines.push('```typescript');
  lines.push('interface DGNode {');
  lines.push('  id: string;');
  lines.push("  type: 'compute' | 'enrich' | 'branch' | 'guard' | 'merge' | 'subgraph';");
  lines.push('  model?: string;       // Required for compute, references a CalculationModel');
  lines.push('  ports: {');
  lines.push('    in: PortDescriptor[];');
  lines.push('    out: PortDescriptor[];');
  lines.push('  };');
  lines.push('  policy: NodePolicy;');
  lines.push('  meta?: Record<string, unknown>;');
  lines.push('}');
  lines.push('');
  lines.push('interface PortDescriptor {');
  lines.push("  name: string;         // Port name (e.g. 'value', 'breakdown')");
  lines.push('  required: boolean;    // If true, missing output = error');
  lines.push('  schema?: unknown;     // Informational, not checked at run time');
  lines.push('  default?: unknown;    // Input value used when no wired value arrives');
  lines.push('}');
  lines.push('```');
  lines.push('');

  // Ports best practices
  lines.push('### Common Port Names');
  lines.push('');
  lines.push('| Port Name | Direction | Description |');
  lines.push('|-----------|-----------|-------------|');
  lines.push('| `value` | out | Primary computed value |');
  lines.push('| `breakdown` | out | Per-rule breakdown details |');
  lines.push('| `trace` | out | Execution trace |');
  lines.push('| `applied` | out | Applied rules list |');
  lines.push('| `value` | in | Input value from upstream |');
  lines.push('');

  // DGEdge
  lines.push('## DGEdge');
  lines.push('');
  lines.push('```typescript');
  lines.push('interface DGEdge {');
  lines.push('  id: string;');
  lines.push('  from: { node: string; port: string };  // e.g. "value"');
  lines.push('  to: { node: string; port: string };    // e.g. "value"');
  lines.push('  portAlias?: string;  // input key the target node receives instead of to.port');
  lines.push('  condition?: EdgeCondition;              // if absent, always active');
  lines.push('}');
  lines.push('');
  lines.push('interface EdgeCondition {');
  lines.push("  dsl: string;          // e.g. 'jsonlogic'");
  lines.push('  expression: unknown;  // DSL expression');
  lines.push("  scope: 'source-output' | 'full-context';");
  lines.push('}');
  lines.push('```');
  lines.push('');
  lines.push(
    '`source-output` evaluates the expression against the source node outputs; `full-context` against the whole execution context.',
  );
  lines.push('');

  // Merge strategies
  lines.push('## Merge Strategies');
  lines.push('');
  lines.push('```typescript');
  lines.push('interface MergeNodeConfig {');
  lines.push("  strategy: 'wait-all' | 'wait-any' | 'wait-quorum';");
  lines.push('  quorum?: number;      // Required if strategy is "wait-quorum"');
  lines.push("  onPartialInputs: 'fail' | 'proceed-with-available' | 'use-defaults';");
  lines.push('}');
  lines.push('```');
  lines.push('');
  lines.push('| Strategy | Behavior |');
  lines.push('|----------|----------|');
  lines.push('| `wait-all` | Wait for ALL parent nodes to complete |');
  lines.push('| `wait-any` | Continue as soon as ANY parent completes |');
  lines.push('| `wait-quorum` | Continue when `quorum` parents have completed |');
  lines.push('');
  lines.push(
    "A `wait-all` merge whose parent has `onError: 'skip'` is rejected at compile time (deadlock): give such parents `onError: 'fallback'` or use `wait-any`.",
  );
  lines.push('');

  // Enrich config
  lines.push('## EnrichConfig (for `enrich` nodes)');
  lines.push('');
  lines.push('```typescript');
  lines.push('interface EnrichConfig {');
  lines.push('  endpoint: string;     // HTTP endpoint, no credentials');
  lines.push("  method?: 'GET' | 'POST';  // default: GET");
  lines.push('  timeoutMs: number;    // per attempt, max 5000');
  lines.push('  retry?: number;       // 0-3 retries on 5xx / network error, default 0');
  lines.push("  onFailure: 'fail' | 'fallback';  // fallback returns node.policy.fallback");
  lines.push('  inputMapping: Record<string, string>;   // request param -> input path');
  lines.push('  outputMapping: Record<string, string>;  // output port -> response dot-path');
  lines.push('  responseMaxBytes?: number;  // default: 102400');
  lines.push('}');
  lines.push('```');
  lines.push('');

  // SubGraph config
  lines.push('## SubGraphConfig (for `subgraph` nodes)');
  lines.push('');
  lines.push('```typescript');
  lines.push('interface SubGraphConfig {');
  lines.push('  graphId: string;      // id of a pre-registered compiled sub-graph');
  lines.push('  inputMapping: Record<string, string>;   // sub-graph input -> parent path');
  lines.push('  outputMapping: Record<string, string>;  // parent port -> sub-graph output');
  lines.push('}');
  lines.push('```');
  lines.push('');

  // Node Policy
  lines.push('## NodePolicy');
  lines.push('');
  lines.push('```typescript');
  lines.push('interface NodePolicy {');
  lines.push("  onError: 'fail' | 'skip' | 'fallback';");
  lines.push('  fallback?: Record<string, unknown>;  // outputs used when onError = "fallback"');
  lines.push('  timeout?: number;');
  lines.push("  onFailPropagation: 'halt' | 'skip-descendants' | 'continue';");
  lines.push('  storeRaw?: boolean;                  // store raw engine result');
  lines.push('  maxOutputSizeKb?: number;            // output size guard, default 512');
  lines.push('}');
  lines.push('```');
  lines.push('');

  // Graph Meta
  lines.push('## GraphMeta');
  lines.push('');
  lines.push('```typescript');
  lines.push('interface GraphMeta {');
  lines.push('  description?: string;');
  lines.push('  domain?: string;');
  lines.push('  author?: string;');
  lines.push('  tags?: string[];');
  lines.push('  executionLimits?: ExecutionLimits;');
  lines.push('}');
  lines.push('');
  lines.push('interface ExecutionLimits {');
  lines.push('  maxNodes?: number;          // default 500');
  lines.push('  maxDepth?: number;          // default 50');
  lines.push('  maxEvents?: number;         // default 10000');
  lines.push('  maxDurationMs?: number;     // default 30000');
  lines.push('  maxParallelNodes?: number;  // default 20');
  lines.push('}');
  lines.push('```');

  return lines.join('\n');
}

export function registerGraphSchemaResource(server: McpServer): void {
  server.resource(
    'graph-schema',
    'schema://graph',
    {
      description:
        'Complete Decision Graph schema: node types (compute/enrich/merge/subgraph/branch/guard), edge conditions, merge strategies, enrich config, policies, and port conventions.',
    },
    () => ({
      contents: [
        {
          uri: 'schema://graph',
          mimeType: 'text/markdown',
          text: buildGraphSchemaDocument(),
        },
      ],
    }),
  );
}
