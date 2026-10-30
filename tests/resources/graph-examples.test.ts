import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { DGGraph } from '@run-iq/dg';
import { registerGraphExamplesResource } from '../../src/resources/graph-examples.js';
import { readResource } from '../helpers.js';

async function readExamples(): Promise<string> {
  const server = new McpServer(
    { name: 'test', version: '0.0.1' },
    { capabilities: { resources: {} } },
  );
  registerGraphExamplesResource(server);
  return readResource(server, 'graph://examples');
}

function extractGraphs(text: string): DGGraph[] {
  const blocks = [...text.matchAll(/```json\n([\s\S]*?)\n```/g)];
  return blocks.map((m) => JSON.parse(m[1]!) as DGGraph);
}

describe('graph://examples resource', () => {
  it('lists the example graphs as JSON blocks', async () => {
    const text = await readExamples();

    expect(text).toContain('# Decision Graph Examples');
    expect(text).toContain('## Simple Linear (2 compute nodes)');
    expect(text).toContain('## Multi-Tax Bilan with Enrich + Merge');
    expect(extractGraphs(text)).toHaveLength(3);
  });
});
