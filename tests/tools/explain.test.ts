import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerExplainResultTool } from '../../src/tools/explain.js';
import { callTool } from '../helpers.js';

describe('explain_result tool', () => {
  it('generates a human-readable explanation', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerExplainResultTool(server);

    const result = await callTool(server, 'explain_result', {
      result: {
        value: 180000,
        breakdown: [{ ruleId: 'tva-18', contribution: 180000, modelUsed: 'FLAT_RATE' }],
        appliedRules: [{ id: 'tva-18', model: 'FLAT_RATE', priority: 1000 }],
        skippedRules: [],
        trace: { totalDurationMs: 5 },
      },
    });

    expect(result.explanation).toContain('180000');
    expect(result.explanation).toContain('tva-18');
    expect(result.explanation).toContain('FLAT_RATE');
  });

  it('includes skipped rules in explanation', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerExplainResultTool(server);

    const result = await callTool(server, 'explain_result', {
      result: {
        value: 0,
        breakdown: [],
        appliedRules: [],
        skippedRules: [{ ruleId: 'expired-rule', reason: 'INACTIVE_DATE' }],
      },
    });

    expect(result.explanation).toContain('expired-rule');
    expect(result.explanation).toContain('INACTIVE_DATE');
  });
});
