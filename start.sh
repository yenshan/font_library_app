#!/bin/bash
set -euo pipefail

# Always run from this project's directory, including when called elsewhere.
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"

# Also support Homebrew installations whose default Node.js symlink is missing.
if ! command -v node >/dev/null 2>&1; then
  for node_bin in /opt/homebrew/opt/node/bin /opt/homebrew/opt/node@22/bin /usr/local/opt/node/bin /usr/local/opt/node@22/bin; do
    if [ -x "$node_bin/node" ]; then
      export PATH="$node_bin:$PATH"
      break
    fi
  done
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js と npm が必要です。インストールしてから再実行してください。" >&2
  exit 1
fi

if [ ! -d node_modules ] || [ ! -x node_modules/.bin/vite ] || [ ! -x node_modules/.bin/electron ]; then
  echo "必要なパッケージをインストールしています…"
  npm ci
fi

echo "Font Dock をビルドしています…"
npm run build

echo "Font Dock を起動しています…"
unset ELECTRON_RUN_AS_NODE
exec npm start
