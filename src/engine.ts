import { PPEEngine } from '@run-iq/core';
import type { PPEPlugin, DSLEvaluator, CalculationModel } from '@run-iq/core';
import { FiscalPlugin } from '@run-iq/plugin-fiscal';
import { JsonLogicEvaluator } from '@run-iq/dsl-jsonlogic';
import type { PluginBundle } from './types/descriptor.js';
import { DescriptorRegistry } from './descriptors/registry.js';
import { fiscalDescriptor } from './descriptors/fiscal.js';

export interface EngineContext {
  readonly engine: PPEEngine;
  readonly models: ReadonlyMap<string, CalculationModel>;
  readonly descriptorRegistry: DescriptorRegistry;
  readonly plugins: readonly PPEPlugin[];
  readonly dsls: readonly DSLEvaluator[];
}

export function createEngine(bundles?: readonly PluginBundle[]): EngineContext {
  const descriptorRegistry = new DescriptorRegistry();
  const allPlugins: PPEPlugin[] = [];
  const allDsls: DSLEvaluator[] = [];

  if (bundles && bundles.length > 0) {
    for (const bundle of bundles) {
      allPlugins.push(bundle.plugin);
      descriptorRegistry.register(bundle.descriptor);
      if (bundle.dsls) {
        allDsls.push(...bundle.dsls);
      }
    }
  } else {
    // Default: FiscalPlugin + JsonLogicEvaluator
    allPlugins.push(new FiscalPlugin());
    allDsls.push(new JsonLogicEvaluator());
    descriptorRegistry.register(fiscalDescriptor);
  }

  const engine = new PPEEngine({
    plugins: allPlugins,
    dsls: allDsls,
    dryRun: true,
    strict: false,
    onConflict: 'first',
    onChecksumMismatch: 'skip',
  });

  // Build model map from plugins that expose a models property (BasePlugin pattern)
  const models = new Map<string, CalculationModel>();
  for (const plugin of allPlugins) {
    const pluginWithModels = plugin as { models?: CalculationModel[] };
    if (Array.isArray(pluginWithModels.models)) {
      for (const model of pluginWithModels.models) {
        models.set(model.name, model);
      }
    }
  }

  return { engine, models, descriptorRegistry, plugins: allPlugins, dsls: allDsls };
}
