import { describe, it, expect } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { hashParams } from '@run-iq/core';
import { registerCreateChecksumTool } from '../../src/tools/create-checksum.js';
import { callTool } from '../helpers.js';

describe('create_checksum tool', () => {
  it('computes SHA-256 of params', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerCreateChecksumTool(server);

    const params = { rate: 0.18, base: 'revenue' };
    const result = await callTool(server, 'create_checksum', { params });
    const expected = hashParams(params);

    expect(result.checksum).toBe(expected);
  });

  it('produces different checksums for different params', async () => {
    const server = new McpServer({ name: 'test', version: '0.0.1' });
    registerCreateChecksumTool(server);

    const r1 = await callTool(server, 'create_checksum', {
      params: { rate: 0.18 },
    });
    const r2 = await callTool(server, 'create_checksum', {
      params: { rate: 0.2 },
    });

    expect(r1.checksum).not.toBe(r2.checksum);
  });
});
