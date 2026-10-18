// partners.js — „Stolzer Partner von"-Bereich
// Rendert in ein Element mit id="hqf-partners". Neue Partner einfach unten in PARTNERS ergänzen.
(function () {
  var mount = document.getElementById('hqf-partners');
  if (!mount) return;

  var PARTNERS = [
    {
      name1: 'MAJORS', name2: 'GOLFBOX', color2: '#db6420',
      logo: 'partners/majors-golfbox.png',
      url: 'https://majorsgolfbox.de/'
    }
  ];

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }

  // ── Styles + Schrift (einmalig) ──
  if (!document.getElementById('hqf-partner-style')) {
    var font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Poppins:wght@700&display=swap';
    document.head.appendChild(font);

    var css = document.createElement('style');
    css.id = 'hqf-partner-style';
    css.textContent = [
      '#hqf-partners{text-align:center;padding:0 24px;}',
      '#hqf-partners .hqf-p-kicker{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#8fa8b8;margin-bottom:18px;}',
      '#hqf-partners .hqf-p-list{display:flex;flex-wrap:wrap;justify-content:center;gap:16px;}',
      '#hqf-partners .hqf-p-card{display:inline-flex;align-items:center;gap:16px;background:#fff;border-radius:14px;padding:14px 24px 14px 14px;text-decoration:none;box-shadow:0 2px 12px rgba(26,35,50,.08);transition:transform .3s cubic-bezier(.22,.68,0,1.2),box-shadow .3s ease;}',
      '#hqf-partners .hqf-p-card:hover{transform:translateY(-4px);box-shadow:0 14px 34px rgba(26,35,50,.14);}',
      '#hqf-partners .hqf-p-logo{width:44px;height:44px;border-radius:10px;flex-shrink:0;display:block;}',
      '#hqf-partners .hqf-p-text{text-align:left;}',
      "#hqf-partners .hqf-p-name{font-family:'Poppins','Inter',sans-serif;font-weight:700;font-size:21px;letter-spacing:.5px;line-height:1.1;color:#1a2332;}",
      '#hqf-partners .hqf-p-sub{font-size:13px;color:rgba(26,35,50,.55);font-weight:300;margin-top:4px;}'
    ].join('');
    document.head.appendChild(css);
  }

  mount.innerHTML =
    '<div class="hqf-p-kicker">Stolzer Partner von</div>' +
    '<div class="hqf-p-list">' +
    PARTNERS.map(function (p) {
      return '<a class="hqf-p-card" href="' + esc(p.url) + '" target="_blank" rel="noopener">' +
        '<img class="hqf-p-logo" src="' + esc(p.logo) + '" alt="' + esc(p.name1 + ' ' + p.name2) + ' Logo" width="44" height="44" loading="lazy">' +
        '<span class="hqf-p-text">' +
          '<span class="hqf-p-name">' + esc(p.name1) + ' <span style="color:' + esc(p.color2) + '">' + esc(p.name2) + '</span></span>' +
          (p.sub ? '<span class="hqf-p-sub" style="display:block">' + esc(p.sub) + '</span>' : '') +
        '</span>' +
      '</a>';
    }).join('') +
    '</div>';
})();
