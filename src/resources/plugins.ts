import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PPEPlugin, DSLEvaluator } from '@run-iq/core';
import type { DescriptorRegistry } from '../descriptors/registry.js';

export function registerPluginsResource(
  server: McpServer,
  plugins: readonly PPEPlugin[],
  dsls: readonly DSLEvaluator[],
  registry: DescriptorRegistry,
): void {
  server.resource(
    'plugins-loaded',
    'plugins://loaded',
    { description: 'Information about loaded plugins, DSL evaluators, and their descriptors' },
    () => {
      const descriptors = registry.getAll();

      const info = {
        plugins: plugins.map((p) => {
          const desc = descriptors.find((d) => d.name === p.name);
          const pluginWithModels = p as { models?: { name: string }[] };
          return {
            name: p.name,
            version: p.version,
            models: Array.isArray(pluginWithModels.models)
              ? pluginWithModels.models.map((m) => m.name)
              : [],
            hasDescriptor: desc !== undefined,
            ruleExtensions: desc?.ruleExtensions.map((f) => f.name) ?? [],
          };
        }),
        dsls: dsls.map((d) => ({
          name: d.dsl,
          version: d.version,
        })),
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
