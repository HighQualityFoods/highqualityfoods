// newsletter.js — Newsletter-Anmeldung über Brevo (Double-Opt-In).
// Erweitert jedes <form class="hqf-nl-form"> auf der Seite: sendet per fetch an Brevo
// und zeigt die Meldung direkt im Formular. Ohne JS schickt das Formular normal an Brevo.
// Einbinden: <script src="/newsletter.js" defer></script>
(function () {
  var MSG = {
    ok: 'Fast geschafft! Bitte bestätige deine Anmeldung in der Mail, die wir dir gerade geschickt haben (schau auch im Spam-Ordner nach).',
    invalid: 'Bitte gib eine gültige E-Mail-Adresse ein.',
    error: 'Deine Anmeldung konnte nicht gespeichert werden. Bitte versuch es nochmal.'
  };

  function init(form) {
    var input = form.querySelector('input[name="EMAIL"]');
    var btn = form.querySelector('button[type="submit"]');
    var out = form.querySelector('.hqf-nl-msg');

    function show(text, kind) {
      out.textContent = text;
      out.className = 'hqf-nl-msg is-' + kind;
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (input.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { show(MSG.invalid, 'error'); input.focus(); return; }

      btn.disabled = true;
      form.classList.add('is-busy');
      var data = new FormData(form);
      data.set('EMAIL', email);

      fetch(form.action + (form.action.indexOf('?') < 0 ? '?' : '&') + 'isAjax=1', { method: 'POST', body: data })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (!res || !res.success) throw new Error('brevo');
          form.classList.add('is-done');
          show(MSG.ok, 'ok');
          if (typeof window.gtag === 'function') window.gtag('event', 'newsletter_signup', { form: form.dataset.source || 'site' });
        })
        .catch(function () { show(MSG.error, 'error'); })
        .then(function () { btn.disabled = false; form.classList.remove('is-busy'); });
    });
  }

  document.querySelectorAll('form.hqf-nl-form').forEach(init);
})();
