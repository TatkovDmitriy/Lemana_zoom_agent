# syntax=docker/dockerfile:1
# ----------- builder (Alpine) ------------------------------------------------
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/zoom-bot/package.json ./apps/zoom-bot/
RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/zoom-bot ./apps/zoom-bot
RUN pnpm --filter @lemana/shared build
RUN pnpm --filter @lemana/zoom-bot build

# ----------- runner (Ubuntu, ships Xvfb + PulseAudio + FFmpeg) --------------
FROM ubuntu:22.04 AS runner
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates gnupg \
      xvfb pulseaudio \
      ffmpeg \
      libglib2.0-0 libx11-6 libxcb1 libasound2 libxkbcommon0 libnss3 \
      libxcomposite1 libxdamage1 libxrandr2 libxtst6 libdrm2 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/zoom-bot/node_modules ./apps/zoom-bot/node_modules
COPY --from=builder /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/zoom-bot/dist ./apps/zoom-bot/dist
COPY --from=builder /app/apps/zoom-bot/package.json ./apps/zoom-bot/package.json
COPY apps/zoom-bot/start.sh ./apps/zoom-bot/start.sh
RUN chmod +x ./apps/zoom-bot/start.sh

# Drop the Zoom Linux Meeting SDK binary at /app/zoom-sdk/ before enabling
# BOT_MODE=real. See apps/zoom-bot/README.md for download/setup instructions.
RUN mkdir -p /app/zoom-sdk

WORKDIR /app/apps/zoom-bot
EXPOSE 4001
CMD ["./start.sh"]
