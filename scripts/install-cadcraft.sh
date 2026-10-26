#!/usr/bin/env bash
# Fetch official, unmodified CADCraft WASM static bundle from its tagged upstream release.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VER="${CADCRAFT_VERSION:-0.12.0}"
[[ "$VER" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Versão inválida." >&2; exit 1; }
URL="https://github.com/storytold/cadcraft/releases/download/v${VER}"
FILE="cadcraft-web-${VER}.zip"
for bin in curl unzip sha256sum awk; do command -v "$bin" >/dev/null || { echo "Instale $bin." >&2; exit 1; }; done
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
printf 'Obtendo CADCraft oficial v%s...\n' "$VER"
curl -fL --retry 3 --connect-timeout 15 "$URL/$FILE" -o "$TMP/$FILE"
curl -fL --retry 3 --connect-timeout 15 "$URL/SHA256SUMS.txt" -o "$TMP/SHA256SUMS.txt"
EXPECTED="$(awk -v f="$FILE" '$2 == f || $2 == "*"f {print $1}' "$TMP/SHA256SUMS.txt" | head -1)"
if [[ ! "$EXPECTED" =~ ^[a-fA-F0-9]{64}$ ]]; then echo 'Checksum oficial não encontrado; instalação cancelada.' >&2; exit 1; fi
printf '%s  %s\n' "$EXPECTED" "$TMP/$FILE" | sha256sum --check --status || { echo 'Falha de integridade SHA-256.' >&2; exit 1; }
mkdir -p "$TMP/site"
unzip -q "$TMP/$FILE" -d "$TMP/site"
# The archive may package assets at its root or under a single top-level directory.
SRC="$TMP/site"
if [[ ! -f "$SRC/index.html" ]]; then
  FOUND="$(find "$SRC" -type f -name index.html -print -quit)"
  [[ -n "$FOUND" ]] || { echo 'A build não contém index.html.' >&2; exit 1; }
  SRC="$(dirname "$FOUND")"
fi
DEST="$ROOT/vendor/cadcraft-web"
mkdir -p "$ROOT/vendor"
rm -rf "$DEST.tmp"
mkdir "$DEST.tmp"
cp -a "$SRC"/. "$DEST.tmp/"
printf 'CADCraft v%s\nOrigem: %s\nSHA256: %s\n' "$VER" "$URL/$FILE" "$EXPECTED" > "$DEST.tmp/SOURCE.txt"
rm -rf "$DEST.previous"
if [[ -e "$DEST" ]]; then mv "$DEST" "$DEST.previous"; fi
mv "$DEST.tmp" "$DEST"
rm -rf "$DEST.previous"
printf 'CADCraft pronto em %s\nAcesse http://localhost:4173/app/ e abra a aba CADCraft.\n' "$DEST"
