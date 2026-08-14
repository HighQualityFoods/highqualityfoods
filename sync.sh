#!/bin/bash
# Sync alle Dateien nach Documents und korrigiere Logo-Links

DEST="/Users/leonradanovic/Documents/highqualityfoods"

cp /Users/leonradanovic/Claude/index.html     "$DEST/highqualityfoods.html"
cp /Users/leonradanovic/Claude/rezepte.html   "$DEST/rezepte.html"
cp /Users/leonradanovic/Claude/about.html     "$DEST/about.html"
cp /Users/leonradanovic/Claude/rezept.html    "$DEST/rezept.html"
cp /Users/leonradanovic/Claude/lexikon.html   "$DEST/lexikon.html"
cp /Users/leonradanovic/Claude/blog.html      "$DEST/blog.html"
cp /Users/leonradanovic/Claude/impressum.html "$DEST/impressum.html"
cp /Users/leonradanovic/Claude/config.js      "$DEST/config.js"
cp /Users/leonradanovic/Claude/db.js          "$DEST/db.js"

# Alle Links zur Landingpage korrigieren (Logo + Home-Button)
for f in "$DEST/rezepte.html" "$DEST/about.html" "$DEST/rezept.html" "$DEST/lexikon.html" "$DEST/blog.html"; do
  sed -i '' 's|href="index.html" class="logo"|href="highqualityfoods.html" class="logo"|g' "$f"
  sed -i '' 's|href="index.html">Home|href="highqualityfoods.html">Home|g' "$f"
done
# Auch in highqualityfoods.html selbst
sed -i '' 's|href="index.html">Home|href="highqualityfoods.html">Home|g' "$DEST/highqualityfoods.html"

echo "✓ Sync fertig — Logo-Links und Home-Button korrigiert"

# Daten aus Supabase holen und in data.js einbetten
python3 /Users/leonradanovic/Claude/seed.py
