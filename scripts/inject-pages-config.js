/**
 * No CI do GitHub Pages: embute TELFER_CONFIG no HTML
 * (config.js no .gitignore não vai no artefato).
 */
const fs = require('fs');
const path = require('path');

const host = process.env.N8N_HOST || process.env.N8N_WEBHOOK_HOST;
const webhookId = process.env.WEBHOOK_ID || process.env.N8N_WEBHOOK_ID;
const webhookMode = process.env.WEBHOOK_MODE || 'prod';

if (!host || !webhookId) {
  console.error('N8N_HOST e WEBHOOK_ID são obrigatórios no CI.');
  process.exit(1);
}

const cfg = { n8nHost: host, webhookId, webhookMode };
const inline =
  `<script>window.TELFER_CONFIG=${JSON.stringify(cfg)};</script>`;

const root = path.join(__dirname, '..');
const pages = ['index.html', 'analise.html'];

for (const file of pages) {
  const filePath = path.join(root, file);
  let html = fs.readFileSync(filePath, 'utf8');
  const tagExterna = '<script src="js/config.js"></script>';

  if (html.includes(tagExterna)) {
    html = html.replace(tagExterna, inline);
  } else if (!html.includes('window.TELFER_CONFIG')) {
    html = html.replace(
      '<script src="js/index.js"></script>',
      inline + '\n  <script src="js/index.js"></script>'
    );
  }

  fs.writeFileSync(filePath, html, 'utf8');
  console.log('OK:', file);
}
