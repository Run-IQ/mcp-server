import { hashParams, computeRuleChecksum } from '@run-iq/core';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerCreateChecksumTool(server: McpServer): void {
  server.tool(
    'create_checksum',
    'Compute SHA-256 checksum for parameters or a full rule object.',
    {
      params: z.record(z.unknown()).optional().describe('Parameters to hash'),
      rule: z.record(z.unknown()).optional().describe('Full rule object to compute checksum for (checksum field is excluded from hash)')
    },
    (args) => {
      let checksum: string;
      if (args.rule) {
        checksum = computeRuleChecksum(args.rule);
      } else if (args.params) {
        checksum = hashParams(args.params);
      } else {
        throw new Error('Either "params" or "rule" must be provided');
      }

      return {
        content: [{ type: 'text', text: JSON.stringify({ checksum }, null, 2) }],
      };
    },
  );
}
