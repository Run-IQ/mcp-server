import { hashParams } from '@run-iq/core';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerCreateChecksumTool(server: McpServer): void {
  server.tool(
    'create_checksum',
    'Compute the SHA-256 checksum of a params object. Used to generate the checksum field for Run-IQ rules.',
    { params: z.record(z.unknown()).describe('The params object to hash') },
    (args) => {
      const checksum = hashParams(args.params);

      return {
        content: [{ type: 'text', text: JSON.stringify({ checksum }, null, 2) }],
      };
    },
  );
}
