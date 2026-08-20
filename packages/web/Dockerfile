# Build from repo root: docker build -f packages/web/Dockerfile .
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
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules
COPY . .
RUN pnpm run build --filter @better-openclaw/core --filter @better-openclaw/web

FROM base AS runner
WORKDIR /app/packages/web
ENV NODE_ENV=production
ENV PORT=3654
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/packages/core /app/packages/core
COPY --from=builder /app/packages/web/.next ./.next
COPY --from=builder /app/packages/web/public ./public
COPY --from=builder /app/packages/web/package.json ./package.json
EXPOSE 3654
CMD ["node", "../../node_modules/next/dist/bin/next", "start"]
