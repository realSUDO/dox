FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable pnpm
RUN corepack prepare pnpm@9.0.0 --activate
RUN apt-get update && apt-get install -y ca-certificates curl && rm -rf /var/lib/apt/lists/*

# --- Stage 1: Prune ---
FROM base AS builder
WORKDIR /app
RUN pnpm add -g turbo@2.7.2
COPY . .
RUN turbo prune @repo/api --docker

# --- Stage 2: Install ---
FROM base AS installer
WORKDIR /app
COPY .gitignore .gitignore
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --no-frozen-lockfile

# --- Stage 3: Build ---
COPY --from=builder /app/out/full/ .
COPY turbo.json turbo.json
RUN pnpm --filter @repo/database exec prisma generate
RUN pnpm turbo run build --filter=@repo/api...

# --- Stage 4: Runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser
USER apiuser

# Just copy the entire built workspace from the installer!
# This preserves all pnpm symlinks and workspace structures flawlessly.
COPY --from=installer --chown=apiuser:nodejs /app .

EXPOSE 8000
ENV PORT=8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
