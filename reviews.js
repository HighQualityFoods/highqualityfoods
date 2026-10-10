// reviews.js — öffentliche Anzeige der freigegebenen Bewertungen als Slideshow
// Rendert in ein Element mit id="hqf-reviews". Braucht config.js (SUPABASE_URL/KEY) davor.
(function () {
  var mount = document.getElementById('hqf-reviews');
  if (!mount) return;
  if (!window.SUPABASE_URL || !window.SUPABASE_KEY) return;

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function stars(n){
    n = Math.max(0, Math.min(5, Math.round(n)));
    return '<span class="hqf-rev-stars">' + '★'.repeat(n) + '<span class="hqf-rev-empty">' + '★'.repeat(5-n) + '</span></span>';
  }

  // ── Styles (einmalig) ──
  if (!document.getElementById('hqf-rev-style')) {
    var css = document.createElement('style');
    css.id = 'hqf-rev-style';
    css.textContent = [
      '#hqf-reviews{max-width:1100px;margin:0 auto;}',
      '#hqf-reviews .hqf-rev-inner{opacity:0;transition:opacity .4s;}',
      '#hqf-reviews.ready .hqf-rev-inner{opacity:1;}',
      '#hqf-reviews .hqf-rev-head{text-align:center;margin-bottom:30px;padding:0 24px;}',
      "#hqf-reviews .hqf-rev-kicker{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#8fa8b8;margin-bottom:12px;}",
      '#hqf-reviews .hqf-rev-avg{display:inline-flex;align-items:center;gap:14px;}',
      "#hqf-reviews .hqf-rev-avgnum{font-family:'Bebas Neue',sans-serif;font-size:44px;line-height:1;letter-spacing:1px;color:#1a2332;}",
      '#hqf-reviews .hqf-rev-stars{color:#e9963c;font-size:24px;letter-spacing:2px;}',
      '#hqf-reviews .hqf-rev-empty{color:rgba(26,35,50,.18);}',
      '#hqf-reviews .hqf-rev-count{font-size:14px;color:rgba(26,35,50,.5);margin-top:10px;}',
      // Slideshow
      '#hqf-reviews .hqf-rev-wrap{width:100%;overflow:hidden;}',
      '@keyframes hqf-rev-scroll{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}',
      '#hqf-reviews .hqf-rev-track{display:flex;gap:20px;width:max-content;animation:hqf-rev-scroll 40s linear infinite;padding:8px 24px;}',
      '#hqf-reviews .hqf-rev-track.paused{animation-play-state:paused;}',
      '#hqf-reviews .hqf-rev-card{width:300px;flex-shrink:0;background:#fff;border-radius:14px;padding:24px 26px;box-shadow:0 2px 12px rgba(26,35,50,.1);display:flex;flex-direction:column;min-height:214px;box-sizing:border-box;transition:transform .3s cubic-bezier(.22,.68,0,1.2),box-shadow .3s ease;}',
      '#hqf-reviews .hqf-rev-card:hover{transform:translateY(-5px);box-shadow:0 16px 40px rgba(26,35,50,.16);}',
      '#hqf-reviews .hqf-rev-card .hqf-rev-stars{font-size:16px;margin-bottom:12px;}',
      '#hqf-reviews .hqf-rev-text{font-size:15px;line-height:1.65;color:#3a4454;font-weight:300;flex:1;display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden;}',
      '#hqf-reviews .hqf-rev-name{margin-top:16px;font-size:13px;font-weight:500;color:#1a2332;}',
      '#hqf-reviews .hqf-rev-name::before{content:"— ";color:#8fa8b8;}',
      // Scrollbar
      '#hqf-reviews .hqf-rev-bar{margin:20px auto 0;width:calc(100% - 80px);max-width:560px;height:4px;background:#e8e3db;border-radius:2px;position:relative;cursor:pointer;}',
      '#hqf-reviews .hqf-rev-thumb{position:absolute;top:0;left:0;width:80px;height:4px;background:#1a2332;border-radius:2px;transition:left .1s linear;cursor:grab;}',
      '#hqf-reviews .hqf-rev-thumb:active{cursor:grabbing;}',
      // Dark variant
      '#hqf-reviews[data-variant="dark"] .hqf-rev-title{color:#f5f2ec;}',
      '#hqf-reviews[data-variant="dark"] .hqf-rev-avgnum{color:#8fa8b8;}',
      '#hqf-reviews[data-variant="dark"] .hqf-rev-empty{color:rgba(255,255,255,.2);}',
      '#hqf-reviews[data-variant="dark"] .hqf-rev-count{color:rgba(245,242,236,.55);}',
      '#hqf-reviews[data-variant="dark"] .hqf-rev-text{color:#3a4454;}',
      '#hqf-reviews[data-variant="dark"] .hqf-rev-bar{background:rgba(255,255,255,.14);}',
      '#hqf-reviews[data-variant="dark"] .hqf-rev-thumb{background:#8fa8b8;}',
      '@media(max-width:700px){#hqf-reviews .hqf-rev-card{width:260px;}}'
    ].join('');
    document.head.appendChild(css);
  }

  fetch(window.SUPABASE_URL + '/rest/v1/reviews?select=name,stars,text,created_at&approved=eq.true&order=created_at.desc', {
    headers: { apikey: window.SUPABASE_KEY, Authorization: 'Bearer ' + window.SUPABASE_KEY }
  })
  .then(function(r){ return r.ok ? r.json() : []; })
  .then(function(rows){
    if (!rows || !rows.length) { mount.style.display = 'none'; return; }
    var avg = rows.reduce(function(s,r){ return s + (r.stars||0); }, 0) / rows.length;
    var unique = rows.slice(0, 12);

    function cardHTML(r){
      return '<div class="hqf-rev-card">' +
        stars(r.stars) +
        '<div class="hqf-rev-text">' + esc(r.text || '') + '</div>' +
        '<div class="hqf-rev-name">' + esc(r.name || 'Anonym') + '</div>' +
      '</div>';
    }

    // Für nahtlose Endlos-Schleife: Set mehrfach duplizieren (gerade Anzahl)
    var times = Math.max(4, Math.ceil(20 / unique.length));
    var all = [];
    for (var i = 0; i < times * 2; i++) all = all.concat(unique);

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
        '<div class="hqf-rev-wrap"><div class="hqf-rev-track">' + all.map(cardHTML).join('') + '</div></div>' +
        '<div class="hqf-rev-bar"><div class="hqf-rev-thumb"></div></div>' +
      '</div>';

    initSlideshow(unique.length * times);
    requestAnimationFrame(function(){ mount.classList.add('ready'); });
  })
  .catch(function(){ mount.style.display = 'none'; });

  // ── Slideshow-Logik (analog zur Rezept-Slideshow der Startseite) ──
  function initSlideshow(halfCount){
    var track = mount.querySelector('.hqf-rev-track');
    var bar = mount.querySelector('.hqf-rev-bar');
    var thumb = mount.querySelector('.hqf-rev-thumb');
    if (!track || !bar || !thumb) return;

    var SEC_PER_CARD = 4.5;
    track.style.animationDuration = (halfCount * SEC_PER_CARD) + 's';

    // Pause bei Hover
    track.addEventListener('mouseenter', function(){ track.classList.add('paused'); });
    track.addEventListener('mouseleave', function(){ if (!thumbDragging) track.classList.remove('paused'); });

    // Thumb mit Animationsfortschritt synchronisieren
    function getAnimProgress(){
      var dur = parseFloat(track.style.animationDuration) * 1000;
      return (performance.now() % dur) / dur;
    }
    setInterval(function(){
      if (!thumbDragging && !touchActive) {
        var maxLeft = bar.offsetWidth - thumb.offsetWidth;
        thumb.style.left = (getAnimProgress() * maxLeft) + 'px';
      }
    }, 50);

    // Thumb ziehen
    var thumbDragging = false, thumbStartX = 0, thumbStartLeft = 0;
    thumb.addEventListener('mousedown', function(e){
      thumbDragging = true;
      thumbStartX = e.clientX;
      thumbStartLeft = parseInt(thumb.style.left) || 0;
      track.classList.add('paused');
      e.preventDefault(); e.stopPropagation();
    });
    window.addEventListener('mousemove', function(e){
      if (!thumbDragging) return;
      var maxLeft = bar.offsetWidth - thumb.offsetWidth;
      var newLeft = Math.max(0, Math.min(maxLeft, thumbStartLeft + e.clientX - thumbStartX));
      thumb.style.left = newLeft + 'px';
      var p = maxLeft ? newLeft / maxLeft : 0;
      track.style.animationDelay = (-p * parseFloat(track.style.animationDuration)) + 's';
    });
    window.addEventListener('mouseup', function(){
      if (!thumbDragging) return;
      thumbDragging = false;
      track.classList.remove('paused');
    });

    // Touch-Swipe
    var touchActive = false, touchStartX = 0, touchStartDelay = 0;
    var dur = parseFloat(track.style.animationDuration);
    var pxPerSec = (track.offsetWidth / 2) / dur;
    track.addEventListener('touchstart', function(e){
      touchActive = true;
      touchStartX = e.touches[0].clientX;
      touchStartDelay = parseFloat(getComputedStyle(track).animationDelay) || 0;
      track.style.animationDelay = touchStartDelay + 's';
      track.classList.add('paused');
    }, { passive: true });
    track.addEventListener('touchmove', function(e){
      if (!touchActive) return;
      var dx = e.touches[0].clientX - touchStartX;
      track.style.animationDelay = (touchStartDelay + dx / pxPerSec) + 's';
    }, { passive: true });
    track.addEventListener('touchend', function(){
      touchActive = false;
      track.classList.remove('paused');
    });
  }
})();
