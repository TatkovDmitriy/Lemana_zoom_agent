# syntax=docker/dockerfile:1
# Build context = apps/zoom-bot/ (Railway Root Directory = apps/zoom-bot)
# BOT_MODE=mock: no Python, no Whisper, no system audio — pure Node.js.
# BOT_MODE=real: requires the Zoom Linux SDK binary mounted at /app/zoom-sdk/
#   and a sidecar container (or host) with Xvfb + PulseAudio + FFmpeg +
#   faster-whisper. See README.md for the full production setup guide.

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc --project tsconfig.json

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 4001
CMD ["node", "dist/index.js"]
