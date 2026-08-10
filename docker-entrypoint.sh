#!/bin/sh
set -eu

DB_PATH="${DATABASE_URL#file:}"
DATA_DIR="$(dirname "$DB_PATH")"
mkdir -p "$DATA_DIR" "$STORAGE_ROOT"

# `flock` (blocking, no -n) serializes migrations across containers sharing
# the same data volume: if two instances start at once, the second waits for
# the first to finish instead of racing it. `prisma migrate deploy` is
# idempotent, so a container that only had to wait its turn exits cleanly.
LOCK_FILE="$DATA_DIR/.migrate.lock"
echo "Applying database migrations (lock: $LOCK_FILE)..."
if command -v flock >/dev/null 2>&1; then
  flock "$LOCK_FILE" -c "node_modules/.bin/prisma migrate deploy"
else
  echo "Warning: flock not available on this image, migrating without a lock." >&2
  node_modules/.bin/prisma migrate deploy
fi

echo "Starting Next.js on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}..."
exec node_modules/.bin/next start -p "${PORT:-3000}" -H "${HOSTNAME:-0.0.0.0}"
