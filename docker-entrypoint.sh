#!/bin/sh
set -eu

DB_PATH="${DATABASE_URL#file:}"
DATA_DIR="$(dirname "$DB_PATH")"
mkdir -p "$DATA_DIR" "$STORAGE_ROOT"

# Named volumes are created root-owned on first mount, no matter what the
# image's Dockerfile chown'd at build time. Running as root here to fix that,
# then dropping to the unprivileged `nextjs` user via su-exec for everything
# else — the app itself never runs as root. Non-recursive: only the mount
# points need fixing, files the app creates afterward are already nextjs-owned.
chown nextjs:nodejs "$DATA_DIR" "$STORAGE_ROOT"

# `flock` (blocking, no -n) serializes migrations across containers sharing
# the same data volume: if two instances start at once, the second waits for
# the first to finish instead of racing it. `prisma migrate deploy` is
# idempotent, so a container that only had to wait its turn exits cleanly.
#
# Command passed as argv (no `-c "string"`): flock's `-c` runs the command
# through `$SHELL -c`, and su-exec sets SHELL from the target account's
# passwd entry — `/sbin/nologin` for a system user, which just prints "This
# account is not available" and exits. Passing argv directly execs the
# binary with no shell involved, sidestepping that entirely.
LOCK_FILE="$DATA_DIR/.migrate.lock"
echo "Applying database migrations (lock: $LOCK_FILE)..."
if command -v flock >/dev/null 2>&1; then
  su-exec nextjs flock "$LOCK_FILE" node_modules/.bin/prisma migrate deploy
  # Same lock, reused: `prisma migrate deploy` never seeds (only `migrate dev`
  # does), so without this the DB comes up schema-only and no one can log in.
  # `seed.ts` is all upserts/count-guards, safe to (re)run on every boot; the
  # lock just keeps two containers starting at once from double-importing
  # the CSV-sourced historical expenses.
  echo "Seeding initial data (admin account, budgets)..."
  su-exec nextjs flock "$LOCK_FILE" node_modules/.bin/tsx prisma/seed.ts
else
  echo "Warning: flock not available on this image, migrating without a lock." >&2
  su-exec nextjs node_modules/.bin/prisma migrate deploy
  su-exec nextjs node_modules/.bin/tsx prisma/seed.ts
fi

echo "Starting Next.js on ${HOSTNAME:-0.0.0.0}:${PORT:-3000}..."
exec su-exec nextjs node_modules/.bin/next start -p "${PORT:-3000}" -H "${HOSTNAME:-0.0.0.0}"
