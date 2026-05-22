/**
 * Dashboard principal — Telfer Performance Intelligence
 * Lógica de métricas, n8n e renderização (inalterada em comportamento).
 */
(function () {
  let data = null;

  function modoWebhookTeste() {
    const q = new URLSearchParams(window.location.search).get('test');
    if (q === '1') return true;
    if (q === '0') return false;
    if (window.TELFER_CONFIG?.webhookMode === 'test') return true;
    if (window.TELFER_CONFIG?.webhookMode === 'prod') return false;
    const { protocol, hostname } = window.location;
    if (protocol === 'file:') return true;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    return false;
  }

  function montarUrlWebhook() {
    const cfg = window.TELFER_CONFIG;
    if (!cfg?.n8nHost || !cfg?.webhookId) return null;
    const base = String(cfg.n8nHost).replace(/\/$/, '');
    const segmento = modoWebhookTeste() ? 'webhook-test' : 'webhook';
    return `${base}/${segmento}/${cfg.webhookId}`;
  }

  function exigirConfig() {
    const url = montarUrlWebhook();
    if (url) return url;
    const msg =
      'Configuração ausente. Local: copie js/config.example.js → js/config.js ou rode ' +
      '"node scripts/generate-config.js". No GitHub Pages: confira o deploy Actions e secrets N8N_HOST / WEBHOOK_ID.';
    console.error('[Telfer]', msg);
    alert(msg);
    throw new Error(msg);
  }

  const FETCH_TIMEOUT_PADRAO_MS = 15 * 60 * 1000;
  const FETCH_OBJETIVOS_MS = 90 * 1000;
  const OBJETIVOS_POLL_MS = 10 * 60 * 1000;
  let relatorioEmAndamento = false;
  let loadingTimerId = null;
  let loadingInicioMs = 0;

  function timeoutRelatorioMs() {
    const n = Number(window.TELFER_CONFIG?.fetchTimeoutMs);
    if (Number.isFinite(n) && n >= 120000) return n;
    return FETCH_TIMEOUT_PADRAO_MS;
  }

  function minutosTimeoutLabel() {
    return Math.round(timeoutRelatorioMs() / 60000);
  }

  function escHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function defaultsDatas() {
    const fim = new Date();
    const ini = new Date();
    ini.setDate(ini.getDate() - 30);
    const iso = (d) => d.toISOString().slice(0, 10);
    const elIni = document.getElementById('dataInicio');
    const elFim = document.getElementById('dataFim');
    if (!elIni.value) elIni.value = iso(ini);
    if (!elFim.value) elFim.value = iso(fim);
  }

  function formatarMetrica(m) {
    const v = Number(m.valor);
    if (!Number.isFinite(v)) return '—';
    if (m.formato === 'moeda') {
      return (
        'R$ ' +
        v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      );
    }
    if (m.formato === 'percentual') return v.toLocaleString('pt-BR') + '%';
    if (m.formato === 'decimal') {
      return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    }
    return v.toLocaleString('pt-BR');
  }

  function metricasDaCampanha(c) {
    if (Array.isArray(c.metricas) && c.metricas.length) return c.metricas;
    const legado = [];
    if (c.spend != null)
      legado.push({ nome: 'Valor investido', valor: c.spend, formato: 'moeda' });
    if (c.reach != null)
      legado.push({ nome: 'Pessoas Alcançadas', valor: c.reach, formato: 'numero' });
    if (c.leads != null) legado.push({ nome: 'Leads', valor: c.leads, formato: 'numero' });
    if (c.mensagens != null)
      legado.push({ nome: 'Conversas no WhatsApp', valor: c.mensagens, formato: 'numero' });
    if (c.ctr != null) legado.push({ nome: 'CTR', valor: c.ctr, formato: 'percentual' });
    if (c.cpm != null) legado.push({ nome: 'CPM', valor: c.cpm, formato: 'moeda' });
    return legado;
  }

  function htmlListaMetricas(metricas) {
    if (!metricas.length) {
      return '<p class="text-muted">Sem métricas neste período.</p>';
    }
    return (
      '<ul class="metricas-list metricas-list--readable">' +
      metricas
        .map(
          (m) =>
            '<li><span class="nome-metrica">' +
            escHtml(m.nome) +
            '</span><span class="valor-metrica">' +
            escHtml(formatarMetrica(m)) +
            '</span></li>'
        )
        .join('') +
      '</ul>'
    );
  }

  function limparMarkdownJson(raw) {
    let s = String(raw || '').trim();
    const m = s.match(/```(?:json)?\s*([\s\S]*?)(?:```|$)/i);
    if (m) s = m[1].trim();
    return s.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
  }

  function tentarParseClaudeTexto(texto) {
    const cleaned = limparMarkdownJson(texto);
    if (!cleaned) return null;
    try {
      return JSON.parse(cleaned);
    } catch (e) {
      const start = cleaned.indexOf('{');
      if (start < 0) return null;
      let t = cleaned.slice(start).replace(/,\s*$/, '');
      const ob = (t.match(/{/g) || []).length - (t.match(/}/g) || []).length;
      const ol = (t.match(/\[/g) || []).length - (t.match(/]/g) || []).length;
      for (let i = 0; i < ol; i++) t += ']';
      for (let i = 0; i < ob; i++) t += '}';
      try {
        return JSON.parse(t);
      } catch (e2) {
        return null;
      }
    }
  }

  function extrairPayloadRelatorio(bruto) {
    if (bruto == null) return null;

    if (typeof bruto === 'string') {
      try {
        return extrairPayloadRelatorio(JSON.parse(bruto));
      } catch (e) {
        return null;
      }
    }

    if (Array.isArray(bruto)) {
      for (const item of bruto) {
        const j = item?.json ?? item;
        if (j && typeof j === 'object' && Array.isArray(j.campanhas)) return j;
      }
      const comCampanhas = bruto.find(
        (item) => Array.isArray(item?.campanhas) && item.campanhas.length
      );
      if (comCampanhas) return comCampanhas;
      if (bruto[0]?.json) return extrairPayloadRelatorio(bruto[0].json);
      return extrairPayloadRelatorio(bruto[0]);
    }

    if (bruto.tipo === 'objetivos') return bruto;

    if (typeof bruto.body === 'string') {
      try {
        return extrairPayloadRelatorio(JSON.parse(bruto.body));
      } catch {
        return extrairPayloadRelatorio(bruto.body);
      }
    }
    if (bruto.body != null) return extrairPayloadRelatorio(bruto.body);

    if (bruto.json && typeof bruto.json === 'object')
      return extrairPayloadRelatorio(bruto.json);

    if (bruto.data && typeof bruto.data === 'object') {
      if (Array.isArray(bruto.data.campanhas)) {
        return {
          ...bruto,
          campanhas: bruto.data.campanhas,
          kpis: bruto.kpis || bruto.data.kpis,
        };
      }
      return extrairPayloadRelatorio(bruto.data);
    }

    return bruto;
  }

  function normalizarRelatorio(payload) {
    const base = extrairPayloadRelatorio(payload);
    if (!base || typeof base !== 'object') return null;

    if (base.tipo === 'objetivos') return base;

    if (Array.isArray(base.campanhas) && base.campanhas.length) {
      return base;
    }

    const chunks = base.content ?? base.body?.content;
    if (Array.isArray(chunks)) {
      const texto = chunks
        .map((x) => (x?.type === 'text' ? (x?.text ?? '') : ''))
        .join('');
      const parsed = tentarParseClaudeTexto(texto);
      if (parsed?.campanhas?.length) return parsed;
      if (parsed?.kpis) return parsed;
    }

    if (typeof base.text === 'string') {
      const parsed = tentarParseClaudeTexto(base.text);
      if (parsed?.campanhas?.length) return parsed;
      if (parsed?.kpis) return parsed;
    }

    return base;
  }

  function buscarRelatorioNoObjeto(root, seen, depth) {
    if (root == null || typeof root !== 'object') return null;
    const set = seen || new Set();
    const d = depth ?? 0;
    if (d > 14 || set.has(root)) return null;
    set.add(root);

    if (Array.isArray(root.campanhas) && root.campanhas.length) {
      const ok =
        root.kpis ||
        root.insights_gerais ||
        root.campanhas.some((c) => c && (c.metricas?.length || c.nome || c.campanha));
      if (ok) return root;
    }

    if (Array.isArray(root)) {
      for (const item of root) {
        const hit = buscarRelatorioNoObjeto(item?.json ?? item, set, d + 1);
        if (hit) return hit;
      }
      return null;
    }

    for (const v of Object.values(root)) {
      if (v && typeof v === 'object') {
        const hit = buscarRelatorioNoObjeto(v, set, d + 1);
        if (hit) return hit;
      }
    }
    return null;
  }

  function montarCampanhasDeLinhas(bruto) {
    const linhas = [];
    const visitados = new Set();

    function add(row) {
      if (!row || typeof row !== 'object' || visitados.has(row)) return;
      visitados.add(row);
      if (Array.isArray(row.campanhas)) {
        linhas.push(...row.campanhas);
        return;
      }
      if (row.metricas?.length || row.campanha || row.nome || row.nome_campanha) {
        linhas.push(row);
      }
    }

    function walk(x, depth) {
      if (!x || typeof x !== 'object' || depth > 12) return;
      if (Array.isArray(x)) {
        x.forEach((i) => walk(i?.json ?? i, depth + 1));
        return;
      }
      add(x);
      for (const v of Object.values(x)) {
        if (v && typeof v === 'object') walk(v, depth + 1);
      }
    }

    walk(bruto, 0);

    const campanhas = linhas.map((row) => ({
      nome: row.nome || row.campanha || row.nome_campanha || 'Campanha',
      objetivo: row.objetivo ?? null,
      metricas: Array.isArray(row.metricas) ? row.metricas : [],
      criativos: Array.isArray(row.criativos) ? row.criativos : [],
      score: row.score,
      status: row.status,
    }));

    if (!campanhas.length) return null;

    return {
      campanhas,
      kpis: { metricas_resumo: [] },
      insights_gerais: [],
      acoes_recomendadas: [],
      _montado_do_payload: true,
    };
  }

  function resolverRelatorio(bruto) {
    if (bruto == null) return null;

    const candidatos = [];
    const push = (x) => {
      if (x && typeof x === 'object' && x.tipo !== 'objetivos') candidatos.push(x);
    };

    push(extrairPayloadRelatorio(bruto));
    push(buscarRelatorioNoObjeto(bruto));
    push(montarCampanhasDeLinhas(bruto));

    if (typeof bruto === 'object') push(bruto);

    for (const c of candidatos) {
      const n = normalizarRelatorio(c);
      if (n?.tipo === 'objetivos') continue;
      if (Array.isArray(n?.campanhas) && n.campanhas.length) return n;
    }

    const montado = montarCampanhasDeLinhas(bruto);
    if (montado?.campanhas?.length) return montado;

    for (const c of candidatos) {
      const n = normalizarRelatorio(c);
      if (n?.kpis?.metricas_resumo?.length) {
        return { ...n, campanhas: n.campanhas || [] };
      }
    }

    return normalizarRelatorio(candidatos[0] ?? bruto);
  }

  function temDadosRelatorio(rel) {
    if (!rel || typeof rel !== 'object') return false;
    if (Array.isArray(rel.campanhas) && rel.campanhas.length) return true;
    if (rel.kpis?.metricas_resumo?.length) return true;
    return false;
  }

  function mostrarAviso(msg) {
    const el = document.getElementById('alertBanner');
    if (!msg) {
      el.classList.add('is-hidden');
      el.textContent = '';
      return;
    }
    el.classList.remove('is-hidden');
    el.textContent = msg;
  }

  function salvarRelatorioLocal(rel, filtros) {
    TelferStorage.saveDashboard(rel, filtros);
  }

  function lerObjetivoSelecionado() {
    const sel = document.getElementById('objetivoCampanha');
    const naTela = sel?.value ?? '';
    if (naTela !== '') return naTela;
    const salvo = TelferStorage.loadFilters()?.objetivo;
    return salvo || '';
  }

  function filtrosDaTela() {
    return {
      data_inicio: document.getElementById('dataInicio').value || null,
      data_fim: document.getElementById('dataFim').value || null,
      objetivo: document.getElementById('objetivoCampanha').value || null,
    };
  }

  function persistirFiltrosNaSessao() {
    TelferStorage.saveFilters(filtrosDaTela());
    const rel = TelferStorage.loadDashboard();
    if (rel) TelferStorage.saveDashboard(rel, filtrosDaTela());
  }

  function aplicarObjetivoNoSelect(valor) {
    const sel = document.getElementById('objetivoCampanha');
    if (!sel) return;
    const v = valor == null ? '' : String(valor);
    if (v === '') {
      sel.value = '';
      return;
    }
    const jaExiste = [...sel.options].some((o) => o.value === v);
    if (!jaExiste) {
      const opt = document.createElement('option');
      opt.value = v;
      opt.textContent = v + ' (filtro atual)';
      opt.dataset.filtroAtual = '1';
      sel.appendChild(opt);
    }
    sel.value = v;
  }

  function aplicarFiltrosNaTela(filtros) {
    if (!filtros) return;
    if (filtros.data_inicio) document.getElementById('dataInicio').value = filtros.data_inicio;
    if (filtros.data_fim) document.getElementById('dataFim').value = filtros.data_fim;
    if (filtros.objetivo != null) aplicarObjetivoNoSelect(filtros.objetivo || '');
  }

  function textoResumoObjetivos(json) {
    const nCamp = json.total_campanhas_ativas ?? null;
    const nObj = json.objetivos?.length ?? json.total_objetivos_distintos ?? 0;
    const quando = json.atualizado_em
      ? new Date(json.atualizado_em).toLocaleString('pt-BR')
      : 'agora';
    let msg = '';
    if (nCamp != null) {
      msg = `${nCamp} campanha${nCamp !== 1 ? 's' : ''} ativa${nCamp !== 1 ? 's' : ''} · ${nObj} objetivo${nObj !== 1 ? 's' : ''} distinto${nObj !== 1 ? 's' : ''} no filtro`;
      if (nCamp > nObj) {
        msg += ' (várias campanhas podem compartilhar o mesmo objetivo)';
      }
    } else {
      msg = `${nObj} objetivo(s) distinto(s)`;
    }
    if (json.campanhas_sem_objetivo > 0) {
      msg += ` · ${json.campanhas_sem_objetivo} ativa(s) sem campo objective na Meta`;
    }
    return `${msg} · ${quando}`;
  }

  function preencherSelectObjetivos(lista, valorPreferido) {
    const preferido =
      valorPreferido !== undefined && valorPreferido !== null
        ? valorPreferido
        : lerObjetivoSelecionado();

    const sel = document.getElementById('objetivoCampanha');
    sel.innerHTML = '<option value="">Todos (todas as campanhas ativas)</option>';
    for (const item of lista) {
      const opt = document.createElement('option');
      opt.value = item.value;
      const qtd =
        item.campanhas != null
          ? ` (${item.campanhas} campanha${item.campanhas !== 1 ? 's' : ''})`
          : '';
      const nomes = Array.isArray(item.campanhas_nomes)
        ? item.campanhas_nomes.join('\n')
        : '';
      opt.textContent = (item.value || item.label) + qtd;
      if (nomes) opt.title = nomes;
      sel.appendChild(opt);
    }
    aplicarObjetivoNoSelect(preferido);
  }

  function campanhaAtivaRelatorio(c) {
    const st = String(
      c.status || c.effective_status || c.status_campanha || 'ACTIVE'
    ).toUpperCase();
    return st === 'ACTIVE' || st === '';
  }

  function objetivosFromRelatorio(rel) {
    const campanhas = (Array.isArray(rel?.campanhas) ? rel.campanhas : []).filter(
      campanhaAtivaRelatorio
    );
    const map = new Map();
    for (const c of campanhas) {
      const o = c.objetivo || c.objective;
      if (!o) continue;
      if (!map.has(o)) map.set(o, []);
      map.get(o).push(c.nome || c.campanha || '');
    }
    return [...map.entries()].map(([value, nomes]) => {
      const exemplo = nomes.filter(Boolean).slice(0, 2).join(' · ');
      return {
        value,
        label: exemplo ? `${value} — ${exemplo}` : value,
        campanhas: nomes.length,
      };
    });
  }

  function atualizarMetaObjetivos(texto) {
    document.getElementById('objetivosMeta').textContent = texto || '';
  }

  async function carregarObjetivosMeta(silencioso) {
    if (silencioso && relatorioEmAndamento) return;

    if (!silencioso) atualizarMetaObjetivos('Atualizando objetivos na Meta…');

    try {
      const ctrlObj = new AbortController();
      const tObj = setTimeout(() => ctrlObj.abort(), FETCH_OBJETIVOS_MS);
      let res;
      try {
        res = await fetch(exigirConfig(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listar_objetivos: true }),
          signal: ctrlObj.signal,
        });
      } finally {
        clearTimeout(tObj);
      }
      const json = await res.json();
      if (json.tipo === 'objetivos' && Array.isArray(json.objetivos)) {
        TelferStorage.saveObjectives(json);
        preencherSelectObjetivos(json.objetivos, lerObjetivoSelecionado());
        atualizarMetaObjetivos(textoResumoObjetivos(json));
        return;
      }
      throw new Error('Resposta inesperada ao listar objetivos');
    } catch (e) {
      const cache = TelferStorage.loadObjectives();
      if (cache?.objetivos?.length) {
        preencherSelectObjetivos(cache.objetivos, lerObjetivoSelecionado());
        atualizarMetaObjetivos('Objetivos do cache (falha ao consultar Meta agora)');
        return;
      }
      const rel = TelferStorage.loadDashboard();
      const fallback = objetivosFromRelatorio(rel);
      if (fallback.length) {
        preencherSelectObjetivos(fallback, lerObjetivoSelecionado());
        atualizarMetaObjetivos('Objetivos do último relatório salvo');
        return;
      }
      atualizarMetaObjetivos(
        'Não foi possível carregar objetivos. Reimporte o fluxo n8n atualizado.'
      );
      console.warn(e);
    }
  }

  function restaurarRelatorioSalvo() {
    const salvo = TelferStorage.loadDashboard();
    const normalizado = resolverRelatorio(salvo);
    if (!temDadosRelatorio(normalizado)) return false;

    data = normalizado;
    aplicarFiltrosNaTela(TelferStorage.loadFilters());

    const quando = TelferStorage.loadSavedAt();
    if (quando) {
      mostrarAviso(
        'Relatório restaurado (salvo em ' +
          new Date(quando).toLocaleString('pt-BR') +
          '). Gere novamente para atualizar métricas.'
      );
    }

    renderDashboard();
    document.getElementById('reloadBtn').classList.remove('is-hidden');
    return true;
  }

  function setLoading(ativo, texto) {
    const el = document.getElementById('loading');
    if (loadingTimerId) {
      clearInterval(loadingTimerId);
      loadingTimerId = null;
    }
    if (ativo) {
      loadingInicioMs = Date.now();
      el.classList.remove('is-hidden');
      const base = texto || 'processando…';
      const limiteMin = minutosTimeoutLabel();
      const atualizar = () => {
        const s = Math.floor((Date.now() - loadingInicioMs) / 1000);
        const min = Math.floor(s / 60);
        const sec = String(s % 60).padStart(2, '0');
        const decorrido = min > 0 ? `${min}:${sec}` : `0:${sec}`;
        el.textContent = `${base} (${decorrido} · limite ${limiteMin} min)`;
      };
      atualizar();
      loadingTimerId = setInterval(atualizar, 1000);
    } else {
      el.classList.add('is-hidden');
    }
  }

  const generateBtn = document.getElementById('generateBtn');
  const reloadBtn = document.getElementById('reloadBtn');
  const refreshObjetivosBtn = document.getElementById('refreshObjetivosBtn');

  generateBtn.addEventListener('click', gerarRelatorio);
  reloadBtn.addEventListener('click', gerarRelatorio);
  refreshObjetivosBtn.addEventListener('click', () => carregarObjetivosMeta(false));

  document.getElementById('objetivoCampanha')?.addEventListener('change', persistirFiltrosNaSessao);
  document.getElementById('dataInicio')?.addEventListener('change', persistirFiltrosNaSessao);
  document.getElementById('dataFim')?.addEventListener('change', persistirFiltrosNaSessao);

  document.querySelector('a[href="analise.html"]')?.addEventListener('click', () => {
    if (data?.kpis || data?.campanhas?.length) {
      salvarRelatorioLocal(data, {
        data_inicio: document.getElementById('dataInicio').value,
        data_fim: document.getElementById('dataFim').value,
        objetivo: document.getElementById('objetivoCampanha').value || null,
      });
    }
  });

  async function gerarRelatorio() {
    relatorioEmAndamento = true;
    persistirFiltrosNaSessao();

    const objetivoEscolhido = lerObjetivoSelecionado();

    setLoading(true, 'n8n processando (Meta + Claude)…');
    console.log(
      '[Telfer] POST',
      modoWebhookTeste() ? 'webhook-test' : 'webhook',
      'objetivo:',
      objetivoEscolhido || 'todos'
    );

    generateBtn.disabled = true;
    reloadBtn.disabled = true;

    try {
      const dataInicio = document.getElementById('dataInicio').value;
      const dataFim = document.getElementById('dataFim').value;
      const objetivo = objetivoEscolhido;

      const payload = {
        gerar: true,
        data: new Date().toISOString(),
        data_inicio: dataInicio || null,
        data_fim: dataFim || null,
        objetivo_campanha: objetivo || null,
      };

      const timeoutMs = timeoutRelatorioMs();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      let response;
      try {
        response = await fetch(exigirConfig(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } catch (err) {
        if (err?.name === 'AbortError') {
          const lim = minutosTimeoutLabel();
          throw new Error(
            `Tempo esgotado (${lim} min). O fluxo no n8n pode ainda estar rodando — veja Execuções no painel. ` +
              'Se terminou com sucesso, gere de novo ou aumente fetchTimeoutMs no config. ' +
              'Local: index.html?test=1 + Listen no n8n.'
          );
        }
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }

      setLoading(true, 'Lendo JSON do n8n…');

      const textoResposta = await response.text();
      console.log('[Telfer] HTTP', response.status, 'bytes', textoResposta?.length ?? 0);

      if (!textoResposta?.trim()) {
        throw new Error(
          'Resposta vazia do webhook. Ative o workflow (Published) ou use ?test=1 com Listen no n8n.'
        );
      }

      let bruto;
      try {
        bruto = JSON.parse(textoResposta);
      } catch (e) {
        console.error('Resposta não é JSON:', textoResposta?.slice(0, 800));
        throw new Error('O n8n não retornou JSON válido. Veja o console (F12).');
      }

      console.log('[Telfer] Payload n8n (bruto):', bruto);

      const extraido = extrairPayloadRelatorio(bruto);
      if (extraido?.tipo === 'objetivos') {
        throw new Error(
          'O webhook devolveu só a lista de objetivos, não o relatório. No n8n, confira o nó IF "Listar só objetivos?" (ramo relatório quando gerar=true).'
        );
      }

      data = resolverRelatorio(bruto);

      if (!response.ok) {
        throw new Error(
          'HTTP ' + response.status + ': ' + (textoResposta?.slice(0, 200) || 'erro')
        );
      }

      if (!temDadosRelatorio(data)) {
        const chaves =
          extraido && typeof extraido === 'object'
            ? Object.keys(extraido).join(', ')
            : typeof bruto === 'object'
              ? Object.keys(bruto).join(', ')
              : '—';
        throw new Error(
          'Não foi possível montar campanhas no front. Chaves: ' +
            chaves +
            '. Veja [Telfer] Payload n8n no console (F12).'
        );
      }

      setLoading(true, 'Montando painel…');

      const avisos = [];
      if (data._claude_truncated) {
        avisos.push(
          'Claude cortou a resposta (max_tokens). Métricas e criativos podem vir da Meta.'
        );
      }
      if (data._parse_fallback || data._parse_partial) {
        avisos.push('JSON do Claude incompleto; métricas preservadas da Meta.');
      }
      if (data.insights_gerais?.[0]?.includes('Não foi possível interpretar')) {
        avisos.push('Atualize o nó Montar Resposta Webhook no n8n.');
      }
      mostrarAviso(avisos.length ? avisos.join(' ') : '');

      salvarRelatorioLocal(data, {
        data_inicio: dataInicio,
        data_fim: dataFim,
        objetivo: objetivo || null,
      });

      const objFromReport = objetivosFromRelatorio(data);
      if (objFromReport.length) {
        const cache = TelferStorage.loadObjectives();
        if (!cache?.objetivos?.length) {
          TelferStorage.saveObjectives({
            tipo: 'objetivos',
            objetivos: objFromReport,
            atualizado_em: new Date().toISOString(),
          });
          preencherSelectObjetivos(objFromReport, objetivo);
        }
      }

      aplicarObjetivoNoSelect(objetivo);

      renderDashboard();
      console.log('[Telfer] Painel montado:', data.campanhas?.length, 'campanhas');

      reloadBtn.classList.remove('is-hidden');
    } catch (error) {
      mostrarAviso('');
      alert(error?.message || 'Erro ao gerar relatório');
      console.error('[Telfer] Erro:', error);
    } finally {
      relatorioEmAndamento = false;
      aplicarObjetivoNoSelect(TelferStorage.loadFilters()?.objetivo ?? lerObjetivoSelecionado());
      setLoading(false);
      generateBtn.disabled = false;
      reloadBtn.disabled = false;
    }
  }

  function renderDashboard() {
    if (!data) return;

    const campanhas = Array.isArray(data.campanhas) ? data.campanhas : [];
    const kpis = data.kpis || {};

    if (!campanhas.length) {
      const resumoDireto = kpis.metricas_resumo;
      if (Array.isArray(resumoDireto) && resumoDireto.length) {
        const kpisGrid = document.getElementById('kpisGrid');
        kpisGrid.innerHTML = '';
        for (const m of resumoDireto) {
          kpisGrid.innerHTML += `
            <div class="card card-kpi">
              <div class="card-title">${escHtml(m.nome)}</div>
              <div class="card-value">${escHtml(formatarMetrica(m))}</div>
            </div>
          `;
        }
      } else {
        document.getElementById('kpisGrid').innerHTML =
          '<div class="card card-kpi"><div class="card-title">Sem dados</div><div class="card-value">Gere o relatório</div></div>';
      }
      document.getElementById('campanhasContainer').innerHTML =
        '<p class="text-muted">Nenhuma campanha no JSON — só resumo/KPIs.</p>';
      document.getElementById('date').textContent = new Date().toLocaleDateString('pt-BR');
      return;
    }

    function agregarResumo() {
      if (Array.isArray(kpis.metricas_resumo) && kpis.metricas_resumo.length) {
        return kpis.metricas_resumo;
      }
      const map = new Map();
      for (const c of campanhas) {
        for (const m of metricasDaCampanha(c)) {
          const fmt = m.formato || 'numero';
          if (fmt === 'percentual' || fmt === 'decimal') continue;
          if (!map.has(m.nome)) map.set(m.nome, { ...m, valor: 0 });
          map.get(m.nome).valor += Number(m.valor) || 0;
        }
      }
      return [...map.values()].map((m) => ({
        ...m,
        valor: m.formato === 'moeda' ? Number(m.valor.toFixed(2)) : m.valor,
      }));
    }

    const resumo = agregarResumo();

    document.getElementById('date').textContent = new Date().toLocaleDateString('pt-BR');

    const kpisGrid = document.getElementById('kpisGrid');
    kpisGrid.innerHTML = '';
    for (const m of resumo) {
      kpisGrid.innerHTML += `
        <div class="card card-kpi">
          <div class="card-title">${escHtml(m.nome)}</div>
          <div class="card-value">${escHtml(formatarMetrica(m))}</div>
        </div>
      `;
    }
    if (!kpisGrid.innerHTML) {
      kpisGrid.innerHTML =
        '<div class="card card-kpi"><div class="card-title">Aguardando dados</div><div class="card-value">—</div></div>';
    }

    const container = document.getElementById('campanhasContainer');
    container.innerHTML = '';

    campanhas.forEach((c) => {
      const badgeClass =
        c.status === 'Excelente'
          ? 'excelente'
          : c.status === 'Boa'
            ? 'boa'
            : c.status === 'Atenção'
              ? 'atencao'
              : 'critica';
      const metricas = metricasDaCampanha(c);
      const obj = c.objetivo
        ? `<div class="objetivo-tag">Objetivo: ${escHtml(c.objetivo)}</div>`
        : '';
      const score =
        c.score != null
          ? `<div class="score-label">Score: ${escHtml(c.score)}</div>`
          : '';
      const status = c.status
        ? `<span class="badge ${badgeClass}">${escHtml(c.status)}</span>`
        : '';

      container.innerHTML += `
        <div class="campanha-bloco">
          <div class="campanha-top">
            <div>
              <h3>${escHtml(c.nome)}</h3>
              ${obj}
            </div>
            <div>
              ${score}
              ${status}
            </div>
          </div>
            <div class="metricas-panel">
            <span class="metricas-label">Métricas essenciais</span>
            ${htmlListaMetricas(metricas)}
            </div>
        </div>
      `;
    });

    const insightsList = document.getElementById('insightsList');
    if (insightsList) {
      insightsList.innerHTML = '';
      (data.insights_gerais || []).forEach((i) => {
        insightsList.innerHTML += `<li>${escHtml(i)}</li>`;
      });
    }

    const recommendationsList = document.getElementById('recommendationsList');
    if (recommendationsList) {
      recommendationsList.innerHTML = '';
      (data.acoes_recomendadas || []).forEach((i) => {
        recommendationsList.innerHTML += `<li>${escHtml(i)}</li>`;
      });
    }

  }

  defaultsDatas();

  (async function init() {
    restaurarRelatorioSalvo();

    const cacheObj = TelferStorage.loadObjectives();
    if (cacheObj?.objetivos?.length) {
      preencherSelectObjetivos(cacheObj.objetivos, lerObjetivoSelecionado());
      const quando = cacheObj.cached_at || cacheObj.atualizado_em;
      if (quando) {
        atualizarMetaObjetivos(
          'Cache · ' +
            new Date(quando).toLocaleString('pt-BR') +
            ' (↻ Meta para atualizar)'
        );
      }
    } else {
      aplicarFiltrosNaTela(TelferStorage.loadFilters());
    }

    await carregarObjetivosMeta(true);
    aplicarObjetivoNoSelect(TelferStorage.loadFilters()?.objetivo ?? lerObjetivoSelecionado());
    setInterval(() => carregarObjetivosMeta(true), OBJETIVOS_POLL_MS);
  })();
})();
