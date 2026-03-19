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
  lines.push('  meta: GraphMeta;');
  lines.push('}');
  lines.push('```');
  lines.push('');

  // Node types
  lines.push('## Node Types');
  lines.push('');
  lines.push('| Type | Purpose | Required Config |');
  lines.push('|------|---------|-----------------|');
  lines.push('| `compute` | Execute PPE rules via a model | `model` field |');
  lines.push('| `enrich` | Fetch external data (HTTP) | `meta.enrichConfig` |');
  lines.push(
    '| `branch` | Route execution to different paths | Conditional edges out |',
  );
  lines.push('| `guard` | Block execution if condition fails | Conditional edges |');
  lines.push(
    '| `merge` | Join multiple branches | `meta.mergeConfig` (strategy) |',
  );
  lines.push(
    '| `subgraph` | Execute a nested Decision Graph | `meta.subGraphConfig` |',
  );
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
  lines.push('  policy?: NodePolicy;');
  lines.push('  meta?: Record<string, unknown>;');
  lines.push('}');
  lines.push('');
  lines.push('interface PortDescriptor {');
  lines.push("  name: string;         // Port name (e.g. 'value', 'breakdown')");
  lines.push('  required?: boolean;   // If true, missing output = error');
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
  lines.push('  from: { node: string; port?: string };  // defaults to "value"');
  lines.push('  to: { node: string; port?: string };    // defaults to "value"');
  lines.push('  condition?: EdgeCondition;               // if absent, always active');
  lines.push('}');
  lines.push('');
  lines.push('interface EdgeCondition {');
  lines.push("  dsl: string;          // e.g. 'jsonlogic'");
  lines.push('  expression: unknown;  // DSL expression');
  lines.push("  scope?: 'source-output' | 'full-context';  // default: source-output");
  lines.push('}');
  lines.push('```');
  lines.push('');

  // Merge strategies
  lines.push('## Merge Strategies');
  lines.push('');
  lines.push('```typescript');
  lines.push('interface MergeNodeConfig {');
  lines.push("  strategy: 'wait-all' | 'first-wins' | 'quorum';");
  lines.push('  quorum?: number;      // Required if strategy is "quorum"');
  lines.push('}');
  lines.push('```');
  lines.push('');
  lines.push('| Strategy | Behavior |');
  lines.push('|----------|----------|');
  lines.push('| `wait-all` | Wait for ALL parent nodes to complete |');
  lines.push('| `first-wins` | Continue as soon as ANY parent completes |');
  lines.push('| `quorum` | Continue when N parents have completed |');
  lines.push('');

  // Enrich config
  lines.push('## EnrichConfig (for `enrich` nodes)');
  lines.push('');
  lines.push('```typescript');
  lines.push('interface EnrichConfig {');
  lines.push('  url: string;          // HTTP endpoint');
  lines.push("  method?: 'GET' | 'POST';  // default: GET");
  lines.push('  headers?: Record<string, string>;');
  lines.push('  bodyMapping?: Record<string, string>;  // input→body mapping');
  lines.push('  outputMapping?: Record<string, string>; // response→output mapping');
  lines.push('  timeoutMs?: number;   // default: 5000');
  lines.push('}');
  lines.push('```');
  lines.push('');

  // SubGraph config
  lines.push('## SubGraphConfig (for `subgraph` nodes)');
  lines.push('');
  lines.push('```typescript');
  lines.push('interface SubGraphConfig {');
  lines.push('  graph: DGGraph;       // The nested graph definition');
  lines.push('  inputMapping?: Record<string, string>;  // parent→child input mapping');
  lines.push('  outputMapping?: Record<string, string>; // child→parent output mapping');
  lines.push('}');
  lines.push('```');
  lines.push('');

  // Node Policy
  lines.push('## NodePolicy');
  lines.push('');
  lines.push('```typescript');
  lines.push('interface NodePolicy {');
  lines.push("  onFail?: 'halt' | 'skip' | 'default';  // error handling strategy");
  lines.push('  defaultValue?: unknown;                  // used when onFail = "default"');
  lines.push('  maxOutputSizeKb?: number;                // output size guard');
  lines.push('  storeRaw?: boolean;                      // store raw engine result');
  lines.push('}');
  lines.push('```');
  lines.push('');

  // Graph Meta
  lines.push('## GraphMeta');
  lines.push('');
  lines.push('```typescript');
  lines.push('interface GraphMeta {');
  lines.push('  name: string;');
  lines.push('  description?: string;');
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
