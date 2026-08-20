# Build from repo root: docker build -f packages/api/Dockerfile .
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Every workspace package.json must be present: internal deps use
# workspace:* and pnpm resolves them from the workspace, not the registry.
COPY packages/api/package.json ./packages/api/
COPY packages/bridge/package.json ./packages/bridge/
COPY packages/cli/package.json ./packages/cli/
COPY packages/core/package.json ./packages/core/
COPY packages/db/package.json ./packages/db/
COPY packages/mcp/package.json ./packages/mcp/
COPY packages/mission-control/package.json ./packages/mission-control/
COPY packages/web/package.json ./packages/web/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY . .
RUN pnpm run build --filter @better-openclaw/core --filter @better-openclaw/db --filter @better-openclaw/api

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3456
# pnpm keeps the real packages in /app/node_modules/.pnpm and exposes them to
# each workspace member through packages/<pkg>/node_modules symlinks. Both must
# be copied or nothing resolves at runtime; the root alone is not enough.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/api/dist ./packages/api/dist
COPY --from=builder /app/packages/api/package.json ./packages/api/
COPY --from=builder /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/package.json ./packages/db/
COPY --from=builder /app/packages/db/node_modules ./packages/db/node_modules
EXPOSE 3456
CMD ["node", "packages/api/dist/index.mjs"]
