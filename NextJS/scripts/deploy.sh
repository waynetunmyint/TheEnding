#!/usr/bin/env bash
# Upload the committed Next.js source, build the static export on the production server,
# activate it atomically at the-ending.connexbiz.com, verify, and roll back on failure.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -n "$(git status --porcelain -- .)" ]]; then
  echo "Deployment requires a clean, committed NextJS source tree." >&2
  exit 2
fi
REVISION="$(git rev-parse HEAD)"
HOST='root@172.104.173.138'
KEY='/Users/waynelord/keys/linode_key'
SITE='/home/wayne/web/the-ending.connexbiz.com'
RELEASE_ID="$(date -u +%Y%m%dT%H%M%SZ)"
# Releases live under public_html (PHP open_basedir allows only that tree) but outside the served root public_html/dist.
RELEASE="$SITE/public_html/web-releases/$RELEASE_ID"
CONTROL='/tmp/the-ending-web-deploy-ssh-%C'
SSH=(ssh -i "$KEY" -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ControlMaster=auto -o ControlPersist=5m -o "ControlPath=$CONTROL" "$HOST")

echo "==> Staging source release $RELEASE_ID ($REVISION)..."
"${SSH[@]}" "mkdir -p '$RELEASE'"
rsync -az --delete \
  --exclude='.git/' --exclude='node_modules/' --exclude='.next/' --exclude='out/' --exclude='.env' --exclude='.env.*' \
  --exclude='*.tsbuildinfo' --exclude='next-env.d.ts' \
  -e "ssh -i $KEY -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ControlMaster=auto -o ControlPersist=5m -o ControlPath=$CONTROL" \
  ./ "$HOST:$RELEASE/"
"${SSH[@]}" "printf '%s\n' '$REVISION' > '$RELEASE/.release-commit'"

echo "==> Installing, checking, building and activating on the server..."
"${SSH[@]}" "bash '$RELEASE/scripts/deploy-remote.sh' '$RELEASE_ID'"
echo "==> The Ending web $RELEASE_ID ($REVISION) is live at https://the-ending.connexbiz.com/"
