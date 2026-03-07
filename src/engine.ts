import { PPEEngine } from '@run-iq/core';
import type { CalculationModel } from '@run-iq/core';
import { FiscalPlugin } from '@run-iq/plugin-fiscal';
import { JsonLogicEvaluator } from '@run-iq/dsl-jsonlogic';

export interface EngineContext {
  readonly engine: PPEEngine;
  readonly fiscalPlugin: FiscalPlugin;
  readonly jsonLogicEvaluator: JsonLogicEvaluator;
  readonly models: ReadonlyMap<string, CalculationModel>;
}

export function createEngine(): EngineContext {
  const fiscalPlugin = new FiscalPlugin();
  const jsonLogicEvaluator = new JsonLogicEvaluator();

  const engine = new PPEEngine({
    plugins: [fiscalPlugin],
    dsls: [jsonLogicEvaluator],
    dryRun: true,
    strict: false,
    onConflict: 'first',
    onChecksumMismatch: 'skip',
  });

  // Build model map from the FiscalPlugin's declared models
  const models = new Map<string, CalculationModel>();
  for (const model of fiscalPlugin.models) {
    models.set(model.name, model);
  }

  return { engine, fiscalPlugin, jsonLogicEvaluator, models };
}
