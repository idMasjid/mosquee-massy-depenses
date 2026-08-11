# syntax=docker/dockerfile:1

# ---- base ---------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app

# ---- deps: full install (incl. devDependencies), needed to run `next build` -
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# ---- deps-prod: production-only install, shipped in the final image -----
FROM base AS deps-prod
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- builder: generate the Prisma client and compile the app ------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build && rm -rf .next/cache

# ---- runner: minimal production image ------------------------------------
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -S nodejs -g 1001 && adduser -S nextjs -u 1001 -G nodejs
# su-exec drops root privileges after the entrypoint fixes ownership of the
# mounted data volumes — see docker-entrypoint.sh.
RUN apk add --no-cache su-exec

COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY prisma.config.ts package.json docker-entrypoint.sh ./

RUN chmod +x ./docker-entrypoint.sh && chown -R nextjs:nodejs /app

# Stays root here on purpose: named volumes are created root-owned on first
# mount, regardless of this chown (which only affects the image layer, not
# volumes attached later at runtime). docker-entrypoint.sh fixes their
# ownership at startup, then drops to `nextjs` via su-exec before running
# migrations or the server — the app itself never runs as root.

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
