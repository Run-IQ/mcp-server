import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerCreateChecksumTool(server: McpServer): void {
  server.tool(
    'create_checksum',
    'Compute the SHA-256 checksum of a params object. Used to generate the checksum field for Run-IQ rules.',
    { params: z.record(z.unknown()).describe('The params object to hash') },
    (args) => {
      const checksum = createHash('sha256').update(JSON.stringify(args.params)).digest('hex');

      return {
        content: [{ type: 'text', text: JSON.stringify({ checksum }, null, 2) }],
      };
    },
  );
}
