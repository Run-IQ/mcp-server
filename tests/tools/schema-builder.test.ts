import { describe, it, expect } from 'vitest';
import { fiscalDescriptor } from '../../src/descriptors/fiscal.js';
import {
  buildCreateRuleSchema,
  buildValidateExtensionErrors,
} from '../../src/tools/schema-builder.js';

describe('buildCreateRuleSchema', () => {
  it('includes base fields', () => {
    const schema = buildCreateRuleSchema([]);
    expect(schema['id']).toBeDefined();
    expect(schema['model']).toBeDefined();
    expect(schema['params']).toBeDefined();
    expect(schema['effectiveFrom']).toBeDefined();
  });

  it('adds plugin extension fields', () => {
    const schema = buildCreateRuleSchema([fiscalDescriptor]);
    expect(schema['jurisdiction']).toBeDefined();
    expect(schema['scope']).toBeDefined();
    expect(schema['country']).toBeDefined();
    expect(schema['category']).toBeDefined();
  });

  it('does not add extensions when no descriptors', () => {
    const schema = buildCreateRuleSchema([]);
    expect(schema['jurisdiction']).toBeUndefined();
    expect(schema['scope']).toBeUndefined();
  });
});

describe('buildValidateExtensionErrors', () => {
  it('returns no errors for a valid fiscal rule', () => {
    const rule = {
      jurisdiction: 'NATIONAL',
      scope: 'GLOBAL',
      country: 'TG',
      category: 'TVA',
    };
    const errors = buildValidateExtensionErrors(rule, [fiscalDescriptor]);
    expect(errors).toHaveLength(0);
  });

  it('detects missing required fields', () => {
    const errors = buildValidateExtensionErrors({}, [fiscalDescriptor]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('jurisdiction'))).toBe(true);
    expect(errors.some((e) => e.includes('scope'))).toBe(true);
    expect(errors.some((e) => e.includes('country'))).toBe(true);
    expect(errors.some((e) => e.includes('category'))).toBe(true);
  });

  it('detects invalid enum values', () => {
    const rule = {
      jurisdiction: 'GALACTIC',
      scope: 'GLOBAL',
      country: 'TG',
      category: 'TVA',
    };
    const errors = buildValidateExtensionErrors(rule, [fiscalDescriptor]);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('NATIONAL');
  });

  it('returns no errors when no descriptors', () => {
    const errors = buildValidateExtensionErrors({}, []);
    expect(errors).toHaveLength(0);
  });
});
