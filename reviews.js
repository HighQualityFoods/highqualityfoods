// reviews.js — öffentliche Anzeige der freigegebenen Bewertungen
// Rendert in ein Element mit id="hqf-reviews". Braucht config.js (SUPABASE_URL/KEY) davor.
(function () {
  var mount = document.getElementById('hqf-reviews');
  if (!mount) return;
  if (!window.SUPABASE_URL || !window.SUPABASE_KEY) return;

  var variant = mount.getAttribute('data-variant') || 'light'; // 'light' (beige) | 'dark' (navy)

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function stars(n){
    n = Math.max(0, Math.min(5, Math.round(n)));
    return '<span class="hqf-rev-stars">' + '★'.repeat(n) + '<span class="hqf-rev-empty">' + '★'.repeat(5-n) + '</span></span>';
  }

  // Styles (einmalig)
  if (!document.getElementById('hqf-rev-style')) {
    var css = document.createElement('style');
    css.id = 'hqf-rev-style';
    css.textContent = [
      '#hqf-reviews{max-width:1100px;margin:0 auto;padding:0 24px;}',
      '#hqf-reviews .hqf-rev-inner{opacity:0;transition:opacity .4s;}',
      '#hqf-reviews.ready .hqf-rev-inner{opacity:1;}',
      '#hqf-reviews .hqf-rev-head{text-align:center;margin-bottom:36px;}',
      "#hqf-reviews .hqf-rev-kicker{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#8fa8b8;margin-bottom:12px;}",
      "#hqf-reviews .hqf-rev-title{font-family:'Playfair Display',serif;font-weight:500;font-size:34px;line-height:1.2;margin-bottom:16px;}",
      '#hqf-reviews .hqf-rev-avg{display:inline-flex;align-items:center;gap:14px;}',
      "#hqf-reviews .hqf-rev-avgnum{font-family:'Bebas Neue',sans-serif;font-size:44px;line-height:1;letter-spacing:1px;color:#1a2332;}",
      '#hqf-reviews .hqf-rev-stars{color:#e9963c;font-size:24px;letter-spacing:2px;}',
      '#hqf-reviews .hqf-rev-empty{color:rgba(26,35,50,.18);}',
      '#hqf-reviews .hqf-rev-count{font-size:14px;color:rgba(26,35,50,.5);margin-top:10px;}',
      '#hqf-reviews .hqf-rev-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:18px;}',
      '#hqf-reviews .hqf-rev-card{background:#fdfcfa;border:1px solid #ece5d9;border-radius:12px;padding:22px 24px;display:flex;flex-direction:column;}',
      '#hqf-reviews .hqf-rev-card .hqf-rev-stars{font-size:16px;margin-bottom:10px;}',
      '#hqf-reviews .hqf-rev-text{font-size:15px;line-height:1.7;color:#3a4454;font-weight:300;flex:1;}',
      '#hqf-reviews .hqf-rev-name{margin-top:14px;font-size:13px;font-weight:500;color:#1a2332;}',
      '#hqf-reviews .hqf-rev-name::before{content:"— ";color:#8fa8b8;}',
      // dark variant (navy section)
      '#hqf-reviews[data-variant="dark"] .hqf-rev-title{color:#f5f2ec;}',
      '#hqf-reviews[data-variant="dark"] .hqf-rev-avgnum{color:#8fa8b8;}',
      '#hqf-reviews[data-variant="dark"] .hqf-rev-empty{color:rgba(255,255,255,.2);}',
      '#hqf-reviews[data-variant="dark"] .hqf-rev-count{color:rgba(245,242,236,.55);}',
      '#hqf-reviews[data-variant="dark"] .hqf-rev-card{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.1);}',
      '#hqf-reviews[data-variant="dark"] .hqf-rev-text{color:#d7dce3;}',
      '#hqf-reviews[data-variant="dark"] .hqf-rev-name{color:#f5f2ec;}',
      '@media(max-width:700px){#hqf-reviews .hqf-rev-title{font-size:27px;}}'
    ].join('');
    document.head.appendChild(css);
  }

  fetch(window.SUPABASE_URL + '/rest/v1/reviews?select=name,stars,text,created_at&approved=eq.true&order=created_at.desc', {
    headers: { apikey: window.SUPABASE_KEY, Authorization: 'Bearer ' + window.SUPABASE_KEY }
  })
  .then(function(r){ return r.ok ? r.json() : []; })
  .then(function(rows){
    if (!rows || !rows.length) { mount.style.display = 'none'; return; }
    var limit = parseInt(mount.getAttribute('data-limit') || '6', 10);
    var shown = rows.slice(0, limit);
    var avg = rows.reduce(function(s,r){ return s + (r.stars||0); }, 0) / rows.length;
    var cards = shown.map(function(r){
      return '<div class="hqf-rev-card">' +
        stars(r.stars) +
        (r.text ? '<div class="hqf-rev-text">' + esc(r.text) + '</div>' : '<div class="hqf-rev-text"></div>') +
        '<div class="hqf-rev-name">' + esc(r.name || 'Anonym') + '</div>' +
      '</div>';
    }).join('');
    mount.innerHTML =
      '<div class="hqf-rev-inner">' +
        '<div class="hqf-rev-head">' +
          '<div class="hqf-rev-kicker">Das sagen meine Kunden</div>' +
          '<div class="hqf-rev-avg">' +
            '<span class="hqf-rev-avgnum">' + avg.toFixed(1).replace('.', ',') + '</span>' +
            stars(avg) +
          '</div>' +
          '<div class="hqf-rev-count">' + rows.length + ' Bewertung' + (rows.length === 1 ? '' : 'en') + '</div>' +
        '</div>' +
        '<div class="hqf-rev-grid">' + cards + '</div>' +
      '</div>';
    requestAnimationFrame(function(){ mount.classList.add('ready'); });
  })
  .catch(function(){ mount.style.display = 'none'; });
})();
