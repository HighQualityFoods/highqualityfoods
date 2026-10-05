#!/usr/bin/env python3
# Generiert statische SEO-Rezeptseiten unter /rezepte/<slug>.html
# + recipe-pages.js (Liste der Slugs) + aktualisiert sitemap.xml
import urllib.request, json, os, re, html

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
    # Sitemap neu schreiben (Hauptseiten + Rezepte)
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
    for loc, freq, prio in main_pages:
        lines += ['  <url>', f'    <loc>{DOMAIN}{loc}</loc>',
                  f'    <changefreq>{freq}</changefreq>', f'    <priority>{prio}</priority>', '  </url>']
    for slug in slugs:
        lines += ['  <url>', f'    <loc>{DOMAIN}/rezepte/{slug}.html</loc>',
                  '    <changefreq>monthly</changefreq>', '    <priority>0.8</priority>', '  </url>']
    lines.append('</urlset>')
    open(os.path.join(ROOT, 'sitemap.xml'), 'w', encoding='utf-8').write('\n'.join(lines) + '\n')

    print(f'✓ {len(slugs)} Rezeptseiten erzeugt in /rezepte/')
    print(f'✓ recipe-pages.js aktualisiert ({len(slugs)} Slugs)')
    print(f'✓ sitemap.xml: {len(main_pages) + len(slugs)} URLs')
    print('Beispiele:', ', '.join(slugs[:4]))

if __name__ == '__main__':
    main()
