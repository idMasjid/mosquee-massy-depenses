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

COPY --from=deps-prod /app/node_modules ./node_modules
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/src/generated ./src/generated
COPY --from=builder /app/prisma ./prisma
COPY prisma.config.ts package.json docker-entrypoint.sh ./

RUN chmod +x ./docker-entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs

ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
