import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import { registerOrchestrationArchitectPrompt } from '../../src/prompts/orchestration-architect.js';
import { getPrompt } from '../helpers.js';
import { mockBundle } from '../mocks.js';

function makeServer(): McpServer {
  const { models, descriptorRegistry, dsls } = createEngine([mockBundle]);
  const server = new McpServer(
    { name: 'test', version: '0.0.1' },
    { capabilities: { prompts: {} } },
  );
  registerOrchestrationArchitectPrompt(server, models, descriptorRegistry, dsls);
  return server;
}

describe('orchestration-architect prompt', () => {
  it('returns a user message with the requirement and loaded models', async () => {
    const result = await getPrompt(makeServer(), 'orchestration-architect', {
      requirement: 'Compute a surcharge on top of a base amount',
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.role).toBe('user');
    const text = result.messages[0]!.content.text;
    expect(text).toContain('Compute a surcharge on top of a base amount');
    expect(text).toContain('`MOCK_RATE`');
    expect(text).toContain('`MOCK_DOUBLE`');
    expect(text).toContain('`mock-dsl` (v1.0.0)');
    expect(text).not.toContain('Target Country');
  });

  it('references the graph tools and resources', async () => {
    const result = await getPrompt(makeServer(), 'orchestration-architect', {
      requirement: 'Any',
    });

    const text = result.messages[0]!.content.text;
    for (const name of [
      'design_graph',
      'validate_graph',
      'compile_graph',
      'inspect_graph',
      'execute_graph',
      'inspect_context',
      'explain_graph_result',
      'simulate_graph',
      'schema://graph',
      'graph://examples',
    ]) {
      expect(text).toContain(name);
    }
  });

  it('includes the target country when given', async () => {
    const result = await getPrompt(makeServer(), 'orchestration-architect', {
      requirement: 'Any',
      country: 'TG',
    });

    expect(result.messages[0]!.content.text).toContain('## Target Country: TG');
  });
});
