#!/usr/bin/env python3
# Generiert statische SEO-Rezeptseiten unter /rezepte/<slug>.html
# + recipe-pages.js (Liste der Slugs) + aktualisiert sitemap.xml
import urllib.request, urllib.parse, json, os, re, html

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(ROOT, 'rezepte')
DOMAIN = 'https://highqualityfoods.de'

# Supabase-Zugang aus config.js lesen
cfg = open(os.path.join(ROOT, 'config.js'), encoding='utf-8').read()
HOST = re.search(r"SUPABASE_URL\s*=\s*'([^']+)'", cfg).group(1)
KEY  = re.search(r"SUPABASE_KEY\s*=\s*'([^']+)'", cfg).group(1)

def fetch(key):
    url = f'{HOST}/rest/v1/kv_store?key=eq.{key}&select=value'
    req = urllib.request.Request(url, headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'})
    with urllib.request.urlopen(req, timeout=20) as r:
        rows = json.loads(r.read())
        return rows[0]['value'] if rows else None

def slugify(title):
    s = title.lower()
    s = s.replace('ä','ae').replace('ö','oe').replace('ü','ue').replace('ß','ss')
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')

def iso_duration(timestr):
    if not timestr: return None
    m = re.search(r'(\d+)', timestr)
    return f'PT{m.group(1)}M' if m else None

def esc(s):
    return html.escape(str(s or ''), quote=True)

def format_ingredients(text):
    if not text: return ''
    items = [l.strip() for l in text.split('\n') if l.strip()]
    return ''.join(f'<li>{esc(l)}</li>' for l in items)

def parse_steps(text):
    """Gibt Liste von (name, text) zurück."""
    if not text: return []
    steps = []
    cur_name, cur_text = None, []
    loose = []
    for line in text.split('\n'):
        m = re.match(r'^\d+\.\s*(.+)', line)
        if m:
            if cur_name is not None:
                steps.append((cur_name, '\n'.join(cur_text).strip()))
            cur_name, cur_text = m.group(1).strip(), []
        elif line.strip() and cur_name is not None:
            cur_text.append(line.strip())
        elif line.strip():
            loose.append(line.strip())
    if cur_name is not None:
        steps.append((cur_name, '\n'.join(cur_text).strip()))
    if not steps and loose:
        steps = [('', ' '.join(loose))]
    return steps

def steps_html(steps):
    out = ''
    for i, (name, txt) in enumerate(steps, 1):
        txt_html = esc(txt).replace('\n', '<br>')
        out += (f'<div class="step-item"><div class="step-heading">'
                f'<span class="step-num">{i}</span>{esc(name)}</div>'
                f'<div class="step-text">{txt_html}</div></div>')
    return out

# Style-Block aus rezept.html wiederverwenden (bleibt so im Look identisch)
rezept_src = open(os.path.join(ROOT, 'rezept.html'), encoding='utf-8').read()
STYLE = re.search(r'<style>(.*?)</style>', rezept_src, re.S).group(1)
# Style-Block aus blog.html fuer die Blog-Seiten
blog_src = open(os.path.join(ROOT, 'blog.html'), encoding='utf-8').read()
BLOG_STYLE = re.search(r'<style>(.*?)</style>', blog_src, re.S).group(1)

NAV = '''<nav>
  <a href="/index.html" class="logo">High<span>Quality</span>Foods</a>
  <div class="nav-links">
    <a href="/index.html">Home</a>
    <a href="/rezepte.html">Rezepte</a>
    <a href="/blog.html">Blog</a>
    <a href="/lexikon.html">A–Z</a>
    <a href="/about.html">About</a>
    <a href="/ernaehrungsplan.html">Ernährungsplan</a>
  </div>
  <div>
    <span class="nav-tag">Rezept-Blog</span>
    <button class="hamburger" onclick="document.getElementById('mobile-menu').classList.toggle('open')" aria-label="Menü"><i class="ti ti-menu-2"></i></button>
  </div>
</nav>
<div class="mobile-menu" id="mobile-menu">
  <a href="/index.html">Startseite</a>
  <a href="/rezepte.html">Rezepte</a>
  <a href="/blog.html">Blog</a>
  <a href="/lexikon.html">A–Z</a>
  <a href="/about.html">About</a>
  <a href="/ernaehrungsplan.html">Ernährungsplan</a>
</div>'''

def build_schema(r, slug, img):
    steps = parse_steps(r.get('steps'))
    ingredients = [l.strip() for l in (r.get('ingredients') or '').split('\n') if l.strip()]
    schema = {
        "@context": "https://schema.org/",
        "@type": "Recipe",
        "name": r.get('title',''),
        "url": f"{DOMAIN}/rezepte/{slug}.html",
        "author": {"@type": "Organization", "name": "HighQualityFoods"},
    }
    if img: schema["image"] = [img]
    if r.get('desc'): schema["description"] = r['desc']
    if r.get('category'): schema["recipeCategory"] = r['category']
    if r.get('servings'): schema["recipeYield"] = r['servings']
    dur = iso_duration(r.get('time'))
    if dur: schema["totalTime"] = dur
    if ingredients: schema["recipeIngredient"] = ingredients
    if steps:
        schema["recipeInstructions"] = [
            {"@type": "HowToStep", **({"name": n} if n else {}), "text": (t or n)}
            for n, t in steps
        ]
    nut = r.get('nutrition') or {}
    nutobj = {"@type": "NutritionInformation"}
    if nut.get('kcal'):    nutobj["calories"] = nut['kcal']
    if nut.get('protein'): nutobj["proteinContent"] = nut['protein']
    if nut.get('carbs'):   nutobj["carbohydrateContent"] = nut['carbs']
    if nut.get('fat'):     nutobj["fatContent"] = nut['fat']
    if nut.get('fiber'):   nutobj["fiberContent"] = nut['fiber']
    if len(nutobj) > 1: schema["nutrition"] = nutobj
    return json.dumps(schema, ensure_ascii=False, indent=2)

def meta_tag(r):
    nut = r.get('nutrition') or {}
    bits = []
    if r.get('time'): bits.append(f'<span><i class="ti ti-clock"></i>{esc(r["time"])}</span>')
    if r.get('servings'): bits.append(f'<span><i class="ti ti-users"></i>{esc(r["servings"])}</span>')
    if nut.get('kcal'): bits.append(f'<span><i class="ti ti-flame"></i>{esc(nut["kcal"])}</span>')
    if nut.get('protein'): bits.append(f'<span><i class="ti ti-meat"></i>{esc(nut["protein"])}</span>')
    if nut.get('carbs'): bits.append(f'<span><i class="ti ti-bread"></i>{esc(nut["carbs"])}</span>')
    if nut.get('fat'): bits.append(f'<span><i class="ti ti-droplet"></i>{esc(nut["fat"])}</span>')
    if nut.get('fiber'): bits.append(f'<span><i class="ti ti-leaf"></i>{esc(nut["fiber"])}</span>')
    return ''.join(bits)

def page_html(r, slug, img):
    title = r.get('title','')
    desc_raw = r.get('desc') or f"{title} – ein gesundes, alltagstaugliches Rezept von HighQualityFoods."
    meta_desc = re.sub(r'\s+', ' ', desc_raw).strip()[:160]
    canonical = f"{DOMAIN}/rezepte/{slug}.html"
    img_tag = (f'<img class="recipe-img" src="{esc(img)}" alt="{esc(title)}">' if img
               else '<div class="recipe-img-ph">\U0001F37D</div>')
    tags = r.get('tags') or []
    tags_html = (f'<div class="recipe-tags">' + ''.join(f'<span class="pill">{esc(t)}</span>' for t in tags) + '</div>') if tags else ''
    desc_block = (f'<div class="section-label">Beschreibung</div><p class="desc-text">{esc(r["desc"])}</p><hr class="divider">' if r.get('desc') else '')
    ing_block = (f'<div><div class="section-label">Zutaten</div><ul class="ingredients-list">{format_ingredients(r.get("ingredients"))}</ul></div>' if r.get('ingredients') else '<div></div>')
    steps_block = (f'<div><div class="section-label">Zubereitung</div><div>{steps_html(parse_steps(r.get("steps")))}</div></div>' if r.get('steps') else '<div></div>')

    return f'''<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(title)} | HighQualityFoods</title>
  <meta name="description" content="{esc(meta_desc)}">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="{esc(title)} | HighQualityFoods">
  <meta property="og:description" content="{esc(meta_desc)}">
  <meta property="og:url" content="{canonical}">
  {f'<meta property="og:image" content="{esc(img)}">' if img else ''}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css">
  <script type="application/ld+json">
{build_schema(r, slug, img)}
  </script>
  <style>{STYLE}</style>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-HXETZ7G0E4"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag("js", new Date());
    gtag("config", "G-HXETZ7G0E4");
  </script>
</head>
<body>
{NAV}

<div id="page">
  <div class="recipe-layout">
    <div class="recipe-img-col">
      <div class="recipe-img-wrap">{img_tag}</div>
    </div>
    <div class="recipe-info-col">
      <a href="/rezepte.html" class="back-link"><i class="ti ti-arrow-left"></i> Alle Rezepte</a>
      <div class="eyebrow">{esc(r.get('category',''))}</div>
      <h1 class="recipe-title">{esc(title)}</h1>
      <div style="display:inline-flex;align-items:center;gap:6px;font-family:'Playfair Display',serif;font-style:italic;font-size:14px;color:#8fa8b8;margin:0 0 14px;"><i class="ti ti-heart" style="font-size:14px;"></i>Aus Mamas Küche</div>
      <div class="recipe-meta">{meta_tag(r)}</div>
      {tags_html}
      {desc_block}
      <div class="print-cols">
        {ing_block}
        {steps_block}
      </div>
      <hr class="divider">
      <button class="share-btn" onclick="shareRecipe()"><i class="ti ti-share"></i> Rezept teilen</button>
      <button class="pdf-btn" onclick="window.print()"><i class="ti ti-file-type-pdf"></i> Als PDF speichern</button>
      <span class="share-toast" id="share-toast">Link kopiert!</span>
    </div>
  </div>
</div>

<footer>
  <span class="footer-copy">© 2026 HighQualityFoods — Mit Liebe gemacht. &nbsp;·&nbsp; <a href="/impressum.html" style="color:inherit;text-decoration:none;">Impressum &amp; Datenschutz</a></span>
</footer>

<script>
  function shareRecipe() {{
    const url = window.location.href;
    const title = {json.dumps(title + ' — HighQualityFoods')};
    if (navigator.share) {{ navigator.share({{ title, url }}); }}
    else {{ navigator.clipboard.writeText(url).then(() => {{
      const t = document.getElementById('share-toast'); t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2500);
    }}); }}
  }}
</script>
</body>
</html>'''

# ───────── Blog ─────────
MONTHS = ['Januar','Februar','März','April','Mai','Juni','Juli','August',
          'September','Oktober','November','Dezember']

def german_date(d):
    try:
        y, m, day = d.split('-')
        return f"{int(day)}. {MONTHS[int(m)-1]} {y}"
    except Exception:
        return d or ''

def inline_format(s):
    s = html.escape(s, quote=False)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\*(.+?)\*', r'<em>\1</em>', s)
    return s

def render_markdown(text):
    out, in_list = [], False
    for line in (text or '').split('\n'):
        if line.startswith('## '):
            if in_list: out.append('</ul>'); in_list = False
            out.append(f'<h2>{inline_format(line[3:])}</h2>')
        elif line.startswith('### '):
            if in_list: out.append('</ul>'); in_list = False
            out.append(f'<h3>{inline_format(line[4:])}</h3>')
        elif line.startswith('> '):
            if in_list: out.append('</ul>'); in_list = False
            out.append(f'<blockquote>{inline_format(line[2:])}</blockquote>')
        elif line.startswith('- '):
            if not in_list: out.append('<ul>'); in_list = True
            out.append(f'<li>{inline_format(line[2:])}</li>')
        elif line.strip() == '':
            if in_list: out.append('</ul>'); in_list = False
        else:
            if in_list: out.append('</ul>'); in_list = False
            out.append(f'<p>{inline_format(line)}</p>')
    if in_list: out.append('</ul>')
    return ''.join(out)

def blog_schema(p, slug, img):
    schema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": p.get('title', ''),
        "url": f"{DOMAIN}/blog/{slug}.html",
        "mainEntityOfPage": f"{DOMAIN}/blog/{slug}.html",
        "author": {"@type": "Organization", "name": "HighQualityFoods"},
        "publisher": {"@type": "Organization", "name": "HighQualityFoods"},
    }
    if p.get('excerpt'): schema["description"] = p['excerpt']
    if img: schema["image"] = [img]
    if p.get('date'):
        schema["datePublished"] = p['date']; schema["dateModified"] = p['date']
    if p.get('tag'): schema["keywords"] = p['tag']
    return json.dumps(schema, ensure_ascii=False, indent=2)

