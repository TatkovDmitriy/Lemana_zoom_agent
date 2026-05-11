#!/usr/bin/env bash
set -euo pipefail

# Clean stale locks from previous crash/restart (Railway reuses /tmp across restarts)
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99 2>/dev/null || true

echo "[entrypoint] starting Xvfb on :99"
Xvfb :99 -screen 0 1280x720x24 -ac &
export DISPLAY=:99
sleep 1

# PulseAudio: Chromium audio output → virt_sink → FFmpeg captures from virt_sink.monitor.
#
# Why --daemonize=no with &:
#   --system -D (daemonize) causes a race where the parent exits before modules are
#   fully loaded, so module-native-protocol-unix may never create the socket.
#   Running foreground + shell-backgrounded (&) means modules load synchronously
#   in the same process we started, socket appears predictably.
echo "[entrypoint] starting PulseAudio with virtual sink"
mkdir -p /tmp/pulse /var/run/pulse

# Write a minimal PA config — more reliable than inline -L flags with --system.
cat > /tmp/pa-system.pa << 'PAEOF'
load-module module-native-protocol-unix socket=/tmp/pulseaudio.socket auth-anonymous=1
load-module module-null-sink sink_name=virt_sink sink_properties=device.description=virt_sink
load-module module-virtual-source source_name=virt_source master=virt_sink.monitor
PAEOF

unset PULSE_SERVER
pulseaudio --system \
  --daemonize=no \
  --exit-idle-time=-1 \
  --disallow-exit \
  --log-target=stderr \
  -n \
  --file=/tmp/pa-system.pa \
  &

export PULSE_SERVER=unix:/tmp/pulseaudio.socket

# Wait up to 10s for the socket to appear.
for i in $(seq 1 40); do
  if [ -S /tmp/pulseaudio.socket ]; then
    echo "[entrypoint] PulseAudio socket ready (iteration $i)"
    break
  fi
  sleep 0.25
done

if [ ! -S /tmp/pulseaudio.socket ]; then
  echo "[entrypoint] WARNING: PulseAudio socket not found after 10s — audio capture will fail"
fi

pactl set-default-sink virt_sink          || echo "[entrypoint] could not set default sink"
pactl set-default-source virt_sink.monitor || echo "[entrypoint] could not set default source"

echo "[entrypoint] starting zoom-bot"
exec node dist/index.js
