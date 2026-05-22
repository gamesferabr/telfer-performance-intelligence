/**
 * Página de análise de criativos — lê dados do TelferStorage.
 */
(function () {
  function esc(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function htmlImagemCriativo(cr) {
    const urls = TelferMedia.urlsCriativo(cr);
    const src = urls.primary || urls.thumbRaw || urls.fallback;
    if (!src) return '';

    const srcset =
      urls.srcset && !urls.isVideo
        ? ' srcset="' + esc(urls.srcset) + '" sizes="(min-width: 900px) 320px, 50vw"'
        : '';
    const dataFb = urls.fallback
      ? ' data-fallback="' + esc(urls.fallback) + '"'
      : '';
    const dataThumb = urls.thumbRaw
      ? ' data-thumb="' + esc(urls.thumbRaw) + '"'
      : '';
    const tagVideo = urls.isVideo
      ? '<span class="criativo-tag-video" aria-hidden="true">vídeo</span>'
      : '';

    return (
      '<div class="criativo-media">' +
      tagVideo +
      '<img class="criativo-img" src="' +
      esc(src) +
      '" data-src-original="' +
      esc(src) +
      '"' +
      srcset +
      dataFb +
      dataThumb +
      ' alt="" loading="lazy" decoding="async" ' +
      'onerror="TelferMedia.onImgError(this)" />' +
      '</div>'
    );
  }

  function load() {
    const data = TelferStorage.loadDashboard();
    const filters = TelferStorage.loadFilters();
    const root = document.getElementById('root');
    const periodoEl = document.getElementById('periodoMeta');
    const objEl = document.getElementById('filtroObjetivoMeta');

    if (!data?.campanhas?.length && !data?.kpis) {
      root.innerHTML =
        '<div class="empty">Nenhum relatório salvo. Gere o relatório na <a href="index.html">página inicial</a> e volte aqui (os dados ficam guardados no navegador).</div>';
      return;
    }

    if (filters && (filters.data_inicio || filters.data_fim)) {
      periodoEl.textContent =
        'Período: ' + (filters.data_inicio || '—') + ' a ' + (filters.data_fim || '—');
    } else {
      periodoEl.textContent = '';
    }

    if (filters && filters.objetivo) {
      objEl.textContent = 'Objetivo filtrado: ' + filters.objetivo;
    } else {
      objEl.textContent = 'Objetivo: todos';
    }

    const campanhas = Array.isArray(data.campanhas) ? data.campanhas : [];
    if (!campanhas.length) {
      root.innerHTML =
        '<div class="empty">Nenhuma campanha retornada pelo fluxo.</div>';
      return;
    }

    let html = '';
    for (const c of campanhas) {
      const nome = esc(c.nome ?? c.name ?? 'Campanha');
      const objetivo = c.objetivo ?? c.objective ?? null;
      const criativos = Array.isArray(c.criativos)
        ? c.criativos
        : Array.isArray(c.ads)
          ? c.ads
          : [];

      html += '<article class="campanha campanha-analise">';
      html += '<h2>' + nome + '</h2>';
      if (objetivo) {
        html +=
          '<div class="objetivo">Objetivo Meta: <code>' + esc(objetivo) + '</code></div>';
      }

      const metricas = Array.isArray(c.metricas) ? c.metricas : [];
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
        html +=
          '<div class="empty empty--inline">Sem criativos neste payload. Atualize o n8n com <code>image_url</code> no campo <code>creative</code>.</div>';
      } else {
        html += '<div class="grid-criativos">';
        for (const cr of criativos) {
          const cn = esc(cr.nome ?? cr.name ?? cr.title ?? 'Criativo');
          const adId = cr.ad_id ?? cr.id ?? '';
          const status = cr.status_effective ?? cr.status ?? '';
          html += '<div class="criativo">';
          html += htmlImagemCriativo(cr);
          html += '<div class="criativo-body">';
          html += '<div class="nome">' + cn + '</div>';
          if (adId) html += '<div class="sub">ID anúncio: ' + esc(adId) + '</div>';
          if (status) html += '<span class="badge">' + esc(status) + '</span>';
          html += '</div></div>';
        }
        html += '</div>';
      }
      html += '</article>';
    }
    root.innerHTML = html;
  }

  load();
})();
