import { describe, it, expect } from 'vitest';
import { createEngine } from '../src/engine.js';

describe('createEngine', () => {
  it('returns an engine, plugin, evaluator, and models', () => {
    const ctx = createEngine();

    expect(ctx.engine).toBeDefined();
    expect(ctx.fiscalPlugin).toBeDefined();
    expect(ctx.jsonLogicEvaluator).toBeDefined();
    expect(ctx.models).toBeDefined();
    expect(ctx.models.size).toBeGreaterThan(0);
  });

  it('contains all 6 fiscal models', () => {
    const ctx = createEngine();
    const names = [...ctx.models.keys()];

    expect(names).toContain('FLAT_RATE');
    expect(names).toContain('PROGRESSIVE_BRACKET');
    expect(names).toContain('MINIMUM_TAX');
    expect(names).toContain('THRESHOLD_BASED');
    expect(names).toContain('FIXED_AMOUNT');
    expect(names).toContain('COMPOSITE');
  });

  it('engine can evaluate in dryRun mode', async () => {
    const { engine } = createEngine();
    const result = await engine.evaluate([], {
      data: {},
      requestId: 'test-1',
      meta: { tenantId: 'test' },
    });

    expect(result).toBeDefined();
    expect(result.value).toBe(0);
    expect(typeof result.snapshotId).toBe('string');
    expect(result.snapshotId.length).toBeGreaterThan(0);
  });
});
