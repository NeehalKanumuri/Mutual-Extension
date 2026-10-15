#!/usr/bin/env bash
# ==============================================================================
# The Mutual — One-Click Safari Launcher
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Launching The Mutual for Safari..."

# 1. Open the compiled native macOS Safari Host App
if [ -d "$SCRIPT_DIR/The Mutual.app" ]; then
  open "$SCRIPT_DIR/The Mutual.app"
  echo "✓ Opened 'The Mutual.app' (registers Safari Extension with macOS)"
fi

# 2. Check if backend is running, start in background if needed
if ! curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
  echo "Starting backend server on http://localhost:8000..."
  nohup python3 "$SCRIPT_DIR/backend/app/server.py" > "$SCRIPT_DIR/server.log" 2>&1 &
  sleep 1
fi

# 3. Open Safari to Web Companion
open -a Safari "http://localhost:8000"

echo ""
echo "=========================================================="
echo " The Mutual is ready in Safari!"
echo "=========================================================="
echo "1. In Safari: Settings (⌘,) -> Advanced -> Check 'Show features for web developers'"
echo "2. In Safari menu bar: Develop -> Click 'Allow Unsigned Extensions'"
echo "3. In Safari: Settings (⌘,) -> Extensions -> Turn ON 'The Mutual'"
echo "4. On Google Meet / Zoom / Teams / Slack: Press Option+M (⌥M) to toggle Side Panel!"
echo "=========================================================="
