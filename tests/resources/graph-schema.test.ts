import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerGraphSchemaResource } from '../../src/resources/graph-schema.js';
import { readResource } from '../helpers.js';

async function readSchema(): Promise<string> {
  const server = new McpServer(
    { name: 'test', version: '0.0.1' },
    { capabilities: { resources: {} } },
  );
  registerGraphSchemaResource(server);
  return readResource(server, 'schema://graph');
}

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

  it('documents the fields the @run-iq/dg compiler expects', async () => {
    const text = await readSchema();

    // Identifiers (node and edge ids)
    expect(text).toContain('^[a-zA-Z0-9_-]+$');
    // NodePolicy
    expect(text).toContain("onError: 'fail' | 'skip' | 'fallback'");
    expect(text).toContain("onFailPropagation: 'halt' | 'skip-descendants' | 'continue'");
    // MergeNodeConfig
    expect(text).toContain("strategy: 'wait-all' | 'wait-any' | 'wait-quorum'");
    expect(text).toContain('onPartialInputs');
    // EnrichConfig
    for (const field of ['endpoint: string', 'timeoutMs: number', 'onFailure', 'inputMapping']) {
      expect(text).toContain(field);
    }
    // SubGraphConfig
    expect(text).toContain('graphId: string');
  });

  it('does not document fields that @run-iq/dg does not have', async () => {
    const text = await readSchema();

    expect(text).not.toContain('first-wins');
    expect(text).not.toContain('bodyMapping');
    expect(text).not.toContain('onFail?');
    expect(text).not.toContain('defaultValue');
    expect(text).not.toContain('url: string');
  });
});
