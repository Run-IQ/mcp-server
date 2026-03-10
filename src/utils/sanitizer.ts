
/** Keys that must be blocked to prevent prototype pollution attacks. */
const BLOCKED_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively cleans strings in an object, removing double escaping
 * (e.g. '"value"' -> 'value') often caused by some MCP clients.
 * Also blocks prototype-pollution keys.
 */
export function sanitizeMcpInput(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    // If string is wrapped in escaped quotes, unwrap it
    if (obj.startsWith('"') && obj.endsWith('"') && obj.length >= 2) {
      return obj.slice(1, -1);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeMcpInput);
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Block prototype pollution keys
      if (BLOCKED_KEYS.has(key)) continue;

      // Also sanitize keys if they are escaped
      const cleanKey = key.startsWith('"') && key.endsWith('"') ? key.slice(1, -1) : key;

      // Block cleaned keys as well
      if (BLOCKED_KEYS.has(cleanKey)) continue;

      sanitized[cleanKey] = sanitizeMcpInput(value);
    }
    return sanitized;
  }

  return obj;
}
