import type { PluginBundle } from '@run-iq/plugin-sdk';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createEngine } from './engine.js';
import { loadPluginsFromDir, loadNpmPlugins } from './loader/plugin-loader.js';
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
import { registerAnalyzeTextPrompt } from './prompts/analyze-text.js';
import { registerDomainExpertPrompt } from './prompts/domain-expert.js';
import { VERSION } from './utils/version.js';

// Parse CLI arguments
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

// Load plugin bundles
const bundles: PluginBundle[] = [];
if (pluginsDir) {
  const dirBundles = await loadPluginsFromDir(pluginsDir);
  bundles.push(...dirBundles);
}
if (npmPlugins.length > 0) {
  const npmBundles = await loadNpmPlugins(npmPlugins);
  bundles.push(...npmBundles);
}

const { engine, models, descriptorRegistry, plugins, dsls } = createEngine(bundles);
const descriptors = descriptorRegistry.getAll();

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
registerAnalyzeTextPrompt(server, models, descriptorRegistry);
registerDomainExpertPrompt(server, descriptorRegistry);

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
