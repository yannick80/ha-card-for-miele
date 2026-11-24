#!/bin/sh
# Renders the README preview images with headless Chrome (macOS path by default).
# Usage from the repo root:  sh docs/render-previews.sh
set -e
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
PAGE="file://$(pwd)/docs/preview.html"
PROFILE="$(mktemp -d)"

shot() { # <output> <width,height> <query>
  "$CHROME" --headless=new --allow-file-access-from-files --hide-scrollbars \
    --force-device-scale-factor=2 --window-size="$2" --virtual-time-budget=5000 \
    --user-data-dir="$PROFILE" --screenshot="$1" "$PAGE?$3" 2>/dev/null
}

shot docs/preview.png      760,452 "lang=en&layout=themes"
shot docs/preview-de.png   760,452 "lang=de&layout=themes"
shot docs/preview-grid.png 1060,212 "lang=en&layout=grid"
shot docs/preview-overview.png 1064,374 "lang=en&layout=overview"
shot docs/preview-overview-de.png 1064,374 "lang=de&layout=overview"
rm -rf "$PROFILE"
