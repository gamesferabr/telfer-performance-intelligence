/**
 * Painel de anúncios (preview / index.html com telfer-lovable).
 * Todos os criativos vêm no payload; o filtro de status é só no frontend.
 */
(function () {
  const container = document.getElementById('anunciosContainer');
  const filtroBar = document.getElementById('anunciosFiltroStatus');
  const filtroMeta = document.getElementById('anunciosFiltroMeta');
  if (!container) return;

  const STORAGE_FILTRO = 'telfer_anuncios_filtro_status';
  let filtroAtual = 'ativos';

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function statusBruto(cr) {
    return String(cr.status_effective ?? cr.status ?? '').toUpperCase();
  }

  /** ativo | pausado | outro — para agrupar chips */
  function categoriaStatus(status) {
    const st = String(status || '').toUpperCase();
    if (st === 'ACTIVE') return 'ativo';
    if (
      st === 'PAUSED' ||
      st === 'ADSET_PAUSED' ||
      st === 'CAMPAIGN_PAUSED' ||
      st === 'DISAPPROVED' ||
      st === 'PENDING_REVIEW' ||
      st === 'WITH_ISSUES' ||
      st === 'IN_PROCESS' ||
      st === 'ARCHIVED' ||
      st === 'DELETED'
    ) {
      return 'pausado';
    }
    if (!st) return 'outro';
    return 'pausado';
  }

  function passaFiltro(categoria) {
    if (filtroAtual === 'todos') return true;
    if (filtroAtual === 'ativos') return categoria === 'ativo';
    if (filtroAtual === 'pausados') return categoria !== 'ativo';
    return true;
  }

  function rotuloObjetivo(objetivo, nome) {
    if (!objetivo) return '';
    return window.TelferMetricas?.rotuloObjetivo
      ? window.TelferMetricas.rotuloObjetivo(objetivo, nome)
      : objetivo;
  }

  function metricasCampanha(c) {
    const lista = Array.isArray(c.metricas) ? c.metricas : [];
    if (!window.TelferMetricas?.filtrarEssenciais) return lista;
    return window.TelferMetricas.filtrarEssenciais(lista, c);
  }

  function classeBadgeCriativo(status) {
    const st = String(status || '').toUpperCase();
    if (st === 'ACTIVE') return 'badge badge--active';
    if (st === 'PAUSED') return 'badge badge--paused';
    if (st === 'ADSET_PAUSED' || st === 'CAMPAIGN_PAUSED') return 'badge badge--paused-soft';
    return 'badge';
  }

  function rotuloStatusCriativo(status) {
    const st = String(status || '').toUpperCase();
    if (st === 'ACTIVE') return 'Ativo';
    if (st === 'PAUSED') return 'Pausado';
    if (st === 'ADSET_PAUSED') return 'Conjunto pausado';
    if (st === 'CAMPAIGN_PAUSED') return 'Campanha pausada';
    if (st === 'DISAPPROVED') return 'Reprovado';
    if (st === 'PENDING_REVIEW') return 'Em revisão';
    if (st === 'WITH_ISSUES') return 'Com problemas';
    if (st === 'ARCHIVED') return 'Arquivado';
    return status || 'Sem status';
  }

  function htmlMidiaCriativo(cr) {
    if (!window.TelferMedia) return '';
    const urls = window.TelferMedia.urlsCriativo(cr);
    if (urls.isVideo) {
      const href = window.TelferMedia.linkPreviewCriativo(cr);
      if (href) {
        return (
          '<div class="criativo-media criativo-media--link">' +
          '<span class="criativo-tag-video">vídeo</span>' +
          '<a class="criativo-video-link" href="' +
          esc(href) +
          '" target="_blank" rel="noopener noreferrer">Ver anúncio em vídeo ↗</a>' +
          '</div>'
        );
      }
      return (
        '<div class="criativo-media criativo-media--sem-url">' +
        '<span class="criativo-tag-video">vídeo</span>' +
        '<span class="criativo-sem-preview">Link do vídeo indisponível — regenere o relatório.</span>' +
        '</div>'
      );
    }
    return htmlImagemCriativo(cr);
  }

  function htmlImagemCriativo(cr) {
    const urls = window.TelferMedia.urlsCriativo(cr);
    const src = urls.primary || urls.thumbRaw || urls.fallback;
    if (!src) return '';

    const srcset =
      urls.srcset && !urls.isVideo
        ? ' srcset="' + esc(urls.srcset) + '" sizes="(min-width: 900px) 220px, 45vw"'
        : '';
    const dataFb = urls.fallback ? ' data-fallback="' + esc(urls.fallback) + '"' : '';
    const dataThumb = urls.thumbRaw ? ' data-thumb="' + esc(urls.thumbRaw) + '"' : '';

    return (
      '<div class="criativo-media">' +
      '<img class="criativo-img" src="' +
      esc(src) +
      '" data-src-original="' +
      esc(src) +
      '"' +
      srcset +
      dataFb +
      dataThumb +
      ' alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" ' +
      'onerror="TelferMedia.onImgError(this)" />' +
      '</div>'
    );
  }

  function montarHtmlCriativo(cr) {
    const cn = esc(cr.nome ?? cr.name ?? cr.title ?? 'Criativo');
    const adId = cr.ad_id ?? cr.id ?? '';
    const status = statusBruto(cr);
    const categoria = categoriaStatus(status);
    const oculto = !passaFiltro(categoria) ? ' is-filtered-out' : '';

    let html = '<div class="criativo' + oculto + '" data-status="' + esc(status) + '" data-status-cat="' + categoria + '">';
    html += htmlMidiaCriativo(cr);
    html += '<div class="criativo-body">';
    html += '<div class="nome">' + cn + '</div>';
    if (adId) html += '<div class="sub">ID: ' + esc(adId) + '</div>';
    if (status) {
      html +=
        '<span class="' +
        classeBadgeCriativo(status) +
        '">' +
        esc(rotuloStatusCriativo(status)) +
        '</span>';
    }
    html += '</div></div>';
    return html;
  }

  function normalizarCriativos(c) {
    const raw = Array.isArray(c.criativos) ? c.criativos : Array.isArray(c.ads) ? c.ads : [];
    return raw
      .map((cr) => (window.TelferMedia?.normalizarCriativo ? window.TelferMedia.normalizarCriativo(cr) : cr))
      .filter(Boolean);
  }

  function montarHtmlCampanha(c, stats) {
    const nomeRaw = c.nome ?? c.name ?? 'Campanha';
    const nome = esc(nomeRaw);
    const objetivo = c.objetivo ?? c.objective ?? null;
    const criativos = normalizarCriativos(c);

    for (const cr of criativos) {
      const cat = categoriaStatus(statusBruto(cr));
      stats.total += 1;
      if (cat === 'ativo') stats.ativos += 1;
      else stats.pausados += 1;
    }

    const visiveis = criativos.filter((cr) => passaFiltro(categoriaStatus(statusBruto(cr))));
    if (!visiveis.length) return '';

    let html = '<article class="anuncios-campanha">';
    html += '<h3>' + nome + '</h3>';
    if (objetivo) {
      html +=
        '<div class="objetivo">objetivo: <strong>' +
        esc(rotuloObjetivo(objetivo, nomeRaw)) +
        '</strong></div>';
    }

    const metricas = metricasCampanha(c);
    if (metricas.length) {
      html += '<div class="metricas-panel">';
      html += '<span class="metricas-label">Métricas essenciais</span>';
      html += '<ul class="metricas-list metricas-list--readable">';
      for (const m of metricas) {
        let val = m.valor;
        if (m.formato === 'moeda' && Number.isFinite(Number(val))) {
          val =
            'R$ ' +
            Number(val).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
        } else if (m.formato === 'percentual') {
          val = Number(val).toLocaleString('pt-BR') + '%';
        }
        html +=
          '<li><span class="nome-metrica">' +
          esc(m.nome) +
          '</span><span class="valor-metrica">' +
          esc(String(val)) +
          '</span></li>';
      }
      html += '</ul></div>';
    }

    html += '<div class="grid-criativos">';
    for (const cr of criativos) html += montarHtmlCriativo(cr);
    html += '</div>';
    html += '</article>';
    return html;
  }

  function atualizarMeta(stats) {
    if (!filtroMeta) return;
    const partes = [];
    partes.push(stats.ativos + ' ativo' + (stats.ativos === 1 ? '' : 's'));
    if (stats.pausados) {
      partes.push(stats.pausados + ' pausado' + (stats.pausados === 1 ? '' : 's'));
    }
    if (filtroAtual === 'ativos' && stats.pausados) {
      partes.push(stats.pausados + ' oculto' + (stats.pausados === 1 ? '' : 's'));
    }
    filtroMeta.textContent = partes.join(' · ');
    filtroMeta.classList.toggle('is-hidden', !stats.total);
  }

  function sincronizarChipsFiltro() {
    if (!filtroBar) return;
    for (const btn of filtroBar.querySelectorAll('[data-filtro-status]')) {
      const ativo = btn.dataset.filtroStatus === filtroAtual;
      btn.classList.toggle('chip--active', ativo);
      btn.setAttribute('aria-selected', ativo ? 'true' : 'false');
    }
  }

  function aplicarFiltro(novo) {
    if (!novo || novo === filtroAtual) return;
    filtroAtual = novo;
    try {
      sessionStorage.setItem(STORAGE_FILTRO, novo);
    } catch {
      /* ignore */
    }
    sincronizarChipsFiltro();
    render();
  }

  function render() {
    const data = TelferStorage.loadDashboard();

    if (!data?.campanhas?.length && !data?.kpis) {
      container.innerHTML =
        '<div class="empty">Nenhum relatório salvo neste navegador. Clique em <strong>gerar relatório</strong> para começar.</div>';
      if (filtroMeta) filtroMeta.classList.add('is-hidden');
      if (filtroBar) filtroBar.classList.add('is-hidden');
      return;
    }

    const campanhasBrutas = Array.isArray(data.campanhas) ? data.campanhas : [];
    const campanhas = window.TelferMetricas?.filtrarCampanhasComDados
      ? window.TelferMetricas.filtrarCampanhasComDados(campanhasBrutas)
      : campanhasBrutas.filter((c) => !c?._sem_insights_periodo);

    if (!campanhasBrutas.length) {
      container.innerHTML = '<div class="empty">Nenhuma campanha retornada pelo fluxo.</div>';
      if (filtroMeta) filtroMeta.classList.add('is-hidden');
      if (filtroBar) filtroBar.classList.add('is-hidden');
      return;
    }

    if (!campanhas.length) {
      container.innerHTML =
        '<div class="empty">Nenhuma campanha com dados nos últimos 7 dias.</div>';
      if (filtroMeta) filtroMeta.classList.add('is-hidden');
      if (filtroBar) filtroBar.classList.add('is-hidden');
      return;
    }

    if (filtroBar) filtroBar.classList.remove('is-hidden');

    const stats = { total: 0, ativos: 0, pausados: 0 };
    const htmlCampanhas = campanhas.map((c) => montarHtmlCampanha(c, stats)).filter(Boolean);

    if (!htmlCampanhas.length) {
      const msg =
        filtroAtual === 'ativos'
          ? 'Nenhum anúncio <strong>ativo</strong> no relatório. Use o filtro <strong>pausados</strong> ou <strong>todos</strong>.'
          : filtroAtual === 'pausados'
            ? 'Nenhum anúncio pausado neste relatório.'
            : 'Nenhum criativo neste relatório.';
      container.innerHTML = '<div class="empty">' + msg + '</div>';
    } else {
      container.innerHTML = htmlCampanhas.join('');
    }

    atualizarMeta(stats);
    if (filtroMeta) filtroMeta.classList.remove('is-hidden');
  }

  if (filtroBar) {
    try {
      const salvo = sessionStorage.getItem(STORAGE_FILTRO);
      if (salvo === 'ativos' || salvo === 'pausados' || salvo === 'todos') filtroAtual = salvo;
    } catch {
      /* ignore */
    }
    sincronizarChipsFiltro();
    filtroBar.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-filtro-status]');
      if (!btn) return;
      aplicarFiltro(btn.dataset.filtroStatus);
    });
  }

  window.addEventListener('telfer:dashboard-updated', render);
  window.addEventListener('telfer:dashboard-cleared', () => {
    container.innerHTML =
      '<div class="empty">Painel limpo. Clique em <strong>gerar relatório</strong> para começar.</div>';
    if (filtroMeta) filtroMeta.classList.add('is-hidden');
    if (filtroBar) filtroBar.classList.add('is-hidden');
  });

  render();
})();
