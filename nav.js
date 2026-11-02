// nav.js — Navigation beim Runterscrollen ausblenden, beim Hochscrollen wieder zeigen.
(function () {
  var nav = document.querySelector('nav');
  if (!nav) return;

  var lastY = window.scrollY;
  var ticking = false;

  function update() {
    var y = window.scrollY;
    var diff = y - lastY;
    if (y < 120) nav.classList.remove('nav-hidden');           // oben immer sichtbar
    else if (diff > 6) nav.classList.add('nav-hidden');         // runter
    else if (diff < -6) nav.classList.remove('nav-hidden');     // hoch
    if (Math.abs(diff) > 6 || y < 120) lastY = y;
    ticking = false;
  }

  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });

  // Per Tastatur fokussiert → wieder einblenden
  nav.addEventListener('focusin', function () { nav.classList.remove('nav-hidden'); });
})();
