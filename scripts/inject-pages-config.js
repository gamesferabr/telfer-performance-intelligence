/**
 * CI GitHub Pages: grava js/runtime-config.js e embute fallback inline no HTML.
 */
const fs = require('fs');
const path = require('path');

const host = process.env.N8N_HOST || process.env.N8N_WEBHOOK_HOST;
const webhookId = process.env.WEBHOOK_ID || process.env.N8N_WEBHOOK_ID;

if (!host || !webhookId) {
  console.error('N8N_HOST e WEBHOOK_ID são obrigatórios no CI.');
  process.exit(1);
}

const fetchTimeoutMs = Number(process.env.FETCH_TIMEOUT_MS || 900000);
const cfg = { n8nHost: host, webhookId, webhookMode: 'prod', fetchTimeoutMs };
const inline = `<script>window.TELFER_CONFIG=${JSON.stringify(cfg)};</script>`;
const runtimeJs =
  '/** Gerado no CI — GitHub Pages */\n' +
  `window.TELFER_CONFIG = ${JSON.stringify(cfg, null, 2)};\n`;

const root = path.join(__dirname, '..');
fs.writeFileSync(path.join(root, 'js', 'runtime-config.js'), runtimeJs, 'utf8');

const pages = ['index.html', 'analise.html'];
const tagRuntime = '<script src="js/runtime-config.js"></script>';
const tagConfig = '<script src="js/config.js"></script>';

for (const file of pages) {
  const filePath = path.join(root, file);
  let html = fs.readFileSync(filePath, 'utf8');

  if (html.includes(tagConfig)) {
    html = html.replace(tagConfig, '');
  }

  if (html.includes(tagRuntime)) {
    html = html.replace(tagRuntime, inline + '\n  ' + tagRuntime);
  } else if (!html.includes('window.TELFER_CONFIG')) {
    html = html.replace(
      '<script src="js/index.js"></script>',
      inline + '\n  <script src="js/index.js"></script>'
    );
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('OK:', file);
}
