/**
 * Sincroniza ferramentas-n8n/n8n-agregar-ads.js → nó "⚙️ Agregar ads por campanha"
 * no Relatórios-Destaque-Odonto-UPDATED.json (sem alterar mais nada no workflow).
 *
 * Uso: node patch-agregar-ads.js
 */
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const jsonPath = path.join(dir, 'Relatórios-Destaque-Odonto-UPDATED.json');
const codePath = path.join(dir, 'n8n-agregar-ads.js');
const NODE_NAME = '⚙️ Agregar ads por campanha';

let code = fs.readFileSync(codePath, 'utf8');
code = code.replace(/^\/\*\*[\s\S]*?\*\/\s*\r?\n/, '');

const wf = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const node = wf.nodes.find((n) => n.name === NODE_NAME);
if (!node) {
  console.error('Nó não encontrado:', NODE_NAME);
  process.exit(1);
}

node.parameters.jsCode = code;
fs.writeFileSync(jsonPath, JSON.stringify(wf, null, 2) + '\n', 'utf8');
console.log('OK:', NODE_NAME, 'atualizado em', path.basename(jsonPath));
