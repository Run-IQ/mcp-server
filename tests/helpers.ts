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

export interface ToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export async function callToolRaw(
  server: McpServer,
  toolName: string,
  args: Record<string, unknown>,
): Promise<ToolResult> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client({ name: 'test-client', version: '0.0.1' });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  const result = await client.callTool({ name: toolName, arguments: args });

  await client.close();
  await server.close();

  // justification: MCP SDK returns content as array of {type, text} objects
  return result as unknown as ToolResult;
}

export interface PromptMessage {
  role: string;
  content: { type: string; text: string };
}

export async function getPrompt(
  server: McpServer,
  name: string,
  args: Record<string, string>,
): Promise<{ messages: PromptMessage[] }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client({ name: 'test-client', version: '0.0.1' });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  const result = await client.getPrompt({ name, arguments: args });

  await client.close();
  await server.close();

  // justification: MCP SDK returns messages with role/content shape
  return result as unknown as { messages: PromptMessage[] };
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
