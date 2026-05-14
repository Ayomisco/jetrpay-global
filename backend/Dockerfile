# ── Stage 1: production dependencies only ────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# ── Stage 2: build (TypeScript → dist/) ──────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ── Stage 3: lean runtime image ───────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 jetrpay

# Production node_modules
COPY --from=deps    --chown=jetrpay:nodejs /app/node_modules ./node_modules

# Compiled output
COPY --from=builder --chown=jetrpay:nodejs /app/dist        ./dist

# package.json needed so Node resolves "type": "module"
COPY --from=builder --chown=jetrpay:nodejs /app/package.json ./package.json

# Migrations folder (available for manual runs via railway one-off commands)
COPY --from=builder --chown=jetrpay:nodejs /app/migrations  ./migrations

USER jetrpay

EXPOSE 3000

CMD ["node", "dist/index.js"]
