# Ferramentas n8n (fora do site)

Estes arquivos **não** entram no front publicado. O site usa apenas:

- `index.html`
- `analise.html`
- `telfer-storage.js`

## Conteúdo

| Arquivo | Uso |
|---------|-----|
| `Relatórios-Destaque-Odonto-UPDATED.json` | Importar workflow no n8n |
| `n8n-processar-dados.js` | Código do nó **Processar Dados** (métricas dinâmicas da Meta) |
| `n8n-lista-objetivos.js` | Código do nó **📤 Montar lista objetivos** |
| `n8n-filtrar-campanhas.js` | Código do nó **Filtrar campanhas (objetivo)** |
| `n8n-montar-claude-body.js` | Código do nó **Montar Claude Body** |
| `n8n-montar-resposta-webhook.js` | Código do nó **Montar Resposta Webhook** |
| `n8n-agregar-ads.js` | Código do nó **⚙️ Agregar ads** + `image_url` / vídeo HD |
| `patch-*.js` | Scripts locais para atualizar o JSON do workflow |

## Preview HD dos criativos

O nó **⚙️ Agregar ads por campanha** já vem com o código de `n8n-agregar-ads.js` dentro de `Relatórios-Destaque-Odonto-UPDATED.json` (basta importar o JSON).

Se editar `n8n-agregar-ads.js`, rode na pasta `ferramentas-n8n`:

```bash
node patch-agregar-ads.js
```

Isso atualiza só esse nó no JSON, sem mudar o resto do workflow.

## GitHub Pages

No deploy, suba da raiz: `index.html`, `analise.html`, `telfer-storage.js`, pasta `css/`, pasta `js/`, e os PNGs de logo.
