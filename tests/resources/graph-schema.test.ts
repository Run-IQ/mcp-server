import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGraphSchemaResource } from '../../src/resources/graph-schema.js';
import { readResource } from '../helpers.js';

describe('schema://graph resource', () => {
  it('documents the DGGraph format', async () => {
    const server = new McpServer(
      { name: 'test', version: '0.0.1' },
      { capabilities: { resources: {} } },
    );
    registerGraphSchemaResource(server);

    const text = await readResource(server, 'schema://graph');

    expect(text).toContain('# Decision Graph Schema Reference');
    expect(text).toContain('## DGGraph Structure');
    expect(text).toContain('## DGNode');
    expect(text).toContain('## DGEdge');
    for (const type of ['compute', 'enrich', 'branch', 'guard', 'merge', 'subgraph']) {
      expect(text).toContain(`\`${type}\``);
    }
  });
});
