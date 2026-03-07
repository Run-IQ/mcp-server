import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

export async function callTool(
  server: McpServer,
  toolName: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client({ name: 'test-client', version: '0.0.1' });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  const result = await client.callTool({ name: toolName, arguments: args });

  const textContent = result.content as Array<{ type: string; text: string }>;
  const text = textContent[0]?.text ?? '{}';

  await client.close();
  await server.close();

  return JSON.parse(text) as Record<string, unknown>;
}

export async function readResource(server: McpServer, uri: string): Promise<string> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client({ name: 'test-client', version: '0.0.1' });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  const result = await client.readResource({ uri });

  const text =
    result.contents[0] && 'text' in result.contents[0] ? (result.contents[0].text as string) : '';

  await client.close();
  await server.close();

  return text;
}
