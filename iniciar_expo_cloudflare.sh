#!/usr/bin/env bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

PORT=8081
CF_LOG="/tmp/cf_expo_8081.log"
rm -f "$CF_LOG"

cleanup() {
    if [ -n "${CF_PID:-}" ]; then kill "$CF_PID" 2>/dev/null || true; fi
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

fuser -k "${PORT}/tcp" 2>/dev/null || true
pkill -f "cloudflared tunnel --url http://127.0.0.1:${PORT}" 2>/dev/null || true
sleep 0.5

cloudflared tunnel --url "http://127.0.0.1:${PORT}" > "$CF_LOG" 2>&1 &
CF_PID=$!

EXPO_CF_URL=""
for i in {1..30}; do
    if [ -f "$CF_LOG" ]; then
        FOUND=$(grep -o 'https://[a-zA-Z0-9.-]*trycloudflare\.com' "$CF_LOG" 2>/dev/null | head -n1 || true)
        if [ -n "$FOUND" ]; then
            EXPO_CF_URL="$FOUND"
            break
        fi
    fi
    sleep 0.5
done

echo "=================================================================="
echo "🌐 TÚNEL CLOUDFLARE PARA EXPO GO: $EXPO_CF_URL"
echo "=================================================================="

CI=false EXPO_PACKAGER_PROXY_URL="$EXPO_CF_URL" npx expo start -c --port "$PORT"
