import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createEngine } from './engine.js';
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
import { registerAnalyzeLawPrompt } from './prompts/analyze-law.js';
import { registerFiscalExpertPrompt } from './prompts/fiscal-expert.js';

const { engine, fiscalPlugin, jsonLogicEvaluator, models } = createEngine();

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
registerCreateRuleTool(server);
registerValidateRulesTool(server, models);
registerListModelsTool(server, models);
registerEvaluateTool(server, engine);
registerInspectRuleTool(server, models);
registerExplainResultTool(server);
registerSimulateTool(server, engine);

// Resources
registerModelsResource(server, models);
registerPluginsResource(server, fiscalPlugin, jsonLogicEvaluator);

// Prompts
registerAnalyzeLawPrompt(server, models);
registerFiscalExpertPrompt(server);

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
