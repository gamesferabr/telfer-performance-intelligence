/**
 * Persistência compartilhada entre index.html e analise.html
 * (localStorage + sessionStorage — sobrevive à navegação entre páginas)
 */
(function (global) {
  const KEYS = {
    DASHBOARD: 'telfer_dashboard',
    FILTERS: 'telfer_filters',
    OBJECTIVES: 'telfer_objetivos',
    SAVED_AT: 'telfer_saved_at',
  };

  function write(key, value) {
    const s = typeof value === 'string' ? value : JSON.stringify(value);
    try {
      localStorage.setItem(key, s);
    } catch (e) {
      console.warn('localStorage', key, e);
    }
    try {
      sessionStorage.setItem(key, s);
    } catch (e) {
      console.warn('sessionStorage', key, e);
    }
  }

  function read(key) {
    let raw = null;
    try {
      raw = localStorage.getItem(key);
    } catch (e) {
      /* ignore */
    }
    if (raw == null) {
      try {
        raw = sessionStorage.getItem(key);
      } catch (e) {
        /* ignore */
      }
    }
    return raw;
  }

  function parseJson(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  const TelferStorage = {
    KEYS,

    saveDashboard(data, filters) {
      if (!data) return;
      write(KEYS.DASHBOARD, data);
      write(KEYS.SAVED_AT, new Date().toISOString());
      if (filters) write(KEYS.FILTERS, filters);
    },

    loadDashboard() {
      return parseJson(read(KEYS.DASHBOARD));
    },

    loadFilters() {
      return parseJson(read(KEYS.FILTERS));
    },

    saveFilters(filters) {
      if (!filters) return;
      write(KEYS.FILTERS, filters);
    },

    saveObjectives(payload) {
      if (!payload) return;
      write(KEYS.OBJECTIVES, {
        ...payload,
        cached_at: new Date().toISOString(),
      });
    },

    loadObjectives() {
      return parseJson(read(KEYS.OBJECTIVES));
    },

    hasDashboard() {
      return Boolean(read(KEYS.DASHBOARD));
    },

    loadSavedAt() {
      return read(KEYS.SAVED_AT);
    },

    clearDashboard() {
      for (const key of [KEYS.DASHBOARD, KEYS.SAVED_AT]) {
        try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
        try { sessionStorage.removeItem(key); } catch (e) { /* ignore */ }
      }
    },
  };

  global.TelferStorage = TelferStorage;
})(typeof window !== 'undefined' ? window : globalThis);
