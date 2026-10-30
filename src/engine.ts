import { PPEEngine } from '@run-iq/core';
import type { PPEPlugin, DSLEvaluator, CalculationModel } from '@run-iq/core';
import type { PluginBundle } from '@run-iq/plugin-sdk';
import {
  DGCompiler,
  DGOrchestrator,
  CoreNodeExecutor,
  HttpNodeExecutor,
  CompositeExecutor,
  StaticRuleResolver,
} from '@run-iq/dg';
import type { CompiledGraph, DGGraph, DGResult } from '@run-iq/dg';
import { DescriptorRegistry } from './descriptors/registry.js';

// ─── Graph Session Store ────────────────────────────────────────────────────

/**
 * In-memory store for compiled graphs during an MCP session.
 * Allows compile_graph → execute_graph flow without re-sending JSON.
 */
export class GraphStore {
  private readonly graphs = new Map<string, CompiledGraph>();
  private readonly builders = new Map<string, DGGraph>();

  /** Store a compiled graph keyed by its hash. */
  storeCompiled(compiled: CompiledGraph): void {
    this.graphs.set(compiled.hash, compiled);
  }

  /** Retrieve a compiled graph by hash. */
  getCompiled(hash: string): CompiledGraph | undefined {
    return this.graphs.get(hash);
  }

  /** List all compiled graph hashes. */
  listCompiled(): string[] {
    return [...this.graphs.keys()];
  }

  /** Store or update a graph being built incrementally. */
  setBuilder(sessionId: string, graph: DGGraph): void {
    this.builders.set(sessionId, graph);
  }

  /** Get the graph being built. */
  getBuilder(sessionId: string): DGGraph | undefined {
    return this.builders.get(sessionId);
  }

  /** Remove a builder session. */
  clearBuilder(sessionId: string): void {
    this.builders.delete(sessionId);
  }
}

// ─── Last Execution Store ───────────────────────────────────────────────────

/**
 * Stores the result of the last DG execution for post-mortem inspection.
 */
export class ExecutionResultStore {
  private readonly results = new Map<string, DGResult>();

  store(requestId: string, result: DGResult): void {
    this.results.set(requestId, result);
    // Keep max 20 results in memory to avoid unbounded growth
    if (this.results.size > 20) {
      const oldest = this.results.keys().next().value as string;
      this.results.delete(oldest);
    }
  }

  get(requestId: string): DGResult | undefined {
    return this.results.get(requestId);
  }

  getLast(): DGResult | undefined {
    const entries = [...this.results.values()];
    return entries[entries.length - 1];
  }
}

// ─── Engine Context ─────────────────────────────────────────────────────────

export interface EngineContext {
  readonly engine: PPEEngine;
  readonly models: ReadonlyMap<string, CalculationModel>;
  readonly descriptorRegistry: DescriptorRegistry;
  readonly plugins: readonly PPEPlugin[];
  readonly dsls: readonly DSLEvaluator[];
  readonly compiler: DGCompiler;
  readonly orchestrator: DGOrchestrator;
  readonly graphStore: GraphStore;
  readonly executionStore: ExecutionResultStore;
}

export function createEngine(bundles?: readonly PluginBundle[]): EngineContext {
  const descriptorRegistry = new DescriptorRegistry();
  const allPlugins: PPEPlugin[] = [];
  const allDsls: DSLEvaluator[] = [];

  if (bundles && bundles.length > 0) {
    for (const bundle of bundles) {
      allPlugins.push(bundle.plugin as unknown as PPEPlugin);
      descriptorRegistry.register(bundle.descriptor);
      if (bundle.dsls) {
        allDsls.push(...bundle.dsls);
      }
    }
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
  const models = new Map<string, CalculationModel & { pluginName?: string }>();
  for (const plugin of allPlugins) {
    // justification: BasePlugin exposes a models array, but PPEPlugin interface doesn't declare it
    const pluginWithModels = plugin as { name: string; models?: CalculationModel[] };
    if (Array.isArray(pluginWithModels.models)) {
      for (const model of pluginWithModels.models) {
        // Tag model with source plugin name — use defineProperty to preserve prototype chain
        // justification: spread strips prototype methods (validateParams, calculate), so we attach pluginName directly
        const modelWithPlugin = model as CalculationModel & { pluginName?: string };
        Object.defineProperty(modelWithPlugin, 'pluginName', {
          value: pluginWithModels.name,
          enumerable: true,
          writable: false,
          configurable: false,
        });
        models.set(modelWithPlugin.name, modelWithPlugin);
      }
    }
  }

  // ─── Decision Graph Bootstrap ─────────────────────────────────────

  const compiler = new DGCompiler();

  // Build DSL map for edge condition evaluation
  const dslMap = new Map<string, DSLEvaluator>();
  for (const dsl of allDsls) {
    dslMap.set(dsl.dsl, dsl);
  }

  // Executors: Core (rules) + HTTP (enrichment)
  const coreExecutor = new CoreNodeExecutor(engine, new StaticRuleResolver(new Map()));
  const httpExecutor = new HttpNodeExecutor();
  const compositeExecutor = new CompositeExecutor(coreExecutor, httpExecutor);

  const orchestrator = new DGOrchestrator(compositeExecutor, dslMap, {
    scheduling: 'eager',
  });

  const graphStore = new GraphStore();
  const executionStore = new ExecutionResultStore();

  return {
    engine,
    models,
    descriptorRegistry,
    plugins: allPlugins,
    dsls: allDsls,
    compiler,
    orchestrator,
    graphStore,
    executionStore,
  };
}
