FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:99
ENV PULSE_SERVER=unix:/tmp/pulseaudio.socket

# System deps: display + audio + ffmpeg + python
RUN apt-get update && apt-get install -y \
    xvfb \
    pulseaudio \
    ffmpeg \
    python3 \
    python3-pip \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# faster-whisper
RUN pip3 install faster-whisper

WORKDIR /app

# Install dependencies (including playwright)
COPY package.json ./
# Install all deps (including devDependencies for tsc) — NODE_ENV=production is set below
RUN npm install --include=dev

# Install Playwright + Chromium with all system deps
RUN npx playwright install chromium --with-deps

# Build TypeScript — use local binary to avoid npx resolving wrong global tsc
COPY tsconfig.json ./
COPY src ./src
RUN ./node_modules/.bin/tsc --project tsconfig.json

# Python transcription script
COPY transcribe.py ./

# Entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# Set production mode after build so devDeps were available during compilation
ENV NODE_ENV=production

EXPOSE 4001
CMD ["./entrypoint.sh"]
