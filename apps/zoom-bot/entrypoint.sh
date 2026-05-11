#!/usr/bin/env bash
set -euo pipefail

echo "[entrypoint] starting Xvfb on :99"
Xvfb :99 -screen 0 1280x720x24 -ac &
export DISPLAY=:99
sleep 1

# PulseAudio: Chromium's audio output → virt_sink → FFmpeg reads from
# virt_sink.monitor. The native-protocol-unix socket path must match
# the PULSE_SERVER env var set in the Dockerfile.
echo "[entrypoint] starting PulseAudio with virtual sink"
mkdir -p /tmp/pulse
pulseaudio --start \
  --exit-idle-time=-1 \
  --disallow-exit \
  --log-target=stderr \
  -L "load-module module-native-protocol-unix socket=/tmp/pulseaudio.socket auth-anonymous=1" \
  -L "load-module module-null-sink sink_name=virt_sink sink_properties=device.description=virt_sink" \
  -L "load-module module-virtual-source source_name=virt_source master=virt_sink.monitor" \
  || echo "[entrypoint] pulseaudio --start returned non-zero (often OK in containers)"
sleep 1

# Wait for the unix socket to appear before we set defaults / launch the bot.
for i in $(seq 1 20); do
  if [ -S /tmp/pulseaudio.socket ]; then break; fi
  sleep 0.25
done

pactl set-default-sink virt_sink     || echo "[entrypoint] could not set default sink"
pactl set-default-source virt_sink.monitor || echo "[entrypoint] could not set default source"

echo "[entrypoint] starting zoom-bot"
exec node dist/index.js
