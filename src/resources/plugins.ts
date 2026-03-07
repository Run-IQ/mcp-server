import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { FiscalPlugin } from '@run-iq/plugin-fiscal';
import type { JsonLogicEvaluator } from '@run-iq/dsl-jsonlogic';

export function registerPluginsResource(
  server: McpServer,
  fiscalPlugin: FiscalPlugin,
  jsonLogicEvaluator: JsonLogicEvaluator,
): void {
  server.resource(
    'plugins-loaded',
    'plugins://loaded',
    { description: 'Information about loaded plugins and DSL evaluators' },
    () => {
      const info = {
        plugins: [
          {
            name: fiscalPlugin.name,
            version: fiscalPlugin.version,
            models: fiscalPlugin.models.map((m) => m.name),
          },
        ],
        dsls: [
          {
            name: jsonLogicEvaluator.dsl,
            version: jsonLogicEvaluator.version,
          },
        ],
      };

      return {
        contents: [
          {
            uri: 'plugins://loaded',
            mimeType: 'application/json',
            text: JSON.stringify(info, null, 2),
          },
        ],
      };
    },
  );
}
