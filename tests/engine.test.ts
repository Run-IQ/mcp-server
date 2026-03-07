import { describe, it, expect } from 'vitest';
import { createEngine } from '../src/engine.js';

describe('createEngine', () => {
  it('returns engine, models, descriptors, plugins, and dsls', () => {
    const ctx = createEngine();

    expect(ctx.engine).toBeDefined();
    expect(ctx.models.size).toBeGreaterThan(0);
    expect(ctx.descriptorRegistry.isEmpty()).toBe(false);
    expect(ctx.plugins.length).toBeGreaterThan(0);
    expect(ctx.dsls.length).toBeGreaterThan(0);
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

  it('loads fiscal descriptor by default', () => {
    const ctx = createEngine();
    const descriptors = ctx.descriptorRegistry.getAll();

    expect(descriptors).toHaveLength(1);
    expect(descriptors[0]!.name).toBe('@run-iq/plugin-fiscal');
    expect(descriptors[0]!.ruleExtensions.length).toBeGreaterThan(0);
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
  });

  it('accepts custom bundles', () => {
    const mockPlugin = {
      name: 'mock-plugin',
      version: '1.0.0',
      onInit: () => {},
    };
    const mockDescriptor = {
      name: 'mock-plugin',
      version: '1.0.0',
      description: 'Test',
      ruleExtensions: [],
      inputFields: [],
      examples: [],
    };
    const ctx = createEngine([{ plugin: mockPlugin, descriptor: mockDescriptor }]);

    expect(ctx.descriptorRegistry.getAll()).toHaveLength(1);
    expect(ctx.descriptorRegistry.getAll()[0]!.name).toBe('mock-plugin');
  });
});
