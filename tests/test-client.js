import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = resolve(__dirname, 'dist/index.js');
const PLUGIN_NAME = '@run-iq/plugin-fiscal';

console.log('--- Démarrage du Test Client MCP ---');
console.log(`Serveur : ${SERVER_PATH}`);
console.log(`Plugin  : ${PLUGIN_NAME}\n`);

// Lancement du serveur MCP
const server = spawn('node', [SERVER_PATH, '--plugin', PLUGIN_NAME], {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Requête JSON-RPC pour lister les outils (protocole MCP)
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/list',
  params: {}
};

// Envoi de la requête au serveur via stdin
server.stdin.write(JSON.stringify(listToolsRequest) + '\n');

// Lecture de la réponse du serveur via stdout
server.stdout.on('data', (data) => {
  try {
    const rawOutput = data.toString();
    // On cherche le bloc JSON dans la sortie (au cas où il y aurait des logs avant)
    const jsonMatch = rawOutput.match(/\{.*\}/);
    
    if (!jsonMatch) {
      console.log('Sortie brute (pas de JSON trouvé) :', rawOutput);
      return;
    }
    
    const response = JSON.parse(jsonMatch[0]);
    
        if (response.id === 1 && response.result && response.result.tools) {
          console.log('--- Réponse du Serveur (Outils) ---');
          console.log('✅ SUCCÈS ! Outils détectés :');
          response.result.tools.forEach(tool => {
            console.log(`  - ${tool.name}`);
          });
          
          // Test de l'outil list_models pour voir les modèles du plugin
          console.log('\n--- Test de l\'outil list_models ---');
          const listModelsRequest = {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
              name: 'list_models',
              arguments: {}
            }
          };
          server.stdin.write(JSON.stringify(listModelsRequest) + '\n');
        } else if (response.id === 2 && response.result && response.result.content) {
            console.log('✅ Modèles trouvés via list_models :');
            const content = response.result.content[0].text;
            console.log(content);
            
            server.kill();
            process.exit(0);
        }
     else if (response.error) {
      console.error('❌ ERREUR :', response.error);
      server.kill();
      process.exit(1);
    }
  } catch (err) {
    console.error("Erreur lors de l'analyse de la réponse :", err);
    server.kill();
    process.exit(1);
  }
});

server.on('error', (err) => {
  console.error('Impossible de lancer le processus serveur :', err);
});

// Timeout de sécurité
setTimeout(() => {
  console.log('\nLe test a expiré après 10 secondes.');
  server.kill();
  process.exit(1);
}, 10000);
