#!/usr/bin/env bash
# Ships the committed code (HEAD) to the Mochee droplet and restarts it:
#   bash scripts/deploy.sh
# Uploads a clean `git archive`, installs, builds and swaps it in as
# /opt/mochee/app. Uploaded documents and the voice cache live in
# /opt/mochee/shared and are linked in, so a deploy never touches them.
# The keys stay in /etc/mochee.env on the droplet (see docs/deploy.md).
set -euo pipefail

HOST="${MOCHEE_DEPLOY_HOST:-root@138.197.85.46}"
KEY="${MOCHEE_DEPLOY_KEY:-$HOME/.ssh/mochee_deploy}"
SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes -o BatchMode=yes "$HOST")

cd "$(git rev-parse --show-toplevel)"
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  echo "Uncommitted changes: deploy ships HEAD only. Commit first." >&2
  exit 1
fi
REV="$(git rev-parse --short HEAD)"
echo "Deploying $REV to $HOST"

git archive --format=tar HEAD | gzip | "${SSH[@]}" "rm -rf /opt/mochee/next && mkdir -p /opt/mochee/next && tar -xzf - -C /opt/mochee/next"

"${SSH[@]}" "REV=$REV bash -s" <<'REMOTE'
set -euo pipefail
cd /opt/mochee/next
echo "$REV" > REVISION
npm ci --no-audit --no-fund --loglevel=error
npm run build
# Data that outlives deploys.
rm -rf .data tmp
mkdir -p tmp
ln -s /opt/mochee/shared/data .data
ln -s /opt/mochee/shared/tts-cache tmp/tts-cache
chown -R mochee:mochee /opt/mochee/next
rm -rf /opt/mochee/prev
[ -d /opt/mochee/app ] && mv /opt/mochee/app /opt/mochee/prev
mv /opt/mochee/next /opt/mochee/app
systemctl restart mochee
sleep 3
systemctl is-active mochee
curl -fsS -o /dev/null -w "local check: HTTP %{http_code}\n" http://127.0.0.1:4176/
REMOTE
echo "Live: https://138-197-85-46.sslip.io ($REV)"
