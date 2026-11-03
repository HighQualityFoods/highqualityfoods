/* share.js — Teilen-Menü für Rezepte inkl. Instagram-Story-Bild (1080×1920).
   Aufruf: HQFShare.open({ title, img, category, time, kcal, protein, url }) */
(function () {
  var W = 1080, H = 1920;
  var INK = '#1a2332', BG = '#f5f2ec', ACCENT = '#8fa8b8', SOFT = '#6b7f8f', CREAM = '#e8dfd0';

  var css = `
  .hqf-sh-back{position:fixed;inset:0;background:rgba(26,35,50,.55);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:flex-end;justify-content:center;opacity:0;transition:opacity .25s}
  .hqf-sh-back.show{opacity:1}
  .hqf-sh{background:#f5f2ec;width:100%;max-width:440px;border-radius:28px 28px 0 0;padding:22px 20px calc(22px + env(safe-area-inset-bottom));transform:translateY(30px);transition:transform .3s cubic-bezier(.22,1,.36,1);max-height:94vh;overflow:auto;font-family:'Inter',sans-serif;color:#1a2332}
  .hqf-sh-back.show .hqf-sh{transform:none}
  @media (min-width:600px){.hqf-sh-back{align-items:center}.hqf-sh{border-radius:28px}}
  .hqf-sh-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
  .hqf-sh-head b{font:700 20px/1 'Inter Tight','Inter',sans-serif;letter-spacing:-.02em}
  .hqf-sh-x{border:none;background:#fff;width:36px;height:36px;border-radius:50%;font-size:18px;cursor:pointer;color:#1a2332;display:flex;align-items:center;justify-content:center}
  .hqf-sh-opt{display:flex;align-items:center;gap:14px;width:100%;background:#fff;border:1px solid rgba(26,35,50,.08);border-radius:16px;padding:14px 16px;margin-bottom:10px;font:500 15px/1.2 'Inter',sans-serif;color:#1a2332;cursor:pointer;text-align:left}
  .hqf-sh-opt:hover{border-color:rgba(26,35,50,.25)}
  .hqf-sh-ic{width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;color:#fff}
  .hqf-sh-opt small{display:block;color:#6b7f8f;font-size:12.5px;font-weight:400;margin-top:3px}
  .hqf-sh-prev{display:block;width:62%;max-width:240px;aspect-ratio:9/16;margin:0 auto 16px;border-radius:18px;box-shadow:0 20px 50px -18px rgba(26,35,50,.45);background:#e8dfd0 center/cover;object-fit:cover}
  .hqf-sh-hint{font-size:13px;line-height:1.55;color:#6b7f8f;text-align:center;margin:0 0 14px}
  .hqf-sh-main{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;border:none;border-radius:999px;padding:15px 20px;font:600 15px/1 'Inter',sans-serif;cursor:pointer;margin-bottom:10px;background:#1a2332;color:#fff}
  .hqf-sh-main.soft{background:#fff;color:#1a2332;border:1px solid rgba(26,35,50,.12)}
  .hqf-sh-main:disabled{opacity:.5;cursor:wait}
  .hqf-sh-toast{text-align:center;font-size:13px;color:#1a2332;font-weight:500;min-height:18px}
  `;

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(function () {});
    return Promise.resolve();
  }

  function loadImg(src) {
    return new Promise(function (res) {
      if (!src) return res(null);
      var i = new Image();
      i.crossOrigin = 'anonymous';
      i.onload = function () { res(i); };
      i.onerror = function () { res(null); };
      i.src = src;
    });
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function wrap(ctx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  async function drawStory(r) {
    try {
      await Promise.all([
        document.fonts.load('700 100px "Inter Tight"'),
        document.fonts.load('800 40px "Inter Tight"'),
        document.fonts.load('600 30px "Inter"'),
        document.fonts.load('500 30px "Inter"')
      ]);
    } catch (e) {}
    var img = await loadImg(r.img);
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var ctx = c.getContext('2d');
    var HEAD = '"Inter Tight", "Inter", sans-serif', BODY = '"Inter", sans-serif';

    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);

    // Kopfzeile (unterhalb der Instagram-Leiste oben)
    ctx.fillStyle = INK;
    ctx.font = '800 40px ' + HEAD;
    ctx.textBaseline = 'middle';
    ctx.fillText('HighQualityFoods', 80, 200);
    ctx.font = '600 24px ' + BODY;
    ctx.fillStyle = SOFT;
    ctx.textAlign = 'right';
    ctx.fillText('REZEPT', W - 80, 200);
    ctx.textAlign = 'left';

    // Foto
    var px = 80, py = 270, pw = W - 160, ph = 860;
    ctx.save();
    roundRect(ctx, px, py, pw, ph, 48);
    ctx.clip();
    if (img) {
      var s = Math.max(pw / img.width, ph / img.height);
      var iw = img.width * s, ih = img.height * s;
      ctx.drawImage(img, px + (pw - iw) / 2, py + (ph - ih) / 2, iw, ih);
    } else {
      ctx.fillStyle = CREAM; ctx.fillRect(px, py, pw, ph);
      ctx.font = '200px serif'; ctx.textAlign = 'center';
      ctx.fillText('🍽', W / 2, py + ph / 2); ctx.textAlign = 'left';
    }
    ctx.restore();

    // Kategorie-Pill auf dem Foto
    if (r.category) {
      ctx.font = '600 26px ' + BODY;
      var label = String(r.category).toUpperCase();
      var lw = ctx.measureText(label).width + 52;
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      roundRect(ctx, px + 32, py + 32, lw, 60, 30); ctx.fill();
      ctx.fillStyle = INK; ctx.fillText(label, px + 58, py + 63);
    }

    // Titel
    var y = py + ph + 80;
    var size = 96, lines;
    ctx.fillStyle = INK;
    do {
      ctx.font = '700 ' + size + 'px ' + HEAD;
      lines = wrap(ctx, r.title, W - 160);
      size -= 6;
    } while (lines.length > 3 && size > 54);
    size += 6;
    if (lines.length > 3) { lines = lines.slice(0, 3); lines[2] = lines[2].replace(/\s*\S*$/, '') + ' …'; }
    ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (-size * 0.03) + 'px';
    lines.forEach(function (l, i) { ctx.fillText(l, 80, y + size * 0.8 + i * size * 1.04); });
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    y += size * 0.8 + (lines.length - 1) * size * 1.04 + 60;

    // Kennzahlen-Chips
    var chips = [];
    if (r.time) chips.push(['ZEIT', r.time]);
    if (r.kcal) chips.push(['KCAL', String(r.kcal).replace(/\s*kcal/i, '')]);
    if (r.protein) chips.push(['PROTEIN', r.protein]);
    if (chips.length) {
      var gap = 20, cw = (W - 160 - gap * (chips.length - 1)) / chips.length, ch = 130;
      chips.forEach(function (cp, i) {
        var cx = 80 + i * (cw + gap);
        ctx.fillStyle = '#fff';
        roundRect(ctx, cx, y, cw, ch, 28); ctx.fill();
        ctx.fillStyle = SOFT; ctx.font = '600 24px ' + BODY;
        ctx.fillText(cp[0], cx + 30, y + 48);
        ctx.fillStyle = INK;
        var vs = 46; ctx.font = '700 ' + vs + 'px ' + HEAD;
        while (ctx.measureText(cp[1]).width > cw - 60 && vs > 22) { vs -= 2; ctx.font = '700 ' + vs + 'px ' + HEAD; }
        ctx.fillText(cp[1], cx + 30, y + 102);
      });
    }

    // Fußzeile: Link-Hinweis (über dem Instagram-Antwortfeld)
    var fy = H - 300, fh = 100;
    ctx.fillStyle = INK;
    roundRect(ctx, 80, fy, W - 160, fh, 50); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '600 32px ' + BODY;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Ganzes Rezept auf highqualityfoods.de', W / 2, fy + fh / 2 + 1);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    return new Promise(function (res) { c.toBlob(res, 'image/png'); });
  }

  function slug(t) {
    return String(t || 'rezept').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function open(r) {
    r = r || {};
    var url = r.url || window.location.href;
    var shareTitle = r.title + ' — HighQualityFoods';
    if (!document.getElementById('hqf-sh-css')) {
      var st = el('style'); st.id = 'hqf-sh-css'; st.textContent = css; document.head.appendChild(st);
    }
    var back = el('div', 'hqf-sh-back');
    var sheet = el('div', 'hqf-sh');
    back.appendChild(sheet);
    document.body.appendChild(back);
    requestAnimationFrame(function () { back.classList.add('show'); });
    function close() { back.classList.remove('show'); setTimeout(function () { back.remove(); }, 250); }
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } });

    // Bild schon im Hintergrund vorbereiten, damit das Teilen direkt beim Klick klappt
    var blobP = drawStory(r);

    function head(t) {
      var h = el('div', 'hqf-sh-head', '<b>' + esc(t) + '</b>');
      var x = el('button', 'hqf-sh-x', '<i class="ti ti-x"></i>'); x.setAttribute('aria-label', 'Schließen'); x.onclick = close;
      h.appendChild(x); return h;
    }
    function opt(icon, bg, label, sub, fn) {
      var b = el('button', 'hqf-sh-opt', '<span class="hqf-sh-ic" style="background:' + bg + '"><i class="ti ' + icon + '"></i></span><span>' + label + (sub ? '<small>' + sub + '</small>' : '') + '</span>');
      b.onclick = fn; return b;
    }

    function menu() {
      sheet.innerHTML = '';
      sheet.appendChild(head('Rezept teilen'));
      sheet.appendChild(opt('ti-brand-instagram', 'linear-gradient(45deg,#f9a825,#e91e63 55%,#7b1fa2)', 'Instagram Story', 'Schönes Story-Bild mit Foto & Nährwerten', story));
      sheet.appendChild(opt('ti-brand-whatsapp', '#25d366', 'WhatsApp', '', function () {
        window.open('https://wa.me/?text=' + encodeURIComponent(shareTitle + '\n' + url), '_blank'); close();
      }));
      var cp = opt('ti-link', INK, 'Link kopieren', '', function () {
        copy(url).then(function () { cp.querySelector('span:last-child').innerHTML = 'Link kopiert ✓'; });
      });
      sheet.appendChild(cp);
      if (navigator.share) sheet.appendChild(opt('ti-dots', ACCENT, 'Weitere Apps', '', function () {
        navigator.share({ title: shareTitle, url: url }).catch(function () {}); close();
      }));
    }

    function story() {
      sheet.innerHTML = '';
      var h = head('Instagram Story');
      var bk = el('button', 'hqf-sh-x', '<i class="ti ti-arrow-left"></i>'); bk.setAttribute('aria-label', 'Zurück'); bk.onclick = menu;
      h.insertBefore(bk, h.firstChild);
      sheet.appendChild(h);
      var prev = el('img', 'hqf-sh-prev'); prev.alt = 'Vorschau Story-Bild';
      sheet.appendChild(prev);
      var file = null;
      var name = 'hqf-' + slug(r.title) + '-story.png';
      var canFiles = false;

      var main = el('button', 'hqf-sh-main', '<i class="ti ti-brand-instagram"></i> In Story teilen');
      var save = el('button', 'hqf-sh-main soft', '<i class="ti ti-download"></i> Bild speichern');
      var hint = el('p', 'hqf-sh-hint');
      var toast = el('div', 'hqf-sh-toast');
      main.disabled = save.disabled = true;
      sheet.appendChild(hint); sheet.appendChild(main); sheet.appendChild(save); sheet.appendChild(toast);

      blobP.then(function (blob) {
        if (!blob) { toast.textContent = 'Bild konnte nicht erstellt werden.'; return; }
        prev.src = URL.createObjectURL(blob);
        try { file = new File([blob], name, { type: 'image/png' }); } catch (e) {}
        canFiles = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
        if (!canFiles) main.style.display = 'none';
        hint.innerHTML = canFiles
          ? 'Tippe auf „In Story teilen“ und wähle <b>Instagram</b> → <b>Story</b>. Der Link ist kopiert – füg ihn als <b>Link-Sticker</b> ein.'
          : 'Speichere das Bild und lade es in deine Instagram Story hoch. Füg den Rezept-Link als <b>Link-Sticker</b> hinzu.';
        main.disabled = save.disabled = false;
      });

      main.onclick = function () {
        copy(url);
        navigator.share({ files: [file] })
          .then(function () { toast.textContent = 'Danke fürs Teilen! 💙'; })
          .catch(function () {});
      };
      save.onclick = function () {
        blobP.then(function (blob) {
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob); a.download = name;
          document.body.appendChild(a); a.click(); a.remove();
          copy(url);
          toast.textContent = 'Bild gespeichert · Link kopiert';
        });
      };
    }

    menu();
  }

  window.HQFShare = { open: open, story: drawStory };
})();
