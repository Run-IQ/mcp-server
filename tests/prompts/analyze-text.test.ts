import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import { registerAnalyzeTextPrompt } from '../../src/prompts/analyze-text.js';
import { getPrompt } from '../helpers.js';
import { mockBundle } from '../mocks.js';

describe('analyze-text prompt', () => {
  it('returns a user message containing the source text', async () => {
    const { models, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { prompts: {} } },
    );
    registerAnalyzeTextPrompt(server, models, descriptorRegistry);

    const result = await getPrompt(server, 'analyze-text', {
      source_text: 'TVA is 18% on revenue',
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.role).toBe('user');
    expect(result.messages[0]!.content.text).toContain('TVA is 18% on revenue');
  });

  it('includes available calculation models in the prompt', async () => {
    const { models, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { prompts: {} } },
    );
    registerAnalyzeTextPrompt(server, models, descriptorRegistry);

    const result = await getPrompt(server, 'analyze-text', {
      source_text: 'Some regulation text',
    });

    const text = result.messages[0]!.content.text;
    expect(text).toContain('MOCK_RATE');
    expect(text).toContain('MOCK_DOUBLE');
  });

  it('includes plugin extension docs', async () => {
    const { models, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { prompts: {} } },
    );
    registerAnalyzeTextPrompt(server, models, descriptorRegistry);

    const result = await getPrompt(server, 'analyze-text', {
      source_text: 'Some text',
    });

    const text = result.messages[0]!.content.text;
    expect(text).toContain('region');
    expect(text).toContain('sector');
  });

  it('includes country when provided', async () => {
    const { models, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { prompts: {} } },
    );
    registerAnalyzeTextPrompt(server, models, descriptorRegistry);

    const result = await getPrompt(server, 'analyze-text', {
      source_text: 'Some text',
      country: 'TG',
    });

    const text = result.messages[0]!.content.text;
    expect(text).toContain('TG');
  });

  it('includes input field docs from descriptor', async () => {
    const { models, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { prompts: {} } },
    );
    registerAnalyzeTextPrompt(server, models, descriptorRegistry);

    const result = await getPrompt(server, 'analyze-text', {
      source_text: 'Tax regulation',
    });

    const text = result.messages[0]!.content.text;
    expect(text).toContain('revenue');
    expect(text).toContain('expenses');
  });

  it('includes prompt guidelines from descriptor', async () => {
    const { models, descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { prompts: {} } },
    );
    registerAnalyzeTextPrompt(server, models, descriptorRegistry);

    const result = await getPrompt(server, 'analyze-text', {
      source_text: 'Tax text',
    });

    const text = result.messages[0]!.content.text;
    expect(text).toContain('MOCK_RATE for simple percentage');
  });
});
