
/**
 * Recursively cleans strings in an object, removing double escaping 
 * (e.g. '"value"' -> 'value') often caused by some MCP clients.
 */
export function sanitizeMcpInput(obj: any): any {
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
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Also sanitize keys if they are escaped
      const cleanKey = key.startsWith('"') && key.endsWith('"') ? key.slice(1, -1) : key;
      sanitized[cleanKey] = sanitizeMcpInput(value);
    }
    return sanitized;
  }

  return obj;
}
