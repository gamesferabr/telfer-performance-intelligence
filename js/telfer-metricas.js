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

  function listaEssenciais(objective, nomeCampanha) {
    const fam = familiaPorObjetivo(objective, nomeCampanha);
    return METRICAS_POR_FAMILIA[fam] || METRICAS_POR_FAMILIA.padrao;
  }

  function nomeMetricaCombina(nomeMetrica, nomeEssencial) {
    const n = String(nomeMetrica || '').trim();
    const e = String(nomeEssencial || '').trim();
    if (n === e) return true;
    if (e.startsWith('Custo por ') && n.startsWith('Custo por ')) {
      const base = e.slice('Custo por '.length).toLowerCase();
      return n.toLowerCase().includes(base);
    }
    return false;
  }

  function filtrarEssenciais(metricas, objective, nomeCampanha) {
    const lista = Array.isArray(metricas) ? metricas : [];
    const ordem = listaEssenciais(objective, nomeCampanha);
    const out = [];
    const usados = new Set();

    for (const ess of ordem) {
      const hit = lista.find((m) => m?.nome && nomeMetricaCombina(m.nome, ess));
      if (hit && !usados.has(hit.nome)) {
        usados.add(hit.nome);
        out.push(hit);
      }
    }
    return out.length ? out : lista.slice(0, 6);
  }

  function filtrarEssenciaisResumo(metricas, objectiveFiltro, campanhas) {
    const lista = Array.isArray(metricas) ? metricas : [];
    if (!objectiveFiltro) {
      const base = [
        'Valor investido',
        'Pessoas Alcançadas',
        'Impressões',
        'Conversas no WhatsApp',
        'Leads',
        'Vendas',
        'CTR',
      ];
      const out = [];
      for (const ess of base) {
        const hit = lista.find((m) => m?.nome && nomeMetricaCombina(m.nome, ess));
        if (hit) out.push(hit);
      }
      return out.length ? out : lista.slice(0, 6);
    }
    const exemplo = (campanhas || []).find(
      (c) => String(c.objetivo || c.objective || '') === String(objectiveFiltro)
    );
    return filtrarEssenciais(
      lista,
      objectiveFiltro,
      exemplo?.nome || exemplo?.campanha || ''
    );
  }

  global.TelferMetricas = {
    rotuloObjetivo,
    familiaPorObjetivo,
    listaEssenciais,
    filtrarEssenciais,
    filtrarEssenciaisResumo,
    ROTULOS_OBJETIVO,
  };
})(typeof window !== 'undefined' ? window : globalThis);
