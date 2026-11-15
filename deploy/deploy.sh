#!/usr/bin/env bash
# Deploys one image tag to this host, with an automatic rollback on failure.
#
# Usage: deploy.sh <tag>
# Run from /opt/forumkit, where this script's own directory holds:
#   .env                  - FORUMKIT_TAG, FORUM_SITE, PUBLIC_API_URL, ACME_EMAIL, COMPOSE_FILE
#   forumkit.env          - DATABASE_URL, FORUM_SECRET_KEY, storage/Cognito/AI keys, ...
#   docker-compose.prod.yml, Caddyfile
#
# Only the api service is recreated - caddy is untouched, so no TLS
# renegotiation and no dropped TLS sessions on a deploy. Only bash, curl and
# docker compose are assumed on the host; nothing here is distro-specific.
set -euo pipefail

IMAGE_REPO="ghcr.io/oluwaseun-odueso/forumkit-api"
NEW_TAG="${1:?usage: deploy.sh <tag>}"
ENV_FILE=.env

cd "$(dirname "$0")"

if [ ! -f "$ENV_FILE" ]; then
  echo "missing $ENV_FILE - run the one-time bootstrap first" >&2
  exit 1
fi

read_var() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2-; }

set_tag() {
  grep -v '^FORUMKIT_TAG=' "$ENV_FILE" > "$ENV_FILE.tmp" || true
  echo "FORUMKIT_TAG=$1" >> "$ENV_FILE.tmp"
  mv "$ENV_FILE.tmp" "$ENV_FILE"
}

PREVIOUS_TAG="$(read_var FORUMKIT_TAG)"
PUBLIC_API_URL="$(read_var PUBLIC_API_URL)"

# Pull BEFORE writing the new tag anywhere - a bad tag or a registry outage
# leaves .env, and the running deployment, completely untouched.
echo "Pulling $IMAGE_REPO:$NEW_TAG ..."
FORUMKIT_TAG="$NEW_TAG" docker compose pull api

set_tag "$NEW_TAG"
echo "Starting $NEW_TAG (previous: ${PREVIOUS_TAG:-none}) ..."
docker compose up -d api

rollback() {
  echo "Deploy of $NEW_TAG failed - rolling back." >&2
  docker compose logs --tail=200 api >&2 || true
  if [ -n "$PREVIOUS_TAG" ]; then
    set_tag "$PREVIOUS_TAG"
    docker compose up -d api
  else
    echo "No previous tag recorded - nothing to roll back to." >&2
  fi
  exit 1
}

# Wait for the container's own HEALTHCHECK (up to 120s - matches the
# compose file's start_period plus a few retries).
healthy=0
for _ in $(seq 1 24); do
  cid="$(docker compose ps -q api)"
  status="$(docker inspect --format '{{.State.Health.Status}}' "$cid" 2>/dev/null || echo unknown)"
  if [ "$status" = "healthy" ]; then
    healthy=1
    break
  fi
  sleep 5
done
[ "$healthy" = "1" ] || rollback

# Confirm the deploy through the same path real clients use (through Caddy,
# not a direct container port) - retried since Caddy may still be holding
# in-flight requests from the previous container for a moment.
reached=0
for _ in $(seq 1 6); do
  if curl -fsS --max-time 10 "${PUBLIC_API_URL}/health" > /dev/null; then
    reached=1
    break
  fi
  sleep 5
done
[ "$reached" = "1" ] || rollback

echo "Deploy of $NEW_TAG succeeded."

# Keep only the image just deployed and the one it replaced.
docker image ls "$IMAGE_REPO" --format '{{.Tag}}' \
  | grep -v -E "^(${NEW_TAG}|${PREVIOUS_TAG:-NONE})\$" \
  | xargs -r -I{} docker image rm "$IMAGE_REPO:{}" || true
