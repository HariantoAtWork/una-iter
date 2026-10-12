#!/usr/bin/env bash
# Local build / multi-arch Hub push / hot-reload dev via compose files.
#
# Usage:
#   ./dc.sh build              # docker compose -f _build.yml build
#   ./dc.sh push               # docker compose -f _push.yml build --no-cache --push
#   ./dc.sh dev                # docker compose -f _dev.yml up -d --build
#   ./dc.sh dev:down           # docker compose -f _dev.yml down
#   ./dc.sh dev:restart        # ./dc.sh dev:down && ./dc.sh dev
#   ./dc.sh <cmd> [args...]    # extra args passed through

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

usage() {
  cat <<'EOF'
Usage:
  ./dc.sh build              # docker compose -f _build.yml build
  ./dc.sh push               # docker compose -f _push.yml build --no-cache --push
  ./dc.sh dev                # docker compose -f _dev.yml up -d --build
  ./dc.sh dev:down           # docker compose -f _dev.yml down
  ./dc.sh dev:restart        # ./dc.sh dev:down && ./dc.sh dev
  ./dc.sh <cmd> [args...]    # extra args passed through
EOF
  exit "${1:-0}"
}

cmd="${1:-}"
[[ -n "$cmd" ]] || usage 1
shift || true

case "$cmd" in
  build)
    exec docker compose -f _build.yml build "$@"
    ;;
  push)
    exec docker compose -f _push.yml build --no-cache --push "$@"
    ;;
  dev)
    exec docker compose -f _dev.yml up -d --build "$@"
    ;;
  dev:down)
    exec docker compose -f _dev.yml down "$@"
    ;;
  dev:restart)
    "$0" dev:down "$@"
    exec "$0" dev "$@"
    ;;
  -h|--help|help)
    usage 0
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    usage 1
    ;;
esac
