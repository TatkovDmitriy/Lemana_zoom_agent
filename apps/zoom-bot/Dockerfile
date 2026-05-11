# syntax=docker/dockerfile:1
# Build context = apps/zoom-bot/ (Railway Root Directory)
# No files from repo root are referenced — fully self-contained.
#
# For BOT_MODE=real you need Ubuntu + Xvfb + PulseAudio + FFmpeg + Whisper.
# Switch back to the full image and restore start.sh once the Zoom SDK is ready.

FROM node:20-alpine AS builder
WORKDIR /app

# Install deps first (better layer caching)
COPY package.json ./
RUN npm install

# Build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc --project tsconfig.json

# ---- runner ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4001
CMD ["node", "dist/index.js"]
