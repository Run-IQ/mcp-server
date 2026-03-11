import { describe, it, expect } from 'vitest';
import { sanitizeMcpInput } from '../../src/utils/sanitizer.js';

describe('sanitizeMcpInput', () => {
  // --- Primitives ---

  it('returns null/undefined unchanged', () => {
    expect(sanitizeMcpInput(null)).toBeNull();
    expect(sanitizeMcpInput(undefined)).toBeUndefined();
  });

  it('returns numbers and booleans unchanged', () => {
    expect(sanitizeMcpInput(42)).toBe(42);
    expect(sanitizeMcpInput(true)).toBe(true);
    expect(sanitizeMcpInput(false)).toBe(false);
  });

  it('preserves legitimate strings', () => {
    expect(sanitizeMcpInput('hello')).toBe('hello');
    expect(sanitizeMcpInput('revenue')).toBe('revenue');
    expect(sanitizeMcpInput('')).toBe('');
  });

  it('unwraps double-escaped strings', () => {
    expect(sanitizeMcpInput('"hello"')).toBe('hello');
    expect(sanitizeMcpInput('"some value"')).toBe('some value');
  });

  it('does not unwrap strings that are not double-escaped', () => {
    expect(sanitizeMcpInput('normal')).toBe('normal');
    expect(sanitizeMcpInput('"x')).toBe('"x'); // only starts with quote
  });

  // --- Arrays ---

  it('recursively sanitizes arrays', () => {
    const input = ['"wrapped"', 'plain', 42];
    const result = sanitizeMcpInput(input);
    expect(result).toEqual(['wrapped', 'plain', 42]);
  });

  it('handles nested arrays', () => {
    const input = [['"a"', '"b"'], ['"c"']];
    const result = sanitizeMcpInput(input);
    expect(result).toEqual([['a', 'b'], ['c']]);
  });

  // --- Objects ---

  it('recursively sanitizes nested objects', () => {
    const input = {
      name: '"John"',
      data: {
        revenue: 100000,
        label: '"test"',
      },
    };

    const result = sanitizeMcpInput(input) as Record<string, unknown>;
    expect(result['name']).toBe('John');
    const data = result['data'] as Record<string, unknown>;
    expect(data['revenue']).toBe(100000);
    expect(data['label']).toBe('test');
  });

  it('sanitizes escaped object keys', () => {
    const input = { '"escaped_key"': 'value' };
    const result = sanitizeMcpInput(input) as Record<string, unknown>;
    expect(result['escaped_key']).toBe('value');
    expect(result['"escaped_key"']).toBeUndefined();
  });

  // --- Prototype pollution blocking ---

  it('blocks __proto__ key', () => {
    // Create a plain object with __proto__ as an own property
    const raw = Object.create(null) as Record<string, unknown>;
    raw['__proto__'] = { malicious: true };
    raw['safe'] = 'ok';

    const result = sanitizeMcpInput(raw) as Record<string, unknown>;
    // The key should not exist as an own property on the result
    expect(Object.hasOwn(result, '__proto__')).toBe(false);
    expect(result['safe']).toBe('ok');
  });

  it('blocks constructor key', () => {
    const raw = Object.create(null) as Record<string, unknown>;
    raw['constructor'] = { prototype: {} };
    raw['name'] = 'test';

    const result = sanitizeMcpInput(raw) as Record<string, unknown>;
    // 'constructor' should not be an own property on the result
    expect(Object.hasOwn(result, 'constructor')).toBe(false);
    expect(result['name']).toBe('test');
  });

  it('blocks prototype key', () => {
    const raw = Object.create(null) as Record<string, unknown>;
    raw['prototype'] = { bad: true };
    raw['ok'] = 'fine';

    const result = sanitizeMcpInput(raw) as Record<string, unknown>;
    expect(Object.hasOwn(result, 'prototype')).toBe(false);
    expect(result['ok']).toBe('fine');
  });

  it('blocks escaped __proto__ key', () => {
    const raw = Object.create(null) as Record<string, unknown>;
    raw['"__proto__"'] = { malicious: true };
    raw['safe'] = 'ok';

    const result = sanitizeMcpInput(raw) as Record<string, unknown>;
    // The key gets unescaped to __proto__ which is then blocked
    expect(Object.hasOwn(result, '__proto__')).toBe(false);
    expect(result['safe']).toBe('ok');
  });

  // --- Deep nesting ---

  it('sanitizes deeply nested structures', () => {
    const input = {
      level1: {
        level2: {
          level3: {
            value: '"deep"',
            items: ['"a"', '"b"'],
          },
        },
      },
    };

    const result = sanitizeMcpInput(input) as Record<string, unknown>;
    const l1 = result['level1'] as Record<string, unknown>;
    const l2 = l1['level2'] as Record<string, unknown>;
    const l3 = l2['level3'] as Record<string, unknown>;
    expect(l3['value']).toBe('deep');
    expect(l3['items']).toEqual(['a', 'b']);
  });

  // --- Mixed array/object structures ---

  it('handles array of objects', () => {
    const input = [
      { id: '"rule-1"', rate: 0.18 },
      { id: '"rule-2"', rate: 0.25 },
    ];

    const result = sanitizeMcpInput(input) as Array<Record<string, unknown>>;
    expect(result[0]!['id']).toBe('rule-1');
    expect(result[1]!['id']).toBe('rule-2');
    expect(result[0]!['rate']).toBe(0.18);
  });
});
