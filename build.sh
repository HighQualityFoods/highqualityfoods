#!/bin/bash
# Erzeugt die statischen Rezeptseiten neu (nach Rezept-Änderungen im Admin ausführen)
cd "$(dirname "$0")"
python3 build_recipes.py
