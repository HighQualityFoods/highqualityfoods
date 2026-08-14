// db.js — Supabase sync layer

window._memStore = {};
window.store = {
  getItem: function(k) {
    if (window._memStore[k] !== undefined) return window._memStore[k];
    try { var v = sessionStorage.getItem(k); if (v !== null) return v; } catch(e) {}
    try { var v = localStorage.getItem(k); if (v !== null) return v; } catch(e) {}
    return null;
  },
  setItem: function(k, v) {
    window._memStore[k] = v;
    try { sessionStorage.setItem(k, v); } catch(e) {}
    try { localStorage.setItem(k, v); } catch(e) {
      // Fallback: strip any leftover base64 images if quota exceeded
      try {
        var arr = JSON.parse(v);
        if (Array.isArray(arr)) {
          var stripped = JSON.stringify(arr.map(function(r) {
            if (!r || typeof r !== 'object') return r;
            if (r.img && r.img.startsWith('data:')) { var c = Object.assign({}, r); delete c.img; return c; }
            return r;
          }));
          localStorage.setItem(k, stripped);
        }
      } catch(e2) {}
    }
  },
  removeItem: function(k) {
    try { localStorage.removeItem(k); } catch(e) {}
    try { sessionStorage.removeItem(k); } catch(e) {}
    delete window._memStore[k];
  }
};

(function () {
  function isConfigured() {
    return window.SUPABASE_URL &&
      window.SUPABASE_URL !== 'DEINE_SUPABASE_URL' &&
      window.SUPABASE_KEY &&
      window.SUPABASE_KEY !== 'DEIN_ANON_KEY';
  }

  async function req(method, path, body) {
    if (!isConfigured()) return null;
    try {
      const r = await fetch(`${window.SUPABASE_URL}/rest/v1/${path}`, {
        method,
        headers: {
          apikey: window.SUPABASE_KEY,
          Authorization: `Bearer ${window.SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation,resolution=merge-duplicates'
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
      if (!r.ok) { console.warn('[db] Supabase error', r.status, await r.text()); return null; }
      if (r.status === 204) return true;
      return r.json();
    } catch (e) { console.warn('[db] fetch error', e); return null; }
  }

  // Strip base64 images before Supabase upload (URLs are fine, only old base64 data gets stripped)
  function stripBase64Images(value) {
    if (!Array.isArray(value)) return value;
    return value.map(function(r) {
      if (!r || typeof r !== 'object') return r;
      if (r.img && r.img.startsWith('data:')) {
        var copy = Object.assign({}, r);
        delete copy.img;
        return copy;
      }
      return r;
    });
  }

  window.db = {
    async sync(lsKey) {
      if (!isConfigured()) return;
      const rows = await req('GET', 'kv_store?key=eq.' + lsKey + '&select=value');
      if (!rows || rows.length === 0) return;
      var remote = rows[0].value;
      var localRaw = window.store.getItem(lsKey);
      if (Array.isArray(remote) && localRaw) {
        try {
          var local = JSON.parse(localRaw);
          if (Array.isArray(local) && local.length > remote.length) {
            await req('POST', 'kv_store', { key: lsKey, value: stripBase64Images(local) });
            return;
          }
        } catch(e) {}
      }
      window.store.setItem(lsKey, JSON.stringify(remote));
    },

    async save(lsKey) {
      if (!isConfigured()) return;
      var raw = window.store.getItem(lsKey);
      if (raw === null) return;
      try {
        var value = JSON.parse(raw);
        await req('POST', 'kv_store', { key: lsKey, value: stripBase64Images(value) });
      } catch(e) {}
    },

    configured: isConfigured
  };

  // Seed store from HQF_SEED (set by data.js which loads before db.js)
  if (window.HQF_SEED) {
    Object.keys(window.HQF_SEED).forEach(function(k) {
      var cur = window.store.getItem(k);
      try { var p = JSON.parse(cur); if (Array.isArray(p) && p.length > 0) return; } catch(e) {}
      window.store.setItem(k, JSON.stringify(window.HQF_SEED[k]));
    });
  }
})();
