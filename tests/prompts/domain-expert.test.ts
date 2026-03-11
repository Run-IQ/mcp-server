import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import { registerDomainExpertPrompt } from '../../src/prompts/domain-expert.js';
import { getPrompt } from '../helpers.js';
import { mockBundle } from '../mocks.js';

describe('domain-expert prompt', () => {
  it('returns a user message containing the question', async () => {
    const { descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { prompts: {} } },
    );
    registerDomainExpertPrompt(server, descriptorRegistry);

    const result = await getPrompt(server, 'domain-expert', {
      question: 'How is TVA calculated in Togo?',
    });

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.role).toBe('user');
    expect(result.messages[0]!.content.text).toContain('How is TVA calculated in Togo?');
  });

  it('includes loaded plugin information', async () => {
    const { descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { prompts: {} } },
    );
    registerDomainExpertPrompt(server, descriptorRegistry);

    const result = await getPrompt(server, 'domain-expert', {
      question: 'Some question',
    });

    const text = result.messages[0]!.content.text;
    expect(text).toContain('mock-plugin');
    expect(text).toContain('Mock plugin for testing');
  });

  it('includes domain-specific guidelines', async () => {
    const { descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { prompts: {} } },
    );
    registerDomainExpertPrompt(server, descriptorRegistry);

    const result = await getPrompt(server, 'domain-expert', {
      question: 'Any question',
    });

    const text = result.messages[0]!.content.text;
    expect(text).toContain('MOCK_RATE for simple percentage');
  });

  it('includes tool and resource references', async () => {
    const { descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { prompts: {} } },
    );
    registerDomainExpertPrompt(server, descriptorRegistry);

    const result = await getPrompt(server, 'domain-expert', {
      question: 'Help me',
    });

    const text = result.messages[0]!.content.text;
    expect(text).toContain('evaluate');
    expect(text).toContain('simulate');
    expect(text).toContain('schema://rules');
    expect(text).toContain('plugins://loaded');
  });

  it('uses the domain label from descriptors', async () => {
    const { descriptorRegistry } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { prompts: {} } },
    );
    registerDomainExpertPrompt(server, descriptorRegistry);

    const result = await getPrompt(server, 'domain-expert', {
      question: 'Any',
    });

    const text = result.messages[0]!.content.text;
    // mockDescriptor domainLabel is 'mock'
    expect(text).toContain('mock');
  });
});
