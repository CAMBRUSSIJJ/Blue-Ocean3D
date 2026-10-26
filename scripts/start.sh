#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if ! command -v python3 >/dev/null; then echo 'É necessário Python 3.' >&2; exit 1; fi
exec python3 scripts/server.py
