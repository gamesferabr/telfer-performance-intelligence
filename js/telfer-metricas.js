/**
 * Rótulos de objetivos Meta e métricas essenciais por tipo de campanha (relatórios Destaque Odonto).
 */
(function (global) {
  const ROTULOS_OBJETIVO = {
    OUTCOME_ENGAGEMENT: 'Mensagens',
    MESSAGES: 'Mensagens',
    CONVERSATIONS: 'Mensagens',
    OUTCOME_AWARENESS: 'Visibilidade',
    BRAND_AWARENESS: 'Visibilidade',
    REACH: 'Visibilidade',
    OUTCOME_TRAFFIC: 'Tráfego',
    LINK_CLICKS: 'Tráfego',
    OUTCOME_LEADS: 'Leads',
    LEAD_GENERATION: 'Leads',
    OUTCOME_SALES: 'Vendas',
    CONVERSIONS: 'Vendas',
    OUTCOME_APP_PROMOTION: 'App',
    APP_INSTALLS: 'App',
  };

  /** Painel e campanhas: sempre estes 4 indicadores. */
  const METRICAS_EXIBICAO_PAINEL = [
    { busca: 'Valor investido', rotulo: 'Valor investido' },
    { busca: 'Pessoas Alcançadas', rotulo: 'Pessoas alcançadas' },
    { busca: 'Conversas no WhatsApp', rotulo: 'Conversas no WhatsApp' },
    { busca: 'Custo por Conversa', rotulo: 'Custo por conversa' },
  ];

  const METRICAS_POR_FAMILIA = {
    visibilidade: [
      'Valor investido',
      'Pessoas Alcançadas',
      'Impressões',
      'Frequência',
      'CPM',
    ],
    mensagens: [
      'Valor investido',
      'Pessoas Alcançadas',
      'Conversas no WhatsApp',
      'Custo por Conversas no WhatsApp',
      'CTR',
      'Frequência',
    ],
    leads: [
      'Valor investido',
      'Pessoas Alcançadas',
      'Leads',
      'Custo por Leads',
      'CTR',
      'CPM',
    ],
    vendas: [
      'Valor investido',
      'Pessoas Alcançadas',
      'Vendas',
      'Faturamento',
      'Custo por Venda',
      'Ticket Médio',
    ],
    trafego: [
      'Valor investido',
      'Pessoas Alcançadas',
      'Cliques nos Anúncios',
      'CTR',
      'CPM',
      'Visitas do Site',
    ],
    remarketing: [
      'Valor investido',
      'Pessoas Alcançadas',
      'Cliques nos Anúncios',
      'CTR',
      'Visitas do Site',
      'Vendas',
    ],
    padrao: [
      'Valor investido',
      'Pessoas Alcançadas',
      'Impressões',
      'CTR',
      'CPM',
    ],
  };

  function normalizar(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function familiaPorObjetivo(objective, nomeCampanha) {
    const obj = String(objective || '').toUpperCase();
    const nome = normalizar(nomeCampanha);

    if (/remarketing|retarget|remarket/.test(nome)) return 'remarketing';
    if (/whatsapp|mensagem|mensagens|conversa|engajamento/.test(nome)) return 'mensagens';

    if (
      obj.includes('ENGAGEMENT') ||
      obj === 'MESSAGES' ||
      obj === 'CONVERSATIONS'
    ) {
      return 'mensagens';
    }
    if (obj.includes('AWARENESS') || obj === 'REACH' || obj === 'BRAND_AWARENESS') {
      return 'visibilidade';
    }
    if (obj.includes('LEAD')) return 'leads';
    if (obj.includes('SALE') || obj === 'CONVERSIONS') return 'vendas';
    if (obj.includes('TRAFFIC') || obj === 'LINK_CLICKS') {
      return /remarketing|retarget/.test(nome) ? 'remarketing' : 'trafego';
    }
    return 'padrao';
  }

  function rotuloObjetivo(objective, nomeCampanha) {
    if (!objective) return '';
    const fam = familiaPorObjetivo(objective, nomeCampanha);
    if (fam === 'remarketing') return 'Remarketing';
    const key = String(objective).toUpperCase();
    if (ROTULOS_OBJETIVO[key]) return ROTULOS_OBJETIVO[key];
    return objective;
  }

  function listaEssenciais() {
    return METRICAS_EXIBICAO_PAINEL.map((m) => m.busca);
  }

  function nomeMetricaCombina(nomeMetrica, nomeEssencial) {
    const n = String(nomeMetrica || '').trim();
    const e = String(nomeEssencial || '').trim();
    if (n === e) return true;
    const eLow = e.toLowerCase();
    const nLow = n.toLowerCase();
    if (eLow === 'custo por conversa') {
      return nLow.startsWith('custo por') && (nLow.includes('conversa') || nLow.includes('whatsapp'));
    }
    if (e.startsWith('Custo por ') && n.startsWith('Custo por ')) {
      const base = e.slice('Custo por '.length).toLowerCase();
      return nLow.includes(base);
    }
    return false;
  }

  function formatoPadraoMetrica(busca) {
    if (busca === 'Valor investido' || busca.startsWith('Custo por')) return 'moeda';
    return 'numero';
  }

  function filtrarEssenciais(metricas) {
    const lista = Array.isArray(metricas) ? metricas : [];
    const out = [];

    for (const { busca, rotulo } of METRICAS_EXIBICAO_PAINEL) {
      const hit = lista.find((m) => m?.nome && nomeMetricaCombina(m.nome, busca));
      out.push({
        nome: rotulo,
        valor: hit != null ? hit.valor : 0,
        formato: hit?.formato || formatoPadraoMetrica(busca),
        origem: hit?.origem || 'painel_fixo',
      });
    }
    return out;
  }

  function valorCampanha(c, nomeMetrica, chaveLegado) {
    const m = (c?.metricas || []).find((x) => x?.nome === nomeMetrica);
    if (m != null) {
      const v = Number(m.valor);
      return Number.isFinite(v) ? v : 0;
    }
    if (chaveLegado && c?.[chaveLegado] != null) {
      const v = Number(c[chaveLegado]);
      return Number.isFinite(v) ? v : 0;
    }
    return 0;
  }

  /** Campanha com gasto/alcance/impressões ou conversão no período (Meta). */
  function campanhaTemDadosPeriodo(c) {
    if (!c || typeof c !== 'object') return false;
    if (c._sem_insights_periodo === true) return false;

    const spend = valorCampanha(c, 'Valor investido', 'spend');
    const reach = valorCampanha(c, 'Pessoas Alcançadas', 'reach');
    const impressions = valorCampanha(c, 'Impressões', 'impressions');
    if (spend > 0 || reach > 0 || impressions > 0) return true;

    const clicks = valorCampanha(c, 'Cliques nos Anúncios', 'clicks');
    const mensagens = valorCampanha(c, 'Conversas no WhatsApp', 'mensagens');
    const leads = valorCampanha(c, 'Leads', 'leads');
    if (clicks > 0 || mensagens > 0 || leads > 0) return true;

    const metricas = Array.isArray(c.metricas) ? c.metricas : [];
    return metricas.some((m) => {
      const v = Number(m.valor);
      if (!Number.isFinite(v) || v <= 0) return false;
      const fmt = m.formato || 'numero';
      if (fmt === 'percentual' || fmt === 'decimal') return false;
      const nome = String(m.nome || '');
      if (nome === 'Frequência' || nome === 'CTR' || nome === 'CPM') return false;
      return true;
    });
  }

  function filtrarCampanhasComDados(lista) {
    return (Array.isArray(lista) ? lista : []).filter(campanhaTemDadosPeriodo);
  }

  function filtrarEssenciaisResumo(metricas) {
    return filtrarEssenciais(metricas);
  }

  global.TelferMetricas = {
    rotuloObjetivo,
    familiaPorObjetivo,
    listaEssenciais,
    filtrarEssenciais,
    filtrarEssenciaisResumo,
    campanhaTemDadosPeriodo,
    filtrarCampanhasComDados,
    ROTULOS_OBJETIVO,
  };
})(typeof window !== 'undefined' ? window : globalThis);
