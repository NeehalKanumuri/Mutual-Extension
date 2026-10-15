#!/usr/bin/env bash
# ==============================================================================
# The Mutual — Startup Script
# Starts the Behavioral Alignment Server and Safari Companion
# ==============================================================================

set -e

PORT=${PORT:-8000}

echo "======================================================"
echo "  The Mutual — Behavioral Alignment Platform"
echo "  macOS Safari & Multi-Platform Edition"
echo "======================================================"
echo ""
echo "Starting backend server on port $PORT..."
echo "Safari Web Companion: http://localhost:$PORT"
echo "Safari Mac App:       open 'The Mutual.app'"
echo "Safari Userscript:    the-mutual-safari.user.js"
echo ""
echo "Quick Safari Activation:"
echo " 1. open 'The Mutual.app'"
echo " 2. Safari -> Settings -> Advanced -> Check 'Show features for web developers'"
echo " 3. Safari -> Develop -> Check 'Allow Unsigned Extensions'"
echo " 4. Safari -> Settings -> Extensions -> Turn ON 'The Mutual'"
echo "======================================================"
echo ""

python3 backend/app/server.py
