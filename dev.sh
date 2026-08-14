#!/usr/bin/env bash
# Starts everything: postgres+redis (docker), backend api, worker, frontend.
# Ctrl-C stops the node processes; containers keep running (docker compose -f backend/docker-compose.yml down to stop them).
set -euo pipefail
cd "$(dirname "$0")"

if ! docker info >/dev/null 2>&1; then
  echo "starting Docker Desktop..."
  open -a Docker
  until docker info >/dev/null 2>&1; do sleep 2; done
fi

docker compose -f backend/docker-compose.yml up -d --wait

# both idempotent; needed on a fresh docker volume
pnpm --dir backend exec prisma migrate deploy
pnpm --dir backend exec tsx db/migrate.ts

# ponytail: plain background jobs + trap. Swap for concurrently/overmind if you want prefixed logs.
trap 'kill 0' EXIT
pnpm --dir backend dev &
pnpm --dir backend exec tsx watch src/worker.ts &
pnpm --dir frontend dev &
wait
