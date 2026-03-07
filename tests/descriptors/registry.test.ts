import { describe, it, expect } from 'vitest';
import { DescriptorRegistry } from '../../src/descriptors/registry.js';
import { fiscalDescriptor } from '@run-iq/plugin-fiscal';

describe('DescriptorRegistry', () => {
  it('starts empty', () => {
    const registry = new DescriptorRegistry();
    expect(registry.isEmpty()).toBe(true);
    expect(registry.getAll()).toHaveLength(0);
  });

  it('registers and retrieves descriptors', () => {
    const registry = new DescriptorRegistry();
    registry.register(fiscalDescriptor);

    expect(registry.isEmpty()).toBe(false);
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getAll()[0]!.name).toBe('@run-iq/plugin-fiscal');
  });

  it('aggregates rule extensions', () => {
    const registry = new DescriptorRegistry();
    registry.register(fiscalDescriptor);

    const extensions = registry.getRuleExtensions();
    const names = extensions.map((e) => e.name);

    expect(names).toContain('jurisdiction');
    expect(names).toContain('scope');
    expect(names).toContain('country');
    expect(names).toContain('category');
  });

  it('aggregates input fields with dedup', () => {
    const registry = new DescriptorRegistry();
    registry.register(fiscalDescriptor);
    registry.register({
      ...fiscalDescriptor,
      name: 'second-plugin',
      inputFields: [
        { name: 'revenue', type: 'number', description: 'duplicate' },
        { name: 'salary', type: 'number', description: 'new field' },
      ],
    });

    const fields = registry.getInputFields();
    const names = fields.map((f) => f.name);

    // revenue should appear only once (first registration wins)
    expect(names.filter((n) => n === 'revenue')).toHaveLength(1);
    expect(names).toContain('salary');
  });

  it('aggregates examples from all descriptors', () => {
    const registry = new DescriptorRegistry();
    registry.register(fiscalDescriptor);

    const examples = registry.getExamples();
    expect(examples.length).toBeGreaterThan(0);
    expect(examples[0]!.title).toBeDefined();
    expect(examples[0]!.rule).toBeDefined();
  });
});
