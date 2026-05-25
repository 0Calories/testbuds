#!/bin/bash
set -e

mkdir -p "${DATA_DIR:-/app/data}"

# Start the worker (Stagehand + Chromium + WS + SQLite)
pnpm worker:prod &
WORKER_PID=$!

# Start Next.js in production mode
pnpm start &
NEXT_PID=$!

# Reverse proxy
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &
CADDY_PID=$!

# Forward SIGTERM/SIGINT to children so Fly can shut us down cleanly
trap "kill $WORKER_PID $NEXT_PID $CADDY_PID 2>/dev/null; exit 0" TERM INT

# If any of the three exits, exit the container so Fly restarts everything.
wait -n $WORKER_PID $NEXT_PID $CADDY_PID
exit_code=$?
echo "[start.sh] one of (worker/next/caddy) exited with code $exit_code — shutting down container"
kill $WORKER_PID $NEXT_PID $CADDY_PID 2>/dev/null || true
exit $exit_code
