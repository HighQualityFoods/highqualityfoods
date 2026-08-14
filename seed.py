#!/usr/bin/env python3
import urllib.request, json, os

HOST = 'tanfmnfniphqqjnecbbm.supabase.co'
KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhbmZtbmZuaXBocXFqbmVjYmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzNDM2ODcsImV4cCI6MjA5ODkxOTY4N30.Vev5znftwXtVe5sHqzIJNdxaARgU6tmQgTXF7U7OvQA'
DEST = '/Users/leonradanovic/Documents/highqualityfoods'

def fetch(key):
    url = f'https://{HOST}/rest/v1/kv_store?key=eq.{key}&select=value'
    req = urllib.request.Request(url, headers={'apikey': KEY, 'Authorization': f'Bearer {KEY}'})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            rows = json.loads(r.read())
            return rows[0]['value'] if rows else None
    except Exception as e:
        print(f'  Warnung: {key} konnte nicht geladen werden ({e})')
        return None

print('Daten aus Supabase laden...')
recipes = fetch('hqf_recipes')
filters = fetch('hqf_filters')
lexikon = fetch('hqf_lexikon')
posts   = fetch('hqf_posts')

data = {}
if recipes: data['hqf_recipes'] = [{**r, 'img': None} for r in recipes]
if filters: data['hqf_filters'] = filters
if lexikon: data['hqf_lexikon'] = lexikon
if posts:   data['hqf_posts']   = [{**p, 'img': None} for p in posts]

js = """// Auto-generiert von sync.sh — nicht bearbeiten
window.HQF_SEED = """ + json.dumps(data, ensure_ascii=False) + """;
(function(){
  var d = window.HQF_SEED;
  if (typeof window.store === 'undefined') return; // store not loaded yet, db.js handles it
  try {
    Object.keys(d).forEach(function(k){
      var cur = window.store.getItem(k);
      try { var p = JSON.parse(cur); if (Array.isArray(p) && p.length > 0) return; } catch(e) {}
      window.store.setItem(k, JSON.stringify(d[k]));
    });
  } catch(e) {}
})();
"""

out = os.path.join(DEST, 'data.js')
with open(out, 'w', encoding='utf-8') as f:
    f.write(js)

summary = ', '.join(f"{k}({len(v) if isinstance(v, list) else '?'})" for k, v in data.items())
print(f'✓ data.js erstellt mit: {summary}')
