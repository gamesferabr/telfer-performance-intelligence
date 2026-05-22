/**
 * Nó: Processar Dados
 * Monta metricas[] dinamicamente a partir do que a Meta devolve (sem lista fixa de KPIs).
 */
const rawItems = $input.all();

const insights = rawItems.flatMap((item) => {
  const json = item.json;
  if (Array.isArray(json.data)) return json.data;
  if (json.insights?.data) return json.insights.data;
  return [json];
});

/** Rótulos legíveis para action_type da Meta (só tradução; métrica só entra se vier na API) */
function rotuloAcao(actionType) {
  const t = String(actionType || '');
  const mapa = {
    link_click: 'Cliques nos Anúncios',
    inline_link_click: 'Cliques nos Anúncios',
    outbound_click: 'Cliques de saída',
    landing_page_view: 'Visitas do Site',
    omni_landing_page_view: 'Visitas do Site',
    purchase: 'Vendas',
    'offsite_conversion.fb_pixel_purchase': 'Vendas',
    'onsite_conversion.purchase': 'Vendas',
    lead: 'Leads',
    'onsite_conversion.lead_grouped': 'Leads',
    follow: 'Novos Seguidores',
    'onsite_conversion.follow': 'Novos Seguidores',
    page_engagement: 'Engajamento na página',
    post_engagement: 'Engajamento em publicações',
    video_view: 'Visualizações de vídeo',
    'onsite_conversion.messaging_conversation_started_7d': 'Conversas no WhatsApp',
    messaging_conversation_started_7d: 'Conversas no WhatsApp',
    instagram_profile_engagement: 'Visitas ao Instagram',
    profile_visits: 'Visitas ao Instagram',
    like: 'Curtidas',
    comment: 'Comentários',
    share: 'Compartilhamentos',
    add_to_cart: 'Adições ao carrinho',
    initiate_checkout: 'Checkout iniciado',
    complete_registration: 'Cadastros completos',
  };
  if (mapa[t]) return mapa[t];
  return t
    .replace(/^offsite_conversion\./, '')
    .replace(/^onsite_conversion\./, '')
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function addMetrica(lista, vistos, item) {
  const nome = String(item.nome || '').trim();
  if (!nome) return;
  const chave = `${nome}|${item.formato || ''}`;
  if (vistos.has(chave)) return;
  vistos.add(chave);
  lista.push(item);
}

function metricasDaInsight(ins) {
  const metricas = [];
  const vistos = new Set();

  const spend = parseFloat(ins.spend || 0);
  const reach = parseInt(ins.reach || 0, 10);
  const impressions = parseInt(ins.impressions || 0, 10);
  const frequency = parseFloat(ins.frequency || 0);

  if (spend > 0) {
    addMetrica(metricas, vistos, {
      nome: 'Valor investido',
      valor: Number(spend.toFixed(2)),
      formato: 'moeda',
      origem: 'spend',
    });
  }
  if (reach > 0) {
    addMetrica(metricas, vistos, {
      nome: 'Pessoas Alcançadas',
      valor: reach,
      formato: 'numero',
      origem: 'reach',
    });
  }
  if (impressions > 0) {
    addMetrica(metricas, vistos, {
      nome: 'Impressões',
      valor: impressions,
      formato: 'numero',
      origem: 'impressions',
    });
  }
  if (frequency > 0) {
    addMetrica(metricas, vistos, {
      nome: 'Frequência',
      valor: Number(frequency.toFixed(2)),
      formato: 'decimal',
      origem: 'frequency',
    });
  }

  let clicks = 0;
  if (ins.inline_link_clicks != null && ins.inline_link_clicks !== '') {
    clicks = parseFloat(ins.inline_link_clicks);
  } else if (ins.clicks != null && ins.clicks !== '') {
    clicks = parseFloat(ins.clicks);
  }
  if (clicks > 0) {
    addMetrica(metricas, vistos, {
      nome: 'Cliques nos Anúncios',
      valor: clicks,
      formato: 'numero',
      origem: 'clicks',
    });
  }

  if (impressions > 0 && spend > 0) {
    addMetrica(metricas, vistos, {
      nome: 'CPM',
      valor: Number(((spend / impressions) * 1000).toFixed(2)),
      formato: 'moeda',
      origem: 'cpm_calc',
    });
  }
  if (impressions > 0 && clicks > 0) {
    addMetrica(metricas, vistos, {
      nome: 'CTR',
      valor: Number(((clicks / impressions) * 100).toFixed(2)),
      formato: 'percentual',
      origem: 'ctr_calc',
    });
  }

  const acoes = Array.isArray(ins.actions) ? ins.actions : [];
  for (const a of acoes) {
    const v = parseFloat(a.value || 0);
    if (v <= 0) continue;
    const tipo = a.action_type;
    if (['reach', 'impressions', 'spend'].includes(tipo)) continue;
    addMetrica(metricas, vistos, {
      nome: rotuloAcao(tipo),
      valor: v,
      formato: 'numero',
      origem: tipo,
    });
  }

  const custos = Array.isArray(ins.cost_per_action_type) ? ins.cost_per_action_type : [];
  for (const c of custos) {
    const v = parseFloat(c.value || 0);
    if (v <= 0) continue;
    const base = rotuloAcao(c.action_type);
    addMetrica(metricas, vistos, {
      nome: `Custo por ${base}`,
      valor: Number(v.toFixed(2)),
      formato: 'moeda',
      origem: `cost_${c.action_type}`,
    });
  }

  const valores = Array.isArray(ins.action_values) ? ins.action_values : [];
  for (const av of valores) {
    const v = parseFloat(av.value || 0);
    if (v <= 0) continue;
    const tipo = String(av.action_type || '');
    if (tipo.includes('purchase') || tipo === 'purchase') {
      addMetrica(metricas, vistos, {
        nome: 'Faturamento',
        valor: Number(v.toFixed(2)),
        formato: 'moeda',
        origem: av.action_type,
      });
    }
  }

  const vendas = metricas.find((m) => m.nome === 'Vendas');
  const faturamento = metricas.find((m) => m.nome === 'Faturamento');
  if (vendas && faturamento && vendas.valor > 0) {
    addMetrica(metricas, vistos, {
      nome: 'Ticket Médio',
      valor: Number((faturamento.valor / vendas.valor).toFixed(2)),
      formato: 'moeda',
      origem: 'ticket_medio_calc',
    });
    if (spend > 0) {
      addMetrica(metricas, vistos, {
        nome: 'Custo por Venda',
        valor: Number((spend / vendas.valor).toFixed(2)),
        formato: 'moeda',
        origem: 'custo_venda_calc',
      });
    }
  }

  return metricas;
}

function legadoDeMetricas(metricas) {
  const get = (nome) => metricas.find((m) => m.nome === nome)?.valor ?? 0;
  const spend = get('Valor investido');
  const reach = get('Pessoas Alcançadas');
  const impressions = get('Impressões');
  const clicks = get('Cliques nos Anúncios');
  const leads = get('Leads');
  const mensagens = get('Conversas no WhatsApp');
  const ctr = get('CTR');
  const cpm = get('CPM');
  const freq = get('Frequência');

  return {
    spend,
    reach,
    impressions,
    clicks,
    leads,
    mensagens,
    ctr: ctr || (impressions > 0 && clicks > 0 ? Number(((clicks / impressions) * 100).toFixed(2)) : 0),
    cpm: cpm || (impressions > 0 ? Number(((spend / impressions) * 1000).toFixed(2)) : 0),
    frequencia: freq || (reach > 0 ? Number((impressions / reach).toFixed(2)) : 0),
    custoLead: leads > 0 ? Number((spend / leads).toFixed(2)) : null,
    custoMensagem: mensagens > 0 ? Number((spend / mensagens).toFixed(2)) : null,
  };
}

const normalizados = insights.map((ins) => {
  const campaignId = ins.campaign_id != null ? String(ins.campaign_id) : null;
  const metricas = metricasDaInsight(ins);
  const leg = legadoDeMetricas(metricas);

  return {
    json: {
      campaign_id: campaignId,
      meta_campaign_id: campaignId,
      campanha: ins.campaign_name || ins.campaignName || 'Sem nome',
      metricas,
      ...leg,
    },
  };
});

return normalizados;
