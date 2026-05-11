#!/usr/bin/env bash
set -euo pipefail

# 1. Virtual display — Zoom SDK requires an X server even when headless.
Xvfb :99 -screen 0 1280x720x24 &
export DISPLAY=:99

# 2. Virtual audio sink — FFmpeg captures from `default` which routes to this.
mkdir -p /tmp/pulse
pulseaudio --start \
  --exit-idle-time=-1 \
  --disallow-exit \
  --log-target=stderr \
  -L "load-module module-null-sink sink_name=virt_sink sink_properties=device.description=virt_sink" \
  -L "load-module module-virtual-source source_name=virt_source master=virt_sink.monitor" \
  --system=false || echo "[start.sh] pulseaudio start returned non-zero (often OK in containers)"

export PULSE_SERVER=unix:/tmp/pulse/native
pactl set-default-sink virt_sink || true
pactl set-default-source virt_sink.monitor || true

# 3. Bot process — listens for join_meeting jobs in Firestore.
exec node dist/index.js
