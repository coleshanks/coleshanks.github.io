#!/usr/bin/env bash
# Regenerate assets/cv.pdf from pages/CV.html using the print stylesheet.
# Run from anywhere: scripts/build-cv-pdf.sh
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=8766
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

cd "$REPO"
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1.5

# ?pdf tells CV.html to flatten its links to plain text (no embedded hyperlinks).
"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$REPO/assets/cv.pdf" \
  "http://127.0.0.1:$PORT/pages/CV.html?pdf"

echo "wrote $REPO/assets/cv.pdf"
