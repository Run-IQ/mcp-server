import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = resolve(__dirname, 'dist/index.js');
const PLUGIN_NAME = '@run-iq/plugin-fiscal';

console.log('--- Test du Double Chargement MCP ---');
console.log('Plugins-Dir : ../my-plugins');
console.log(`Plugin NPM  : ${PLUGIN_NAME}\n`);

// Lancement du serveur MCP avec les deux options
const server = spawn('node', [
  SERVER_PATH, 
  '--plugins-dir', '../my-plugins', 
  '--plugin', PLUGIN_NAME
], {
  stdio: ['pipe', 'pipe', 'inherit']
});

const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

// Envoi de la requête au serveur via stdin
server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

server.stdout.on('data', (data) => {
  try {
    const rawOutput = data.toString();
    const jsonMatch = rawOutput.match(/\{.*\}/);
    
    if (!jsonMatch) return;
    
    const response = JSON.parse(jsonMatch[0]);
    
    if (response.id === 1 && response.result && response.result.tools) {
      console.log('--- Outils Détectés ---');
      response.result.tools.forEach(tool => console.log(`  - ${tool.name}`));
      
      // On demande les modèles pour voir s'ils sont tous là
      const listModelsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'list_models', arguments: {} }
      };
      server.stdin.write(JSON.stringify(listModelsRequest) + '\n');
    } else if (response.id === 2 && response.result && response.result.content) {
        console.log('\n--- Modèles Trouvés ---');
        const content = response.result.content[0].text;
        console.log(content);
        
        server.kill();
        process.exit(0);
    }
  } catch (err) {
    console.error('Erreur :', err);
    server.kill();
    process.exit(1);
  }
});

setTimeout(() => {
  console.log('\nLe test a expiré après 10 secondes.');
  server.kill();
  process.exit(1);
}, 10000);
