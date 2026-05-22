/**
 * URLs de preview de criativos Meta.
 * Vídeo: thumb nativa primeiro (qualidade baixa OK). Imagem: tenta HD com fallback.
 */
(function (global) {
  function normalizarCriativo(cr) {
    if (!cr || typeof cr !== 'object') return null;
    const ad_id = String(cr.ad_id || cr.id || '');
    const thumbnail_url = cr.thumbnail_url || cr.thumbnail || '';
    const image_url = cr.image_url || cr.url_imagem || '';
    const video_id = cr.video_id || null;
    return {
      ad_id,
      nome: cr.nome || cr.name || cr.title || 'Anúncio',
      status: cr.status || cr.effective_status || cr.status_effective || '',
      thumbnail_url,
      image_url,
      video_id,
      tipo: cr.tipo || (video_id ? 'video' : 'imagem'),
    };
  }

  function ampliarUrlFacebook(url) {
    if (!url || typeof url !== 'string') return url;

    let u = url;
    const tamanhos = [
      [/p64x64/gi, 'p320x320'],
      [/p75x75/gi, 'p320x320'],
      [/p130x130/gi, 'p320x320'],
      [/s64x64/gi, 's320x320'],
      [/s75x75/gi, 's320x320'],
      [/s130x130/gi, 's320x320'],
    ];
    for (const [re, rep] of tamanhos) u = u.replace(re, rep);

    try {
      const parsed = new URL(u);
      for (const key of ['width', 'height', 'w', 'h']) {
        if (parsed.searchParams.has(key)) {
          const n = parseInt(parsed.searchParams.get(key), 10);
          if (n > 0 && n < 200) parsed.searchParams.set(key, '480');
        }
      }
      u = parsed.toString();
    } catch {
      /* ignore */
    }
    return u;
  }

  function urlsCriativo(cr) {
    const row = normalizarCriativo(cr) || cr;
    if (!row || typeof row !== 'object') {
      return {
        primary: null,
        fallback: null,
        thumbRaw: null,
        srcset: '',
        isVideo: false,
      };
    }

    const thumb = row.thumbnail_url || row.thumbnail || null;
    const image = row.image_url || row.url_imagem || null;
    const picture = row.picture_url || row.picture || null;
    const preview = row.preview_url || null;
    const isVideo = Boolean(row.video_id || row.tipo === 'video');

    const todas = [thumb, image, picture, preview].filter(Boolean);
    if (!todas.length) {
      return {
        primary: null,
        fallback: null,
        thumbRaw: null,
        srcset: '',
        isVideo,
      };
    }

    function primeiroDiferente(de, lista) {
      return lista.find((u) => u && u !== de) || null;
    }

    if (isVideo) {
      const primary = thumb || image || picture || preview;
      const fallback = primeiroDiferente(primary, [image, picture, preview, thumb]);
      return {
        primary,
        fallback,
        thumbRaw: thumb,
        srcset: '',
        isVideo: true,
      };
    }

    const primaryRaw = image || picture || preview || thumb;
    const fallbackRaw = primeiroDiferente(primaryRaw, [thumb, preview, picture, image]);

    let srcset = '';
    if (image && thumb && image !== thumb) {
      srcset = thumb + ' 320w, ' + ampliarUrlFacebook(image) + ' 640w';
    }

    return {
      primary: ampliarUrlFacebook(primaryRaw),
      fallback: fallbackRaw,
      thumbRaw: thumb,
      srcset,
      isVideo: false,
    };
  }

  function onImgError(img) {
    if (!img) return;

    const fila = [];
    const add = (u) => {
      if (u && !fila.includes(u)) fila.push(u);
    };

    add(img.getAttribute('data-fallback'));
    add(img.getAttribute('data-thumb'));
    add(img.getAttribute('data-src-original'));

    const idx = Number(img.dataset.errTry || 0);
    if (idx < fila.length) {
      img.dataset.errTry = String(idx + 1);
      img.removeAttribute('srcset');
      img.src = fila[idx];
      return;
    }

    img.style.display = 'none';
    const wrap = img.closest('.criativo-media');
    if (wrap) wrap.classList.add('criativo-media--empty');
  }

  global.TelferMedia = {
    normalizarCriativo,
    ampliarUrlFacebook,
    urlsCriativo,
    onImgError,
  };
})(typeof window !== 'undefined' ? window : globalThis);