def blog_page_html(p, slug, img):
    title = p.get('title', '')
    meta_desc = re.sub(r'\s+', ' ', (p.get('excerpt') or title)).strip()[:160]
    canonical = f"{DOMAIN}/blog/{slug}.html"
    # Erste Zeile (= Titel) aus dem Body entfernen, damit er nicht doppelt steht
    content = p.get('content', '')
    clines = content.split('\n')
    if clines and clines[0].strip() == title.strip():
        content = '\n'.join(clines[1:]).lstrip('\n')
    cover = (f'<div class="detail-cover"><img src="{esc(img)}" alt="{esc(title)}"></div>' if img else '')
    eyebrow = (f'<div class="detail-eyebrow">{esc(p["tag"])}</div>' if p.get('tag') else '')
    filters = p.get('recipeFilters') or ([p['recipeFilter']] if p.get('recipeFilter') else [])
    cta = ''
    if filters:
        chips = ''.join(
            f'<a href="/rezepte.html?filter={urllib.parse.quote(f)}" class="filter-chip"><i class="ti ti-chef-hat"></i>{esc(f)}</a>'
            for f in filters)
        cta = f'<div class="filter-cta"><div class="filter-cta-label">Passende Rezepte</div><div class="filter-cta-chips">{chips}</div></div>'
    wa_svg = ('<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
              '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 '
              '1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 '
              '0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 '
              '4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 '
              '7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 '
              '01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 '
              '012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 '
              '.16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 '
              '005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>')
    return f'''<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{esc(title)} | HighQualityFoods</title>
  <meta name="description" content="{esc(meta_desc)}">
  <link rel="canonical" href="{canonical}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="{esc(title)} | HighQualityFoods">
  <meta property="og:description" content="{esc(meta_desc)}">
  <meta property="og:url" content="{canonical}">
  {f'<meta property="og:image" content="{esc(img)}">' if img else ''}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,700;1,400&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css">
  <script type="application/ld+json">
{blog_schema(p, slug, img)}
  </script>
  <style>{BLOG_STYLE}</style>
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-HXETZ7G0E4"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){{dataLayer.push(arguments);}}
    gtag("js", new Date());
    gtag("config", "G-HXETZ7G0E4");
  </script>
</head>
<body>
{NAV}

<div id="page-root">
  <div class="post-detail">
    <a href="/blog.html" class="back-link"><i class="ti ti-arrow-left"></i> Alle Beiträge</a>
    {cover}
    {eyebrow}
    <h1 class="detail-title">{esc(title)}</h1>
    <div class="detail-meta"><span class="detail-date">{esc(german_date(p.get('date','')))}</span></div>
    <div class="detail-body">{render_markdown(content)}</div>
    {cta}
    <div class="share-bar">
      <span class="share-label">Teilen</span>
      <button class="share-btn" onclick="shareWhatsApp()" title="WhatsApp">{wa_svg} WhatsApp</button>
      <button class="share-btn" onclick="copyPostLink(this)" title="Link kopieren"><i class="ti ti-link" aria-hidden="true"></i> Link kopieren</button>
      <button class="share-btn share-native" onclick="nativeShare()" title="Mehr"><i class="ti ti-dots" aria-hidden="true"></i></button>
    </div>
  </div>
</div>

<footer>
  <span class="footer-copy">© 2026 HighQualityFoods — Mit Liebe gemacht. &nbsp;·&nbsp; <a href="/impressum.html" style="color:inherit;text-decoration:none;">Impressum &amp; Datenschutz</a></span>
</footer>

<script>
  var SHARE_TITLE = {json.dumps(title + ' — HighQualityFoods')};
  var SHARE_TEXT = {json.dumps((p.get('excerpt') or title))};
  function shareWhatsApp() {{
    var url = encodeURIComponent(window.location.href);
    window.open('https://wa.me/?text=' + encodeURIComponent(SHARE_TITLE + '\\n') + url, '_blank');
  }}
  function copyPostLink(btn) {{
    navigator.clipboard.writeText(window.location.href).then(function(){{
      var o = btn.innerHTML; btn.innerHTML = '<i class="ti ti-check"></i> Kopiert!';
      setTimeout(function(){{ btn.innerHTML = o; }}, 2000);
    }});
  }}
  function nativeShare() {{
    if (navigator.share) navigator.share({{ title: SHARE_TITLE, text: SHARE_TEXT, url: window.location.href }});
    else copyPostLink(document.querySelector('.share-native'));
  }}
</script>
</body>
</html>'''

