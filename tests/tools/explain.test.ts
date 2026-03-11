import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerExplainResultTool } from '../../src/tools/explain.js';
import { callToolRaw } from '../helpers.js';

describe('explain_result tool', () => {
  it('generates a human-readable markdown explanation', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerExplainResultTool(server);

    const result = await callToolRaw(server, 'explain_result', {
      result: {
        value: 180000,
        breakdown: [{ ruleId: 'tva-18', contribution: 180000, modelUsed: 'FLAT_RATE' }],
        appliedRules: [{ id: 'tva-18', model: 'FLAT_RATE', priority: 1000 }],
        skippedRules: [],
        trace: { totalDurationMs: 5 },
      },
    });

    const text = result.content[0]?.text ?? '';
    expect(text).toContain('180000');
    expect(text).toContain('tva-18');
    expect(text).toContain('FLAT_RATE');
    // Should be raw markdown, not JSON-wrapped
    expect(text.startsWith('#')).toBe(true);
  });

  it('includes skipped rules in explanation', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerExplainResultTool(server);

    const result = await callToolRaw(server, 'explain_result', {
      result: {
        value: 0,
        breakdown: [],
        appliedRules: [],
        skippedRules: [{ ruleId: 'expired-rule', reason: 'INACTIVE_DATE' }],
      },
    });

    const text = result.content[0]?.text ?? '';
    expect(text).toContain('expired-rule');
    expect(text).toContain('INACTIVE_DATE');
  });
});
