import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { PluginBundle } from './types/descriptor.js';
import { createEngine } from './engine.js';
import { loadPluginsFromDir } from './loader/plugin-loader.js';
import { registerCreateChecksumTool } from './tools/create-checksum.js';
import { registerCreateRuleTool } from './tools/create-rule.js';
import { registerValidateRulesTool } from './tools/validate.js';
import { registerListModelsTool } from './tools/list-models.js';
import { registerEvaluateTool } from './tools/evaluate.js';
import { registerInspectRuleTool } from './tools/inspect-rule.js';
import { registerExplainResultTool } from './tools/explain.js';
import { registerSimulateTool } from './tools/simulate.js';
import { registerModelsResource } from './resources/models.js';
import { registerPluginsResource } from './resources/plugins.js';
import { registerSchemaResource } from './resources/schema.js';
import { registerAnalyzeLawPrompt } from './prompts/analyze-law.js';
import { registerFiscalExpertPrompt } from './prompts/fiscal-expert.js';

// Parse CLI arguments
let pluginsDir: string | undefined;
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--plugins-dir' && argv[i + 1]) {
    pluginsDir = argv[i + 1];
    i++;
  }
}

// Load plugin bundles
let bundles: PluginBundle[] | undefined;
if (pluginsDir) {
  bundles = await loadPluginsFromDir(pluginsDir);
}

const { engine, models, descriptorRegistry, plugins, dsls } = createEngine(bundles);
const descriptors = descriptorRegistry.getAll();

const server = new McpServer(
  {
    name: '@run-iq/mcp-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  },
);

// Tools
registerCreateChecksumTool(server);
registerCreateRuleTool(server, descriptors);
registerValidateRulesTool(server, models, descriptors);
registerListModelsTool(server, models);
registerEvaluateTool(server, engine);
registerInspectRuleTool(server, models, descriptors);
registerExplainResultTool(server);
registerSimulateTool(server, engine);

// Resources
registerModelsResource(server, models);
registerPluginsResource(server, plugins, dsls, descriptorRegistry);
registerSchemaResource(server, models, descriptorRegistry);

// Prompts
registerAnalyzeLawPrompt(server, models, descriptorRegistry);
registerFiscalExpertPrompt(server, descriptorRegistry);

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
