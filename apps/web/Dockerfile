FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm
RUN corepack prepare pnpm@9.0.0 --activate
RUN apk update
RUN apk add --no-cache libc6-compat

# --- Stage 1: Prune ---
FROM base AS builder
WORKDIR /app
RUN pnpm add -g turbo@2.7.2
COPY . .
RUN turbo prune web --docker

# --- Stage 2: Install ---
FROM base AS installer
WORKDIR /app
# First install dependencies (as they change less often)
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --no-frozen-lockfile

# --- Stage 3: Build ---
# Build the project and its dependencies
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json

# Set env vars for build time
ENV NEXT_TELEMETRY_DISABLED=1
ENV SKIP_ENV_VALIDATION="1"

RUN pnpm turbo run build --filter=web...

# --- Stage 4: Runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=installer --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

# Automatically leverage output traces to reduce image size
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
