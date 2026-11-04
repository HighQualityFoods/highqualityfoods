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

  // ── Admin-Auth über Supabase Auth ──
  // Login nur über /admin.html. Das Token liegt in der sessionStorage dieses Tabs
  // und läuft nach spätestens 1 h ab. Schreibrechte prüft Supabase serverseitig (RLS).
  var SESSION_KEY = 'hqf_admin_session';
  function readSession() {
    try {
      var s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      if (s && s.token && s.exp && s.exp * 1000 > Date.now() + 30000) return s;
      if (s) sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
    return null;
  }
  function jwtExp(t) {
    try { return JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).exp || 0; } catch (e) { return 0; }
  }
  var _sess = readSession();
  window._hqfToken = _sess ? _sess.token : null;

  // Login: gibt true bei Erfolg, false bei falschen Zugangsdaten
  window.hqfLogin = async function (email, password) {
    if (!isConfigured()) return false;
    try {
      const r = await fetch(window.SUPABASE_URL + '/auth/v1/token?grant_type=password', {
        method: 'POST',
        headers: { apikey: window.SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: password })
      });
      if (!r.ok) return false;
      const d = await r.json();
      if (!d || !d.access_token) return false;
      window._hqfToken = d.access_token;
      try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: d.access_token, exp: jwtExp(d.access_token) })); } catch (e) {}
      return true;
    } catch (e) { return false; }
  };
  window.hqfLogout = function () {
    var t = window._hqfToken;
    window._hqfToken = null;
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
    if (t && isConfigured()) {
      try { fetch(window.SUPABASE_URL + '/auth/v1/logout', { method: 'POST', headers: { apikey: window.SUPABASE_KEY, Authorization: 'Bearer ' + t } }); } catch (e) {}
    }
  };
  window.hqfLoggedIn = function () {
    if (!readSession()) { window._hqfToken = null; return false; }
    return !!window._hqfToken;
  };
  // Admin-Oberflächen liegen in <template data-admin>; sie werden nur für eingeloggte
  // Admins in die Seite eingesetzt und sind für Besucher weder sichtbar noch im Text.
  window.hqfMountAdmin = function () {
    if (!window.hqfLoggedIn()) return false;
    document.querySelectorAll('template[data-admin]').forEach(function (t) {
      t.replaceWith(t.content.cloneNode(true));
    });
    return true;
  };
  // Header für Schreibzugriffe: nutzt Login-Token wenn vorhanden, sonst anon
  window.hqfWriteHeaders = function (extra) {
    var h = { apikey: window.SUPABASE_KEY, Authorization: 'Bearer ' + (window._hqfToken || window.SUPABASE_KEY) };
    if (extra) { for (var k in extra) h[k] = extra[k]; }
    return h;
  };

  async function req(method, path, body) {
    if (!isConfigured()) return null;
    try {
      const r = await fetch(`${window.SUPABASE_URL}/rest/v1/${path}`, {
        method,
        headers: {
          apikey: window.SUPABASE_KEY,
          Authorization: `Bearer ${window._hqfToken || window.SUPABASE_KEY}`,
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
      // Supabase ist maßgeblich: lokale Kopien werden nie zurückgeschrieben
      window.store.setItem(lsKey, JSON.stringify(rows[0].value));
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
