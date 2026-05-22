const emb = $('🔗 Mesclar métricas + criativos').all().map((i) => i.json);
const resClaude = $input.first()?.json ?? {};

function textoClaude(res) {
  if (typeof res?.text === 'string' && res.text.trim()) return res.text.trim();
  const chunks = res?.content ?? res?.body?.content;
  if (!Array.isArray(chunks)) return '';
  return chunks.map((x) => (x?.type === 'text' ? (x?.text ?? '') : '')).join('').trim();
}

function limparMarkdown(raw) {
  let s = String(raw || '').trim();
  const m = s.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
  if (m) s = m[1].trim();
  return s.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
}

function repararJsonTruncado(s) {
  let t = s.trim().replace(/,\s*$/, '');
  const ob = (t.match(/{/g) || []).length - (t.match(/}/g) || []).length;
  const ol = (t.match(/\[/g) || []).length - (t.match(/]/g) || []).length;
  for (let i = 0; i < ol; i++) t += ']';
  for (let i = 0; i < ob; i++) t += '}';
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

function tentarParse(raw) {
  const cleaned = limparMarkdown(raw);
  if (!cleaned) return null;
  try {
    return JSON.parse(cleaned);
  } catch {}
  const start = cleaned.indexOf('{');
  if (start < 0) return null;
  const slice = cleaned.slice(start);
  try {
    return JSON.parse(slice);
  } catch {
    return repararJsonTruncado(slice);
  }
}

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function valorMetrica(c, nome) {
  const m = (c.metricas || []).find((x) => x.nome === nome);
  return m ? n(m.valor) : n(c[nome]) || 0;
}

function scoreHeuristic(row) {
  let score = 42;
  const ctr = valorMetrica(row, 'CTR') || n(row.ctr);
  const mensagens = valorMetrica(row, 'Conversas no WhatsApp') || n(row.mensagens);
  const leads = valorMetrica(row, 'Leads') || n(row.leads);
  if (ctr >= 2) score += 18;
  else if (ctr >= 1) score += 8;
  if (mensagens >= 80) score += 20;
  else if (mensagens >= 30) score += 12;
  if (leads >= 8) score += 20;
  else if (leads >= 3) score += 10;
  return Math.min(100, score);
}

function statusLabel(score) {
  if (score >= 80) return 'Excelente';
  if (score >= 60) return 'Boa';
  if (score >= 40) return 'Atenção';
  return 'Crítica';
}

function agregarMetricasResumo(campanhas) {
  const map = new Map();
  for (const c of campanhas) {
    for (const m of c.metricas || []) {
      if (!m?.nome) continue;
      const fmt = m.formato || 'numero';
      if (fmt === 'percentual' || fmt === 'decimal') continue;
      if (!map.has(m.nome)) {
        map.set(m.nome, { nome: m.nome, valor: 0, formato: fmt, origem: m.origem });
      }
      map.get(m.nome).valor += n(m.valor);
    }
  }
  return [...map.values()].map((m) => ({
    ...m,
    valor: m.formato === 'moeda' ? Number(m.valor.toFixed(2)) : Math.round(m.valor * 100) / 100,
  }));
}

function campanhaFromEmb(row) {
  const metricas = Array.isArray(row.metricas) ? row.metricas : [];
  const score = scoreHeuristic(row);
  return {
    nome: row.nome || row.campanha || 'Campanha',
    objetivo: row.objetivo ?? null,
    metricas,
    spend: valorMetrica(row, 'Valor investido') || n(row.spend),
    ctr: valorMetrica(row, 'CTR') || n(row.ctr),
    cpm: valorMetrica(row, 'CPM') || n(row.cpm),
    leads: valorMetrica(row, 'Leads') || n(row.leads),
    mensagens: valorMetrica(row, 'Conversas no WhatsApp') || n(row.mensagens),
    frequencia: valorMetrica(row, 'Frequência') || n(row.frequencia),
    score,
    status: statusLabel(score),
    pontos_fortes: [],
    pontos_fracos: [],
    recomendacoes: [],
    criativos: Array.isArray(row.criativos) ? row.criativos : [],
  };
}

function buildKpis(campanhas) {
  const metricas_resumo = agregarMetricasResumo(campanhas);
  let melhor_campanha = '—';
  let best = -1;
  for (const c of campanhas) {
    const spend = valorMetrica(c, 'Valor investido');
    const v = spend;
    if (v > best) {
      best = v;
      melhor_campanha = c.nome;
    }
  }
  const investimento = metricas_resumo.find((m) => m.nome === 'Valor investido')?.valor ?? 0;
  return {
    metricas_resumo,
    melhor_campanha,
    investimento_total: investimento,
    leads_totais: metricas_resumo.find((m) => m.nome === 'Leads')?.valor ?? 0,
    mensagens_totais: metricas_resumo.find((m) => m.nome === 'Conversas no WhatsApp')?.valor ?? 0,
  };
}

function buildFromEmb(msg) {
  const campanhas = emb.map(campanhaFromEmb);
  return {
    kpis: buildKpis(campanhas),
    campanhas,
    insights_gerais: [msg],
    acoes_recomendadas: ['Revise o retorno do Claude ou aumente max_tokens.'],
    _parse_fallback: true,
  };
}

const porNome = {};
for (const row of emb) {
  if (row.campanha) porNome[String(row.campanha)] = row;
  if (row.nome) porNome[String(row.nome)] = row;
}

function garantirExtras(c, embRow) {
  const enriched = embRow || porNome[String(c.nome ?? '')] || null;
  const metricasEmb = enriched?.metricas || [];
  const metricasClaude = Array.isArray(c.metricas) ? c.metricas : [];
  const metricas =
    metricasEmb.length >= metricasClaude.length ? metricasEmb : metricasClaude.length ? metricasClaude : metricasEmb;

  const merged = { ...enriched, ...c, metricas };
  const score = c.score ?? scoreHeuristic(merged);

  return {
    ...c,
    nome: c.nome || enriched?.nome || enriched?.campanha || 'Campanha',
    objetivo: c.objetivo ?? enriched?.objetivo ?? null,
    metricas,
    score,
    status: c.status || statusLabel(score),
    criativos: mesclarCriativos(enriched?.criativos, c.criativos),
  };
}

function mesclarCriativos(embList, claudeList) {
  const fromEmb = Array.isArray(embList) ? embList : [];
  const fromClaude = Array.isArray(claudeList) ? claudeList : [];
  if (!fromEmb.length) return fromClaude;
  if (!fromClaude.length) return fromEmb;

  const porId = new Map(fromEmb.map((x) => [String(x.ad_id || ''), x]));
  return fromClaude.map((cc) => {
    const base = porId.get(String(cc.ad_id || '')) || {};
    return {
      ...base,
      ...cc,
      nome: cc.nome || base.nome,
      image_url: cc.image_url || base.image_url || '',
      thumbnail_url: cc.thumbnail_url || base.thumbnail_url || '',
      video_id: cc.video_id || base.video_id || null,
      tipo: cc.tipo || base.tipo,
    };
  });
}

function mergeClaudeCampanha(claudeC) {
  const embRow = porNome[String(claudeC.nome ?? '')] || null;
  const base = embRow ? campanhaFromEmb(embRow) : { metricas: [] };
  return garantirExtras({ ...base, ...claudeC }, embRow);
}

const rawText = textoClaude(resClaude);
const stopReason = resClaude.stop_reason ?? null;
const parsed = tentarParse(rawText);
const embCampanhas = emb.map(campanhaFromEmb);

let saida;

if (parsed?.kpis && Array.isArray(parsed.campanhas)) {
  saida = parsed;
  if (stopReason === 'max_tokens') {
    saida._claude_truncated = true;
    saida.insights_gerais = Array.isArray(saida.insights_gerais) ? saida.insights_gerais : [];
    saida.insights_gerais.unshift(
      'Resposta do Claude cortada. Métricas preservadas da Meta.'
    );
  }
} else if (parsed?.campanhas?.length) {
  const merged = parsed.campanhas.map(mergeClaudeCampanha);
  for (const ec of embCampanhas) {
    if (!merged.some((m) => String(m.nome) === String(ec.nome))) merged.push(ec);
  }
  saida = {
    kpis: parsed.kpis?.metricas_resumo ? parsed.kpis : buildKpis(merged),
    campanhas: merged,
    insights_gerais: parsed.insights_gerais || [],
    acoes_recomendadas: parsed.acoes_recomendadas || [],
    _claude_truncated: stopReason === 'max_tokens',
    _parse_partial: true,
  };
} else {
  saida = buildFromEmb(
    stopReason === 'max_tokens'
      ? 'Claude cortou o JSON. Dashboard montado só com métricas da Meta.'
      : 'JSON do Claude inválido. Dashboard montado só com métricas da Meta.'
  );
  const partial = tentarParse(rawText);
  if (partial?.campanhas?.length) {
    saida.campanhas = partial.campanhas.map(mergeClaudeCampanha);
    for (const ec of embCampanhas) {
      if (!saida.campanhas.some((m) => String(m.nome) === String(ec.nome))) saida.campanhas.push(ec);
    }
  }
}

if (!saida.kpis) saida.kpis = buildKpis(saida.campanhas || embCampanhas);
if (!saida.kpis.metricas_resumo?.length) {
  saida.kpis = { ...saida.kpis, ...buildKpis(saida.campanhas || embCampanhas) };
}
if (!Array.isArray(saida.campanhas) || !saida.campanhas.length) {
  saida.campanhas = embCampanhas;
  saida.kpis = buildKpis(saida.campanhas);
}

saida.campanhas = saida.campanhas.map((c) => mergeClaudeCampanha(c));
if (!Array.isArray(saida.insights_gerais)) saida.insights_gerais = [];
if (!Array.isArray(saida.acoes_recomendadas)) saida.acoes_recomendadas = [];

return [{ json: saida }];
