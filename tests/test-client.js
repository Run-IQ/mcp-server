import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = resolve(__dirname, 'dist/index.js');

console.log('--- MCP Server Test ---');
console.log('Plugins-Dir : ../my-plugins\n');

// Launch MCP server with plugins-dir only (no hardcoded plugin)
const server = spawn('node', [
  SERVER_PATH,
  '--plugins-dir', '../my-plugins',
], {
  stdio: ['pipe', 'pipe', 'inherit']
});

const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

// Send request to server via stdin
server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

server.stdout.on('data', (data) => {
  try {
    const rawOutput = data.toString();
    const jsonMatch = rawOutput.match(/\{.*\}/);

    if (!jsonMatch) return;

    const response = JSON.parse(jsonMatch[0]);

    if (response.id === 1 && response.result && response.result.tools) {
      console.log('--- Tools Detected ---');
      response.result.tools.forEach(tool => console.log(`  - ${tool.name}`));

      // Ask for models to see if they are all there
      const listModelsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'list_models', arguments: {} }
      };
      server.stdin.write(JSON.stringify(listModelsRequest) + '\n');
    } else if (response.id === 2 && response.result && response.result.content) {
        console.log('\n--- Models Found ---');
        const content = response.result.content[0].text;
        console.log(content);

        server.kill();
        process.exit(0);
    }
  } catch (err) {
    console.error('Error:', err);
    server.kill();
    process.exit(1);
  }
});

setTimeout(() => {
  console.log('\nTest timed out after 10 seconds.');
  server.kill();
  process.exit(1);
}, 10000);
