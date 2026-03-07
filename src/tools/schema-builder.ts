import { z } from 'zod';
import type { RuleFieldDescriptor, PluginDescriptor } from '../types/descriptor.js';

function buildFieldSchema(field: RuleFieldDescriptor): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  if (field.enum && field.enum.length > 0) {
    schema = z.enum(field.enum as [string, ...string[]]);
  } else {
    switch (field.type) {
      case 'string':
        schema = z.string();
        break;
      case 'number':
        schema = z.number();
        break;
      case 'boolean':
        schema = z.boolean();
        break;
    }
  }

  if (!field.required) {
    schema = schema.optional();
  }

  return schema.describe(field.description);
}

export function buildCreateRuleSchema(
  descriptors: readonly PluginDescriptor[],
): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {
    id: z.string().describe('Unique rule identifier'),
    model: z.string().describe('Calculation model name (e.g. FLAT_RATE, PROGRESSIVE_BRACKET)'),
    params: z.record(z.unknown()).describe('Model-specific parameters'),
    priority: z
      .number()
      .int()
      .optional()
      .describe('Rule priority (auto-computed from jurisdiction+scope for fiscal rules)'),
    effectiveFrom: z.string().describe('ISO 8601 date string for when the rule becomes active'),
    effectiveUntil: z
      .string()
      .nullable()
      .optional()
      .describe('ISO 8601 date string for when the rule expires (null = no expiry)'),
    tags: z.array(z.string()).optional().describe('Optional tags for filtering'),
    condition: z
      .object({
        dsl: z.string().describe('DSL identifier (e.g. "jsonlogic")'),
        value: z.unknown().describe('DSL-specific condition expression'),
      })
      .optional()
      .describe('Optional condition expression'),
  };

  for (const descriptor of descriptors) {
    for (const field of descriptor.ruleExtensions) {
      shape[field.name] = buildFieldSchema(field);
    }
  }

  return shape;
}

export function buildValidateExtensionErrors(
  rule: Record<string, unknown>,
  descriptors: readonly PluginDescriptor[],
): string[] {
  const errors: string[] = [];

  for (const descriptor of descriptors) {
    for (const field of descriptor.ruleExtensions) {
      const value = rule[field.name];

      if (field.required && (value === undefined || value === null)) {
        errors.push(`"${field.name}" is required by ${descriptor.name}: ${field.description}`);
        continue;
      }

      if (value === undefined || value === null) continue;

      if (field.enum && !field.enum.includes(String(value))) {
        errors.push(
          `"${field.name}" must be one of: ${field.enum.join(', ')} (got "${String(value)}")`,
        );
      }

      if (field.type === 'string' && typeof value !== 'string') {
        errors.push(`"${field.name}" must be a string`);
      }
      if (field.type === 'number' && typeof value !== 'number') {
        errors.push(`"${field.name}" must be a number`);
      }
      if (field.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`"${field.name}" must be a boolean`);
      }
    }
  }

  return errors;
}
