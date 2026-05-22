const fs = require('fs');
const base = 'c:/Users/ggsdb/OneDrive/Área de Trabalho/New folder (2)';
const p = `${base}/Relatórios-Destaque-Odonto-UPDATED.json`;
const code = fs.readFileSync(`${base}/n8n-montar-claude-body.js`, 'utf8');
const w = JSON.parse(fs.readFileSync(p, 'utf8'));
const n = w.nodes.find((x) => x.name === 'Montar Claude Body');
n.parameters.jsCode = code;
fs.writeFileSync(p, JSON.stringify(w, null, 2));
try {
  new Function(code);
  console.log('ok — sintaxe válida');
} catch (e) {
  console.error('ERRO:', e.message);
  process.exit(1);
}
