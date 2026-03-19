import type { PluginBundle } from '@run-iq/plugin-sdk';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createEngine } from './engine.js';
import { loadPluginsFromDir, loadNpmPlugins } from './loader/plugin-loader.js';

// ─── Existing Tools ─────────────────────────────────────────────────────────
import { registerCreateChecksumTool } from './tools/create-checksum.js';
import { registerCreateRuleTool } from './tools/create-rule.js';
import { registerValidateRulesTool } from './tools/validate.js';
import { registerListModelsTool } from './tools/list-models.js';
import { registerEvaluateTool } from './tools/evaluate.js';
import { registerInspectRuleTool } from './tools/inspect-rule.js';
import { registerExplainResultTool } from './tools/explain.js';
import { registerSimulateTool } from './tools/simulate.js';

// ─── New DG Tools ───────────────────────────────────────────────────────────
import { registerCompileGraphTool } from './tools/compile-graph.js';
import { registerExecuteGraphTool } from './tools/execute-graph.js';
import { registerSimulateGraphTool } from './tools/simulate-graph.js';
import { registerInspectGraphTool } from './tools/inspect-graph.js';
import { registerInspectContextTool } from './tools/inspect-context.js';
import { registerExplainGraphResultTool } from './tools/explain-graph-result.js';
import { registerDesignGraphTool } from './tools/design-graph.js';
import { registerValidateGraphTool } from './tools/validate-graph.js';

// ─── Resources ──────────────────────────────────────────────────────────────
import { registerModelsResource } from './resources/models.js';
import { registerPluginsResource } from './resources/plugins.js';
import { registerSchemaResource } from './resources/schema.js';
import { registerGraphSchemaResource } from './resources/graph-schema.js';
import { registerGraphExamplesResource } from './resources/graph-examples.js';

// ─── Prompts ────────────────────────────────────────────────────────────────
import { registerAnalyzeTextPrompt } from './prompts/analyze-text.js';
import { registerDomainExpertPrompt } from './prompts/domain-expert.js';
import { registerOrchestrationArchitectPrompt } from './prompts/orchestration-architect.js';

import { VERSION } from './utils/version.js';

// ─── Parse CLI arguments ────────────────────────────────────────────────────
let pluginsDir: string | undefined;
const npmPlugins: string[] = [];
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--plugins-dir' && argv[i + 1]) {
    pluginsDir = argv[i + 1];
    i++;
  } else if (argv[i] === '--plugin' && argv[i + 1]) {
    npmPlugins.push(argv[i + 1]!);
    i++;
  }
}

// ─── Load plugin bundles ────────────────────────────────────────────────────
const bundles: PluginBundle[] = [];
if (pluginsDir) {
  const dirBundles = await loadPluginsFromDir(pluginsDir);
  bundles.push(...dirBundles);
}
if (npmPlugins.length > 0) {
  const npmBundles = await loadNpmPlugins(npmPlugins);
  bundles.push(...npmBundles);
}

// ─── Bootstrap engine + DG ──────────────────────────────────────────────────
const {
  engine,
  models,
  descriptorRegistry,
  plugins,
  dsls,
  compiler,
  orchestrator,
  graphStore,
  executionStore,
} = createEngine(bundles);
const descriptors = descriptorRegistry.getAll();

// ─── MCP Server ─────────────────────────────────────────────────────────────
const server = new McpServer(
  {
    name: '@run-iq/mcp-server',
    version: VERSION,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  },
);

// ─── Tools (16) ─────────────────────────────────────────────────────────────

// Core PPE tools (8)
registerCreateChecksumTool(server);
registerCreateRuleTool(server, descriptors);
registerValidateRulesTool(server, models, descriptors);
registerListModelsTool(server, models);
registerEvaluateTool(server, engine);
registerInspectRuleTool(server, models, descriptors);
registerExplainResultTool(server);
registerSimulateTool(server, engine);

// Decision Graph tools (8)
registerCompileGraphTool(server, compiler, graphStore);
registerExecuteGraphTool(server, compiler, orchestrator, graphStore, executionStore);
registerSimulateGraphTool(server, compiler, orchestrator, graphStore);
registerInspectGraphTool(server, compiler, graphStore);
registerInspectContextTool(server, executionStore);
registerExplainGraphResultTool(server, executionStore);
registerDesignGraphTool(server, graphStore);
registerValidateGraphTool(server);

// ─── Resources (5) ──────────────────────────────────────────────────────────
registerModelsResource(server, models);
registerPluginsResource(server, plugins, dsls, descriptorRegistry);
registerSchemaResource(server, models, descriptorRegistry, dsls);
registerGraphSchemaResource(server);
registerGraphExamplesResource(server);

// ─── Prompts (3) ────────────────────────────────────────────────────────────
registerAnalyzeTextPrompt(server, models, descriptorRegistry, dsls);
registerDomainExpertPrompt(server, descriptorRegistry);
registerOrchestrationArchitectPrompt(server, models, descriptorRegistry, dsls);

// ─── Start stdio transport ──────────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);

// ─── Graceful shutdown handlers ─────────────────────────────────────────────
async function shutdown(): Promise<void> {
  try {
    await server.close();
    await transport.close();
  } catch {
    // Best-effort cleanup — ignore errors during shutdown
  }
  process.exit(0);
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
