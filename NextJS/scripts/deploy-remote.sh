#!/usr/bin/env bash
# Runs on the production server from the staged release directory.
set -Eeuo pipefail

RELEASE_ID="${1:?release id required}"
[[ "$RELEASE_ID" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || { echo "Invalid release id" >&2; exit 1; }
SITE='/home/wayne/web/the-ending.connexbiz.com'
RELEASES="$SITE/public_html/web-releases"
RELEASE="$RELEASES/$RELEASE_ID"
CURRENT="$SITE/public_html/dist"
DOMAIN='https://the-ending.connexbiz.com'
PREVIOUS=''
ACTIVATED=0

fail() {
  local code=$?
  trap - ERR
  set +e
  if [[ "$ACTIVATED" == 1 && -n "$PREVIOUS" ]]; then
    ln -sfn "$PREVIOUS" "$CURRENT.rollback" && mv -Tf "$CURRENT.rollback" "$CURRENT"
    echo "Release verification failed; restored $PREVIOUS" >&2
  fi
  # Keep the failed candidate only until diagnosis: drop its heavy build inputs now.
  rm -rf "$RELEASE/node_modules" "$RELEASE/.next" "$RELEASE/.npm-cache"
  exit "$code"
}
trap fail ERR

# Install and build as the site user, never as root (npm runs package install scripts).
# A release-local npm cache keeps this build independent of the shared ~/.npm cache.
chown -R wayne:wayne "$RELEASE"
cd "$RELEASE"
runuser -u wayne -- env HOME=/home/wayne npm_config_cache="$RELEASE/.npm-cache" NEXT_TELEMETRY_DISABLED=1 \
  bash -c 'set -e; npm ci --no-audit --no-fund; npx tsc --noEmit; npx eslint app src; npm run build'
test -s out/index.html
grep -q '/_next/static/' out/index.html
test -s out/.htaccess
test -s out/404.html

# Only the static output is served; build inputs are not kept on the server.
rm -rf node_modules .next .npm-cache
chown -R wayne:www-data out
chmod -R a+rX out

if [[ -L "$CURRENT" ]]; then PREVIOUS="$(readlink "$CURRENT")"
elif [[ -e "$CURRENT" ]]; then echo "Refusing to replace non-symlink document root: $CURRENT" >&2; exit 1; fi

ln -sfn "$RELEASE/out" "$CURRENT.next"
mv -Tf "$CURRENT.next" "$CURRENT"
ACTIVATED=1

page() { curl --fail --silent --show-error --location --max-time 30 "$DOMAIN$1" | grep -q '/_next/static/'; }
for path in / /rankings/ /new/ /genres/ /search/ /shorts/ /drama/contract-bride/ /watch/contract-bride/ /my-list/ /history/ \
  /rewards/ /store/ /vip/ /payment/ /wallet/ /me/ /login/ /login/email/ /login/code/ /welcome/ /settings/ /help/ /about/ \
  /admin/ /admin/login/ /admin/dramas/ /admin/dramas/reborn-empire/episodes/ /admin/users/10293847/ /admin/payments/ /admin/settings/; do
  page "$path"
done
asset="$(curl --fail --silent --max-time 20 "$DOMAIN/" | grep -Eo '/_next/static/[^"]+\.js' | head -1)"
curl --fail --silent --show-error --max-time 20 -o /dev/null "$DOMAIN$asset"
curl --fail --silent --show-error --max-time 20 -o /dev/null "$DOMAIN/logo.png"
status="$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 20 "$DOMAIN/no-such-page/")"
[[ "$status" == 404 ]] || { echo "Unknown path returned $status (expected 404)" >&2; false; }

trap - ERR
echo "Release $RELEASE_ID is live; previous root: ${PREVIOUS:-none}"

# Retention: keep the previous release for one hour of rollback, then remove it and older copies.
for old in "$RELEASES"/*; do
  [[ -e "$old" ]] || continue
  [[ "$old" == "$RELEASE" ]] && continue
  if [[ -n "$PREVIOUS" && "$PREVIOUS" == "$old"/* ]]; then
    systemd-run --on-active=1h /bin/rm -rf -- "$old" >/dev/null
  else
    rm -rf -- "$old"
  fi
done
