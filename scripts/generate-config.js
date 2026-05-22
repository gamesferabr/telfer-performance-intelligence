/**
 * Gera js/config.js a partir do .env (não versionar .env nem config.js).
 * Uso: node scripts/generate-config.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');
const outConfig = path.join(root, 'js', 'config.js');
const outRuntime = path.join(root, 'js', 'runtime-config.js');

if (!fs.existsSync(envPath)) {
  console.error('Crie o arquivo .env na raiz (veja .env.example).');
  process.exit(1);
}

const env = {};
for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
}

const n8nHost = env.N8N_HOST || env.N8N_WEBHOOK_HOST;
const webhookId = env.WEBHOOK_ID || env.N8N_WEBHOOK_ID;
const webhookModeLocal = env.WEBHOOK_MODE || env.N8N_WEBHOOK_MODE || 'test';
const fetchTimeoutMs = Number(env.FETCH_TIMEOUT_MS || 900000);

if (!n8nHost || !webhookId) {
  console.error('.env precisa de N8N_HOST e WEBHOOK_ID');
  process.exit(1);
}

const payloadLocal = { n8nHost, webhookId, webhookMode: webhookModeLocal, fetchTimeoutMs };
const payloadPages = { n8nHost, webhookId, webhookMode: 'prod', fetchTimeoutMs };

const mk = (comment, payload) =>
  `/** ${comment} */\nwindow.TELFER_CONFIG = ${JSON.stringify(payload, null, 2)};\n`;

fs.writeFileSync(outConfig, mk('Gerado — uso local (sobrescreve runtime-config se existir)', payloadLocal), 'utf8');
fs.writeFileSync(outRuntime, mk('Gerado — GitHub Pages / produção', payloadPages), 'utf8');
console.log('OK:', outConfig);
console.log('OK:', outRuntime);
