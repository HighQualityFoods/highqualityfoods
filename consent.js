// consent.js — Cookie-Banner. Google Analytics wird NUR nach Zustimmung geladen.
// Einbinden auf jeder Seite statt des direkten GA-Snippets: <script src="/consent.js" defer></script>
// Footer-Link zum erneuten Öffnen: <a href="#" onclick="hqfCookieSettings();return false;">Cookie-Einstellungen</a>
(function () {
  var GA_ID = 'G-HXETZ7G0E4';
  var KEY = 'hqf-consent-v1';

  function getChoice() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function setChoice(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  // Entfernt GA-Cookies (_ga, _ga_XXXX) bei Ablehnung/Widerruf
  function clearGACookies() {
    var host = location.hostname.replace(/^www\./, '');
    document.cookie.split(';').forEach(function (c) {
      var n = c.split('=')[0].trim();
      if (n.indexOf('_ga') !== 0) return;
      ['', '; domain=' + host, '; domain=.' + host].forEach(function (d) {
        document.cookie = n + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + d;
      });
    });
  }

  var gaLoaded = false;
  function loadGA() {
    if (gaLoaded) return;
    gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date());
    gtag('config', GA_ID);
  }

  function injectStyle() {
    if (document.getElementById('hqf-cc-style')) return;
    var css = document.createElement('style');
    css.id = 'hqf-cc-style';
    css.textContent = [
      '#hqf-cc{position:fixed;left:16px;right:16px;bottom:16px;z-index:9999;max-width:560px;margin:0 auto;background:#fdfcfa;color:#1a2332;border:1px solid #e0d9ce;border-radius:14px;box-shadow:0 12px 40px rgba(26,35,50,.18);padding:20px 22px;font-family:Inter,sans-serif;}',
      '#hqf-cc .t{font-size:15px;font-weight:500;margin-bottom:6px;}',
      '#hqf-cc p{font-size:13.5px;line-height:1.6;color:#4a5568;font-weight:300;margin:0 0 14px;}',
      '#hqf-cc a{color:#1a2332;}',
      '#hqf-cc .b{display:flex;gap:10px;flex-wrap:wrap;}',
      '#hqf-cc button{flex:1;min-width:150px;padding:11px 16px;border-radius:8px;font-family:Inter,sans-serif;font-size:13.5px;font-weight:500;cursor:pointer;border:1px solid #1a2332;}',
      '#hqf-cc .no{background:#fdfcfa;color:#1a2332;}',
      '#hqf-cc .yes{background:#1a2332;color:#f5f2ec;}'
    ].join('');
    document.head.appendChild(css);
  }

  function showBanner() {
    if (document.getElementById('hqf-cc')) return;
    injectStyle();
    var el = document.createElement('div');
    el.id = 'hqf-cc';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Cookie-Einstellungen');
    el.innerHTML =
      '<div class="t">Kurz zu Cookies 🍪</div>' +
      '<p>Mit deiner Zustimmung nutze ich Google Analytics, um zu verstehen, wie die Seite genutzt wird. Dabei werden Cookies gesetzt und Daten an Google übertragen. Ohne Zustimmung funktioniert alles genauso. Mehr in der <a href="/impressum.html#datenschutz">Datenschutzerklärung</a>.</p>' +
      '<div class="b"><button type="button" class="no">Nur notwendige</button><button type="button" class="yes">Akzeptieren</button></div>';
    document.body.appendChild(el);
    el.querySelector('.no').onclick = function () { setChoice('denied'); clearGACookies(); el.remove(); };
    el.querySelector('.yes').onclick = function () { setChoice('granted'); el.remove(); loadGA(); };
  }

  // Zum erneuten Öffnen (Footer-Link). Ein Widerruf greift nach dem nächsten Seitenaufruf vollständig.
  window.hqfCookieSettings = function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    showBanner();
  };

  function init() {
    var c = getChoice();
    if (c === 'granted') loadGA();
    else if (c !== 'denied') showBanner();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
