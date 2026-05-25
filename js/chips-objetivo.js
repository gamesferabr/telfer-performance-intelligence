/**
 * Chips de objetivo — 100% dinâmicos a partir das options do <select id="objetivoCampanha">.
 * Não há famílias hardcoded; o select é a única fonte de verdade.
 */
(function () {
  const select = document.getElementById('objetivoCampanha');
  const chipsContainer = document.getElementById('chipsObjetivos');
  if (!select || !chipsContainer) return;

  const TODAS_LABEL = 'todas';
  const chipsLoading = document.getElementById('chipsLoading');

  function rotuloChip(option) {
    const value = option.value;
    const tentativa =
      window.TelferMetricas?.rotuloObjetivo?.(value, '') ||
      option.textContent ||
      value ||
      '';
    return String(tentativa)
      .toLowerCase()
      .replace(/\s+\(\d+\s+campanha[s]?\)/g, '')
      .replace(/\s+\(filtro\s+atual\)/g, '')
      .trim();
  }

  function reconstruirChips() {
    const valorAnterior = select.value || '';

    chipsContainer.querySelectorAll('.chip').forEach((el) => el.remove());

    const fragment = document.createDocumentFragment();
    fragment.appendChild(criarChip('', TODAS_LABEL));

    const seenLabels = new Set([TODAS_LABEL]);
    for (const option of select.options) {
      const value = option.value;
      if (!value) continue;
      const rotulo = rotuloChip(option);
      if (!rotulo || seenLabels.has(rotulo)) continue;
      seenLabels.add(rotulo);
      fragment.appendChild(criarChip(value, rotulo));
    }

    if (chipsLoading) {
      chipsContainer.insertBefore(fragment, chipsLoading);
      chipsLoading.classList.toggle('is-hidden', seenLabels.size > 1);
    } else {
      chipsContainer.appendChild(fragment);
    }

    select.value = valorAnterior;
    sincronizarEstadoAtivo();
  }

  function criarChip(value, rotulo) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.dataset.objetivo = value;
    btn.textContent = rotulo;
    btn.setAttribute('role', 'tab');
    btn.addEventListener('click', () => aplicarObjetivo(value));
    return btn;
  }

  function aplicarObjetivo(value) {
    const normalizado = value || '';
    if (select.value === normalizado) {
      sincronizarEstadoAtivo();
      return;
    }
    select.value = normalizado;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    sincronizarEstadoAtivo();
  }

  function sincronizarEstadoAtivo() {
    const ativo = select.value || '';
    for (const chip of chipsContainer.querySelectorAll('.chip')) {
      const match = (chip.dataset.objetivo || '') === ativo;
      chip.classList.toggle('chip--active', match);
      chip.setAttribute('aria-selected', match ? 'true' : 'false');
    }
  }

  select.addEventListener('change', sincronizarEstadoAtivo);

  const observer = new MutationObserver(reconstruirChips);
  observer.observe(select, { childList: true, subtree: false });

  reconstruirChips();

  inicializarPlaceholdersIa();
  inicializarTabs();
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

  function inicializarTabs() {
    const tabs = document.querySelectorAll('.tabs-row .tab[data-painel]');
    const paineis = document.querySelectorAll('.painel[id^="painel-"]');
    if (!tabs.length || !paineis.length) return;

    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const alvoId = tab.dataset.painel;
        tabs.forEach((t) => {
          const ativo = t === tab;
          t.classList.toggle('tab--active', ativo);
          t.setAttribute('aria-selected', ativo ? 'true' : 'false');
        });
        paineis.forEach((p) => {
          p.classList.toggle('is-hidden', p.id !== alvoId);
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
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
