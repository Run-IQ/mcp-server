import { describe, it, expect } from 'vitest';
import { createEngine } from '../src/engine.js';
import { mockBundle } from './mocks.js';

describe('createEngine', () => {
  it('returns engine, models, descriptors, plugins, and dsls', () => {
    const ctx = createEngine([mockBundle]);

    expect(ctx.engine).toBeDefined();
    expect(ctx.models.size).toBeGreaterThan(0);
    expect(ctx.descriptorRegistry.isEmpty()).toBe(false);
    expect(ctx.plugins.length).toBeGreaterThan(0);
    expect(ctx.dsls.length).toBeGreaterThan(0);
  });

  it('contains mock models', () => {
    const ctx = createEngine([mockBundle]);
    const names = [...ctx.models.keys()];

    expect(names).toContain('MOCK_RATE');
    expect(names).toContain('MOCK_DOUBLE');
  });

  it('loads mock descriptor when bundle passed', () => {
    const ctx = createEngine([mockBundle]);
    const descriptors = ctx.descriptorRegistry.getAll();

    expect(descriptors).toHaveLength(1);
    expect(descriptors[0]!.name).toBe('mock-plugin');
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
      name: 'custom-plugin',
      version: '1.0.0',
      onInit: () => {},
    };
    const mockDescriptor = {
      name: 'custom-plugin',
      version: '1.0.0',
      description: 'Test',
      ruleExtensions: [],
      inputFields: [],
      examples: [],
    };
    const ctx = createEngine([{ plugin: mockPlugin, descriptor: mockDescriptor }]);

    expect(ctx.descriptorRegistry.getAll()).toHaveLength(1);
    expect(ctx.descriptorRegistry.getAll()[0]!.name).toBe('custom-plugin');
  });
});
