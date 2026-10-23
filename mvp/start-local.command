#!/bin/zsh
set -eu
SITE_DIR="${0:A:h}"
cd "$SITE_DIR"
NODE_BIN="$(command -v node || true)"
if [[ -z "$NODE_BIN" || "$($NODE_BIN -p 'Number(process.versions.node.split(".")[0])')" -lt 24 ]]; then
  NODE_BIN="/Users/kimhoduck/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [[ ! -x "$NODE_BIN" ]]; then
  print 'Node.js 24 이상을 설치한 뒤 npm start로 실행해주세요.'
  exit 1
fi
exec "$NODE_BIN" server.mjs
