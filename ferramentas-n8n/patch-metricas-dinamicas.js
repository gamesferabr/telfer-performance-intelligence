const fs = require('fs');
const base = 'c:/Users/ggsdb/OneDrive/Área de Trabalho/New folder (2)/ferramentas-n8n';
const p = `${base}/Relatórios-Destaque-Odonto-UPDATED.json`;
const w = JSON.parse(fs.readFileSync(p, 'utf8'));

function readCode(name) {
  const file = `${base}/${name}`;
  return fs.readFileSync(file, 'utf8').replace(/^\/\*[\s\S]*?\*\/\s*/, '');
}

const nodes = {
  'Processar Dados': 'n8n-processar-dados.js',
  'Montar Claude Body': 'n8n-montar-claude-body.js',
  'Montar Resposta Webhook': 'n8n-montar-resposta-webhook.js',
};

for (const [nodeName, file] of Object.entries(nodes)) {
  const n = w.nodes.find((x) => x.name === nodeName);
  if (!n) throw new Error(`Nó não encontrado: ${nodeName}`);
  n.parameters.jsCode = readCode(file);
  new Function(n.parameters.jsCode);
  console.log('ok:', nodeName);
}

const insights = w.nodes.find((x) => x.name === '📊 Meta — Insights');
const fields =
  'campaign_id,campaign_name,spend,reach,impressions,clicks,inline_link_clicks,cpm,ctr,frequency,actions,action_values,cost_per_action_type';
if (insights) {
  const f = insights.parameters.queryParameters.parameters.find((x) => x.name === 'fields');
  if (f) f.value = fields;
}

fs.writeFileSync(p, JSON.stringify(w, null, 2));
console.log('workflow atualizado');
