#!/usr/bin/env bash
# Build the web app (first run, or REBUILD=1) and start The Ending at http://127.0.0.1:8080.
set -euo pipefail
cd "$(dirname "$0")"

command -v go >/dev/null || { echo "Go 1.26 or newer is needed: https://go.dev/dl/" >&2; exit 1; }
command -v npm >/dev/null || { echo "Node.js 22 or newer is needed: https://nodejs.org/" >&2; exit 1; }

if [[ ! -f NextJS/out/index.html || "${REBUILD:-}" == 1 ]]; then
  echo "==> Building the web app..."
  (cd NextJS && npm ci --no-audit --no-fund && NEXT_TELEMETRY_DISABLED=1 npm run build)
fi

echo "==> Starting The Ending..."
cd Go
exec go run .
