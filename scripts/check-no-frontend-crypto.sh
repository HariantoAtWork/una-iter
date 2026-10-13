#!/usr/bin/env bash
# Fail if the Nuxt app/ tree uses crypto APIs (server-only policy).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="$ROOT/src/unaiter/app"

if [[ ! -d "$APP" ]]; then
  echo "Missing app directory: $APP" >&2
  exit 1
fi

# Match real crypto usage; ignore Nuxt UI "subtle" variants and similar false positives.
matches="$(
  rg -n \
    -g '*.{ts,vue,js,mjs}' \
    -e "from ['\"]node:crypto['\"]" \
    -e "from ['\"]crypto['\"]" \
    -e "require\\(['\"]crypto['\"]\\)" \
    -e "require\\(['\"]node:crypto['\"]\\)" \
    -e "\\bcrypto\\.(subtle|getRandomValues|randomUUID)\\b" \
    -e "\\bwindow\\.crypto\\b" \
    -e "\\bglobalThis\\.crypto\\b" \
    "$APP" || true
)"

if [[ -n "$matches" ]]; then
  echo "Frontend crypto is forbidden (server-only policy). Offending matches:" >&2
  echo "$matches" >&2
  exit 1
fi

echo "OK: no crypto usage under src/unaiter/app/"
