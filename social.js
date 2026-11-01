// Social-Links oben in der Navigation jeder Seite. Links nur hier ändern.
(function () {
  const SOCIAL = [
    {
      name: 'Instagram',
      url: 'https://www.instagram.com/highqualityfoods.de/',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>'
    },
    {
      name: 'TikTok',
      url: 'https://www.tiktok.com/@highqualityfoods',
      icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>'
    }
  ];

  const nav = document.querySelector('nav');
  if (!nav) return;

  const style = document.createElement('style');
  style.textContent =
    '.hqf-social { display: inline-flex; align-items: center; gap: 12px; vertical-align: middle; }' +
    '.hqf-social a { display: flex; color: rgba(26,35,50,.55); transition: color .15s; }' +
    '.hqf-social a:hover { color: #1a2332; }' +
    '.hqf-social svg { width: 19px; height: 19px; display: block; }' +
    '@media (max-width: 1100px) { nav .nav-tag { display: none !important; } }' +
    '@media (max-width: 360px) { nav .btn-admin { display: none !important; } }';
  document.head.appendChild(style);

  const box = document.createElement('div');
  box.className = 'hqf-social';
  box.innerHTML = SOCIAL.map(s =>
    '<a href="' + s.url + '" target="_blank" rel="noopener" aria-label="HighQualityFoods auf ' + s.name + '">' + s.icon + '</a>'
  ).join('');

  const anchor = nav.querySelector('.nav-tag') || nav.querySelector('.hamburger');
  if (anchor) {
    box.style.marginRight = '14px';
    anchor.parentNode.insertBefore(box, anchor);
    if (anchor.parentNode !== nav) { anchor.parentNode.style.display = 'flex'; anchor.parentNode.style.alignItems = 'center'; }
  } else nav.appendChild(box);
})();