def main():
    recipes = fetch('hqf_recipes') or []
    os.makedirs(OUT_DIR, exist_ok=True)
    slugs, seen = [], {}
    for r in recipes:
        title = r.get('title','').strip()
        if not title: continue
        slug = slugify(title) or f"rezept-{r.get('id')}"
        if slug in seen:
            slug = f"{slug}-{r.get('id')}"
        seen[slug] = True
        img = r.get('img') or ''
        with open(os.path.join(OUT_DIR, f'{slug}.html'), 'w', encoding='utf-8') as f:
            f.write(page_html(r, slug, img))
        slugs.append(slug)
    # recipe-pages.js (fuer Kartenverlinkung)
    with open(os.path.join(ROOT, 'recipe-pages.js'), 'w', encoding='utf-8') as f:
        f.write('// Auto-generiert von build_recipes.py\nwindow.HQF_PAGES = ' +
                json.dumps(slugs, ensure_ascii=False) + ';\n')

    # ───────── Blog-Seiten ─────────
    posts = fetch('hqf_posts') or []
    blog_dir = os.path.join(ROOT, 'blog')
    os.makedirs(blog_dir, exist_ok=True)
    blog_slugs, bseen = [], {}
    for p in posts:
        title = (p.get('title') or '').strip()
        if not title: continue
        slug = slugify(title) or f"beitrag-{p.get('id')}"
        if slug in bseen: slug = f"{slug}-{p.get('id')}"
        bseen[slug] = True
        img = p.get('img') or ''
        with open(os.path.join(blog_dir, f'{slug}.html'), 'w', encoding='utf-8') as f:
            f.write(blog_page_html(p, slug, img))
        blog_slugs.append(slug)
    with open(os.path.join(ROOT, 'blog-pages.js'), 'w', encoding='utf-8') as f:
        f.write('// Auto-generiert von build_recipes.py\nwindow.HQF_BLOG_PAGES = ' +
                json.dumps(blog_slugs, ensure_ascii=False) + ';\n')

    # ───────── Sitemap (Hauptseiten + Rezepte + Blog) ─────────
    main_pages = [
        ('/', 'weekly', '1.0'),
        ('/rezepte.html', 'weekly', '0.9'),
        ('/ernaehrungsplan.html', 'monthly', '0.8'),
        ('/blog.html', 'weekly', '0.8'),
        ('/lexikon.html', 'monthly', '0.7'),
        ('/about.html', 'monthly', '0.5'),
    ]
    lines = ['<?xml version="1.0" encoding="UTF-8"?>',
             '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    def add(loc, freq, prio):
        lines.extend(['  <url>', f'    <loc>{DOMAIN}{loc}</loc>',
                      f'    <changefreq>{freq}</changefreq>', f'    <priority>{prio}</priority>', '  </url>'])
    for loc, freq, prio in main_pages: add(loc, freq, prio)
    for slug in slugs:       add(f'/rezepte/{slug}.html', 'monthly', '0.8')
    for slug in blog_slugs:  add(f'/blog/{slug}.html', 'monthly', '0.7')
    lines.append('</urlset>')
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')

    print(f'✓ {len(slugs)} Rezeptseiten in /rezepte/')
    print(f'✓ {len(blog_slugs)} Blog-Seiten in /blog/')
    print(f'✓ recipe-pages.js ({len(slugs)}), blog-pages.js ({len(blog_slugs)})')
    print(f'✓ sitemap.xml: {len(main_pages) + len(slugs) + len(blog_slugs)} URLs')

if __name__ == '__main__':
    main()
