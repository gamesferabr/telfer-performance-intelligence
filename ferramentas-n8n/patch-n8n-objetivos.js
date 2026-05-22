const fs = require('fs');
const base = 'c:/Users/ggsdb/OneDrive/Área de Trabalho/New folder (2)';
const p = `${base}/Relatórios-Destaque-Odonto-UPDATED.json`;
const objCode = fs
  .readFileSync(`${base}/n8n-lista-objetivos.js`, 'utf8')
  .replace(/^\/\*[\s\S]*?\*\/\s*/, '');
const w = JSON.parse(fs.readFileSync(p, 'utf8'));

const lista = w.nodes.find((n) => n.name === '📋 Lista Destaque Odonto');
lista.parameters.jsCode = lista.parameters.jsCode.replace(
  'gerar: Boolean(bodyRaw.gerar),',
  'gerar: Boolean(bodyRaw.gerar),\n  listar_objetivos: Boolean(bodyRaw.listar_objetivos),'
);

w.nodes.push(
  {
    parameters: {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'loose',
          version: 2,
        },
        conditions: [
          {
            id: 'listar-obj',
            leftValue:
              "={{ $('📋 Lista Destaque Odonto').first().json.body.listar_objetivos }}",
            rightValue: true,
            operator: { type: 'boolean', operation: 'true' },
          },
        ],
        combinator: 'and',
      },
      options: {},
    },
    id: 'if-listar-obj-0001',
    name: '🔀 Listar só objetivos?',
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: [-1088, 256],
  },
  {
    parameters: { jsCode: objCode },
    id: 'montar-obj-0002',
    name: '📤 Montar lista objetivos',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [-880, 96],
  }
);

w.connections['📂 Meta — Listar campanhas'] = {
  main: [[{ node: '🔀 Listar só objetivos?', type: 'main', index: 0 }]],
};
w.connections['🔀 Listar só objetivos?'] = {
  main: [
    [{ node: '📤 Montar lista objetivos', type: 'main', index: 0 }],
    [{ node: 'Filtrar campanhas (objetivo)', type: 'main', index: 0 }],
  ],
};
w.connections['📤 Montar lista objetivos'] = {
  main: [[{ node: 'Respond to Webhook', type: 'main', index: 0 }]],
};

fs.writeFileSync(p, JSON.stringify(w, null, 2));
console.log('ok');
