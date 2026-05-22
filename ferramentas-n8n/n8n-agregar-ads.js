/**
 * Nó n8n: ⚙️ Agregar ads por campanha
 * Fonte editável — após mudar, rode: node patch-agregar-ads.js
 * (grava no Relatórios-Destaque-Odonto-UPDATED.json sem alterar o resto do fluxo)
 */
const ctx = $('Filtrar campanhas (objetivo)').first().json ?? {};
const idsFiltradas = ctx.campaign_ids_filtradas || [];
const idSet = new Set(idsFiltradas.map(String));

const rowsSource = $input.first()?.json;
let rows = [];
if (rowsSource && Array.isArray(rowsSource.data)) {
  rows = rowsSource.data;
}

if (idSet.size) {
  rows = rows.filter((r) => {
    const cid = r.campaign_id != null ? String(r.campaign_id) : null;
    return Boolean(cid && idSet.has(cid));
  });
}

function extrairMidiaCreative(creative) {
  if (!creative || typeof creative !== 'object') {
    return { image_url: '', thumbnail_url: '', video_id: null, tipo: 'outro' };
  }

  let image_url = creative.image_url || '';
  let video_id = creative.video_id || null;
  const spec = creative.object_story_spec || {};
  const link = spec.link_data || {};
  const video = spec.video_data || {};

  if (!image_url && link.picture) image_url = link.picture;
  if (!image_url && video.image_url) image_url = video.image_url;
  if (!video_id && video.video_id) video_id = video.video_id;

  let thumbnail_url = creative.thumbnail_url || '';
  if (!thumbnail_url && video.image_url) thumbnail_url = video.image_url;
  if (!thumbnail_url && link.picture) thumbnail_url = link.picture;
  if (!thumbnail_url && image_url) thumbnail_url = image_url;

  const tipo = video_id ? 'video' : image_url || thumbnail_url ? 'imagem' : 'outro';

  return { image_url, thumbnail_url, video_id, tipo };
}

const ads_por_campanha = {};
for (const r of rows) {
  const cid = r.campaign_id != null ? String(r.campaign_id) : null;
  if (!cid) continue;
  if (!ads_por_campanha[cid]) ads_por_campanha[cid] = [];

  const creative = r.creative || {};
  const midia = extrairMidiaCreative(creative);

  ads_por_campanha[cid].push({
    ad_id: String(r.id || ''),
    nome: r.name || creative.name || creative.title || 'Anúncio',
    name: r.name,
    status: r.effective_status || r.status || '',
    thumbnail_url: midia.thumbnail_url,
    image_url: midia.image_url,
    video_id: midia.video_id,
    tipo: midia.tipo,
  });
}

return [{ json: { ads_por_campanha } }];
