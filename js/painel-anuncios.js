/**
 * Painel de anúncios — renderiza criativos por campanha dentro do index.html
 * (mantém analise.html standalone funcionando inalterado).
 * Re-renderiza em resposta ao evento 'telfer:dashboard-updated'.
 */
(function () {
  const container = document.getElementById('anunciosContainer');
  if (!container) return;

  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
    return 'badge';
  }

  function rotuloStatusCriativo(status) {
    const st = String(status || '').toUpperCase();
    if (st === 'ACTIVE') return 'Ativo';
    if (st === 'PAUSED') return 'Pausado';
    if (st === 'ADSET_PAUSED') return 'Conjunto pausado';
    if (st === 'CAMPAIGN_PAUSED') return 'Campanha pausada';
    return status;
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
    const status = cr.status_effective ?? cr.status ?? '';
    let html = '<div class="criativo">';
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

  function montarHtmlCampanha(c) {
    const nomeRaw = c.nome ?? c.name ?? 'Campanha';
    const nome = esc(nomeRaw);
    const objetivo = c.objetivo ?? c.objective ?? null;
    const rawCriativos = Array.isArray(c.criativos)
      ? c.criativos
      : Array.isArray(c.ads)
        ? c.ads
        : [];
    const criativos = rawCriativos
      .map((cr) => (window.TelferMedia?.normalizarCriativo ? window.TelferMedia.normalizarCriativo(cr) : cr))
      .filter(Boolean);

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

    if (!criativos.length) {
      html += '<div class="empty empty--inline">Sem criativos neste payload.</div>';
    } else {
      html += '<div class="grid-criativos">';
      for (const cr of criativos) html += montarHtmlCriativo(cr);
      html += '</div>';
    }
    html += '</article>';
    return html;
  }

  function render() {
    const data = TelferStorage.loadDashboard();

    if (!data?.campanhas?.length && !data?.kpis) {
      container.innerHTML =
        '<div class="empty">Nenhum relatório salvo neste navegador. Clique em <strong>gerar relatório</strong> para começar.</div>';
      return;
    }

    const campanhasBrutas = Array.isArray(data.campanhas) ? data.campanhas : [];
    const campanhas = window.TelferMetricas?.filtrarCampanhasComDados
      ? window.TelferMetricas.filtrarCampanhasComDados(campanhasBrutas)
      : campanhasBrutas.filter((c) => !c?._sem_insights_periodo);

    if (!campanhasBrutas.length) {
      container.innerHTML = '<div class="empty">Nenhuma campanha retornada pelo fluxo.</div>';
      return;
    }

    if (!campanhas.length) {
      container.innerHTML =
        '<div class="empty">Nenhuma campanha com dados nos últimos 7 dias.</div>';
      return;
    }

    container.innerHTML = campanhas.map(montarHtmlCampanha).join('');
  }

  window.addEventListener('telfer:dashboard-updated', render);
  window.addEventListener('telfer:dashboard-cleared', () => {
    container.innerHTML =
      '<div class="empty">Painel limpo. Clique em <strong>gerar relatório</strong> para começar.</div>';
  });

  render();
})();
