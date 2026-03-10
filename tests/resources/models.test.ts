import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createEngine } from '../../src/engine.js';
import { registerModelsResource } from '../../src/resources/models.js';
import { readResource } from '../helpers.js';
import { mockBundle } from '../mocks.js';

describe('models://catalog resource', () => {
  it('returns markdown documentation of all models', async () => {
    const { models } = createEngine([mockBundle]);
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { resources: {} } },
    );
    registerModelsResource(server, models);

    const text = await readResource(server, 'models://catalog');

    expect(text).toContain('MOCK_RATE');
    expect(text).toContain('MOCK_DOUBLE');
    expect(text).toContain('# Run-IQ Calculation Models');
  });
});
