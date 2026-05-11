#!/bin/bash
set -e

echo "[entrypoint] starting Xvfb on :99"
Xvfb :99 -screen 0 1280x720x24 -ac &
export DISPLAY=:99
sleep 1

echo "[entrypoint] starting PulseAudio"
pulseaudio --start --exit-idle-time=-1 --daemonize=yes
sleep 1

echo "[entrypoint] starting zoom-bot"
exec node dist/index.js
