const fs = require('fs');
const base = 'c:/Users/ggsdb/OneDrive/Área de Trabalho/New folder (2)';
const p = `${base}/Relatórios-Destaque-Odonto-UPDATED.json`;
const w = JSON.parse(fs.readFileSync(p, 'utf8'));

const objCode = fs
  .readFileSync(`${base}/n8n-lista-objetivos.js`, 'utf8')
  .replace(/^\/\*[\s\S]*?\*\/\s*/, '');
const filtrarCode = fs
  .readFileSync(`${base}/n8n-filtrar-campanhas.js`, 'utf8')
  .replace(/^\/\*[\s\S]*?\*\/\s*/, '');

const meta = w.nodes.find((n) => n.name === '📂 Meta — Listar campanhas');
const params = meta.parameters.queryParameters.parameters;
const fields = params.find((x) => x.name === 'fields');
if (fields) fields.value = 'id,name,objective,status,effective_status';

const hasFilter = params.some((x) => x.name === 'filtering');
if (!hasFilter) {
  params.push({
    name: 'filtering',
    value:
      "={{ JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]) }}",
  });
} else {
  const f = params.find((x) => x.name === 'filtering');
  f.value =
    "={{ JSON.stringify([{ field: 'effective_status', operator: 'IN', value: ['ACTIVE'] }]) }}";
}

const objNode = w.nodes.find((n) => n.name === '📤 Montar lista objetivos');
if (objNode) objNode.parameters.jsCode = objCode;
w.nodes.find((n) => n.name === 'Filtrar campanhas (objetivo)').parameters.jsCode = filtrarCode;

fs.writeFileSync(p, JSON.stringify(w, null, 2));
console.log('ok — sem LABELS, só ACTIVE');
