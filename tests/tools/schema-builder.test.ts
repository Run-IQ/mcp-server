import { describe, it, expect } from 'vitest';
import { mockDescriptor } from '../mocks.js';
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
    const schema = buildCreateRuleSchema([mockDescriptor]);
    expect(schema['region']).toBeDefined();
    expect(schema['sector']).toBeDefined();
  });

  it('does not add extensions when no descriptors', () => {
    const schema = buildCreateRuleSchema([]);
    expect(schema['region']).toBeUndefined();
    expect(schema['sector']).toBeUndefined();
  });
});

describe('buildValidateExtensionErrors', () => {
  it('returns no errors for a valid rule', () => {
    const rule = {
      region: 'NORTH',
      sector: 'PUBLIC',
    };
    const errors = buildValidateExtensionErrors(rule, [mockDescriptor]);
    expect(errors).toHaveLength(0);
  });

  it('detects missing required fields', () => {
    const errors = buildValidateExtensionErrors({}, [mockDescriptor]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('region'))).toBe(true);
    expect(errors.some((e) => e.includes('sector'))).toBe(true);
  });

  it('detects invalid enum values', () => {
    const rule = {
      region: 'GALACTIC',
      sector: 'PUBLIC',
    };
    const errors = buildValidateExtensionErrors(rule, [mockDescriptor]);
    expect(errors.length).toBe(1);
    expect(errors[0]).toContain('NORTH');
  });

  it('returns no errors when no descriptors', () => {
    const errors = buildValidateExtensionErrors({}, []);
    expect(errors).toHaveLength(0);
  });
});
