/**
 * Chips de objetivo — espelham o <select id="objetivoCampanha">.
 * Compatível com o layout Lovable (gt/layout-e-testes), sem alterar a lógica do painel.
 */
(function () {
  const select = document.getElementById('objetivoCampanha');
  const chipsContainer = document.getElementById('chipsObjetivos');
  if (!select || !chipsContainer) return;

  const TODAS_LABEL = 'todas';

  function rotuloChip(rawLabel, rawValue) {
    const tentativa = window.TelferMetricas?.rotuloObjetivo?.(rawValue, '') || rawLabel || rawValue || '';
    const base = String(tentativa)
      .toLowerCase()
      .replace(/\s+\(\d+\s+campanha[s]?\)/g, '')
      .trim();
    return base || TODAS_LABEL;
  }

  function reconstruirChips() {
    const fragment = document.createDocumentFragment();

    const todasChip = criarChip('', TODAS_LABEL);
    fragment.appendChild(todasChip);

    const seen = new Set();
    for (const option of select.options) {
      const value = option.value;
      if (!value) continue;
      const rotulo = rotuloChip(option.textContent, value);
      if (seen.has(rotulo)) continue;
      seen.add(rotulo);
      fragment.appendChild(criarChip(value, rotulo));
    }

    chipsContainer.innerHTML = '';
    chipsContainer.appendChild(fragment);
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
    if (select.value === value) return;
    select.value = value;
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
  inicializarTabAnaliseIa();

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
})();
