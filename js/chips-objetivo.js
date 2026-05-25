/**
 * Chips de objetivo — espelham o <select id="objetivoCampanha">.
 * Suporta:
 *   - chips estáticos por "família" (data-familia): whatsapp, tráfego, leads, vendas, visibilidade
 *   - chips dinâmicos (data-objetivo) gerados a partir dos objetivos retornados pela Meta
 * Mantém o select original como fonte de verdade para a lógica do painel.
 */
(function () {
  const select = document.getElementById('objetivoCampanha');
  const chipsContainer = document.getElementById('chipsObjetivos');
  if (!select || !chipsContainer) return;

  const TODAS_LABEL = 'todas';
  const FAMILIA_DEFAULT_VALUE = {
    mensagens: 'OUTCOME_ENGAGEMENT',
    visibilidade: 'OUTCOME_AWARENESS',
    trafego: 'OUTCOME_TRAFFIC',
    leads: 'OUTCOME_LEADS',
    vendas: 'OUTCOME_SALES',
  };

  const chipsEstaticos = [...chipsContainer.querySelectorAll('.chip[data-familia]')];

  function rotuloChip(rawLabel, rawValue) {
    const tentativa = window.TelferMetricas?.rotuloObjetivo?.(rawValue, '') || rawLabel || rawValue || '';
    return String(tentativa)
      .toLowerCase()
      .replace(/\s+\(\d+\s+campanha[s]?\)/g, '')
      .trim();
  }

  function familiaDoValor(value) {
    if (!value) return 'todas';
    if (!window.TelferMetricas?.familiaPorObjetivo) return null;
    return window.TelferMetricas.familiaPorObjetivo(value, '');
  }

  function valorDaFamilia(familia) {
    if (familia === 'todas') return '';
    for (const option of select.options) {
      const v = option.value;
      if (!v) continue;
      if (familiaDoValor(v) === familia) return v;
    }
    return FAMILIA_DEFAULT_VALUE[familia] || '';
  }

  function reconstruirChipsDinamicos() {
    const dinamicos = chipsContainer.querySelectorAll('.chip[data-objetivo][data-dynamic="1"]');
    dinamicos.forEach((el) => el.remove());

    const familiasEstaticas = new Set(chipsEstaticos.map((c) => c.dataset.familia));
    const seenLabels = new Set(chipsEstaticos.map((c) => c.textContent.trim().toLowerCase()));
    const fragment = document.createDocumentFragment();

    for (const option of select.options) {
      const value = option.value;
      if (!value) continue;
      const familia = familiaDoValor(value);
      if (familia && familiasEstaticas.has(familia)) continue;
      const rotulo = rotuloChip(option.textContent, value);
      if (!rotulo || seenLabels.has(rotulo)) continue;
      seenLabels.add(rotulo);
      fragment.appendChild(criarChipDinamico(value, rotulo));
    }

    chipsContainer.appendChild(fragment);
    sincronizarEstadoAtivo();
    atualizarDisponibilidadeEstaticos();
  }

  function criarChipDinamico(value, rotulo) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.dataset.objetivo = value;
    btn.dataset.dynamic = '1';
    btn.textContent = rotulo;
    btn.setAttribute('role', 'tab');
    btn.addEventListener('click', () => aplicarValorObjetivo(value));
    return btn;
  }

  function configurarChipEstatico(chip) {
    chip.addEventListener('click', () => {
      const familia = chip.dataset.familia;
      const value = valorDaFamilia(familia);
      aplicarValorObjetivo(value);
    });
  }

  function aplicarValorObjetivo(value) {
    const normalizado = value || '';
    if (select.value === normalizado) {
      sincronizarEstadoAtivo();
      return;
    }
    if (normalizado && ![...select.options].some((o) => o.value === normalizado)) {
      const opt = document.createElement('option');
      opt.value = normalizado;
      opt.textContent = rotuloChip('', normalizado) || normalizado;
      opt.dataset.chipFallback = '1';
      select.appendChild(opt);
    }
    select.value = normalizado;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    sincronizarEstadoAtivo();
  }

  function sincronizarEstadoAtivo() {
    const valorAtivo = select.value || '';
    const familiaAtiva = familiaDoValor(valorAtivo);

    for (const chip of chipsContainer.querySelectorAll('.chip')) {
      let match = false;
      if (chip.dataset.familia) {
        match = (chip.dataset.familia === 'todas' && !valorAtivo) ||
                (chip.dataset.familia === familiaAtiva);
      } else if (chip.dataset.objetivo != null) {
        match = chip.dataset.objetivo === valorAtivo;
      }
      chip.classList.toggle('chip--active', match);
      chip.setAttribute('aria-selected', match ? 'true' : 'false');
    }
  }

  function atualizarDisponibilidadeEstaticos() {
    if (!select.options.length) return;
    const familiasComOpcao = new Set();
    let temOpcoes = false;
    for (const option of select.options) {
      if (!option.value) continue;
      temOpcoes = true;
      const f = familiaDoValor(option.value);
      if (f) familiasComOpcao.add(f);
    }
    if (!temOpcoes) return;

    for (const chip of chipsEstaticos) {
      if (chip.dataset.familia === 'todas') continue;
      const ativo = familiasComOpcao.has(chip.dataset.familia);
      chip.classList.toggle('chip--disabled', !ativo);
      chip.disabled = !ativo;
      chip.title = ativo ? '' : 'Sem campanhas com esse objetivo no período';
    }
  }

  for (const chip of chipsEstaticos) configurarChipEstatico(chip);

  select.addEventListener('change', sincronizarEstadoAtivo);

  const observer = new MutationObserver(reconstruirChipsDinamicos);
  observer.observe(select, { childList: true, subtree: false });

  reconstruirChipsDinamicos();
  sincronizarEstadoAtivo();

  inicializarPlaceholdersIa();
  inicializarTabAnaliseIa();
  inicializarSpinnerBotao();

  function inicializarPlaceholdersIa() {
    const pares = [
      ['insightsList', 'insightsEmpty'],
      ['recommendationsList', 'recommendationsEmpty'],
    ];
    for (const [listaId, emptyId] of pares) {
      const lista = document.getElementById(listaId);
      const empty = document.getElementById(emptyId);
      if (!lista || !empty) continue;
      atualizarVisibilidade(lista, empty);
      const obs = new MutationObserver(() => atualizarVisibilidade(lista, empty));
      obs.observe(lista, { childList: true });
    }
  }

  function atualizarVisibilidade(lista, empty) {
    const vazio = !lista.children.length;
    empty.classList.toggle('is-hidden', !vazio);
  }

  function inicializarTabAnaliseIa() {
    const tab = document.getElementById('tabAnaliseIa');
    const alvo = document.getElementById('aiCard');
    if (!tab || !alvo) return;
    tab.addEventListener('click', () => {
      alvo.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function inicializarSpinnerBotao() {
    const btn = document.getElementById('generateBtn');
    if (!btn) return;
    const label = btn.querySelector('.btn-label');
    if (!label) return;
    const textoOriginal = label.textContent;
    const observer = new MutationObserver(() => {
      label.textContent = btn.disabled ? 'gerando…' : textoOriginal;
    });
    observer.observe(btn, { attributes: true, attributeFilter: ['disabled'] });
  }
})();
