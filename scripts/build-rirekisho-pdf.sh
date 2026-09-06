#!/usr/bin/env bash
# Regenerate assets/rirekisho.pdf from pages/rirekisho.html using the print stylesheet.
# Run from anywhere: scripts/build-rirekisho-pdf.sh
# Format: 厚生労働省履歴書様式例 (MHLW), A4, 和暦. Sibling of build-cv-pdf.sh.
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT=8767
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

cd "$REPO"
python3 -m http.server "$PORT" --bind 127.0.0.1 >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
sleep 1.5

"$CHROME" --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$REPO/assets/rirekisho.pdf" \
  "http://127.0.0.1:$PORT/pages/rirekisho.html"

echo "wrote $REPO/assets/rirekisho.pdf"
