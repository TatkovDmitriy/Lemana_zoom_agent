FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS builder
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/watcher/package.json ./apps/watcher/
RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/watcher ./apps/watcher
RUN pnpm --filter @lemana/shared build
RUN pnpm --filter @lemana/watcher build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/watcher/node_modules ./apps/watcher/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/watcher/dist ./apps/watcher/dist
COPY --from=builder /app/apps/watcher/package.json ./apps/watcher/package.json

WORKDIR /app/apps/watcher
EXPOSE 4000
CMD ["node", "dist/index.js"]
