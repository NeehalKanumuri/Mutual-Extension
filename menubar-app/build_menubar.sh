#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/build/The Mutual MenuBar.app"

echo "Building The Mutual MenuBar App..."
mkdir -p "$BUILD_DIR/Contents/MacOS"

# Compile executable with Apple clang
clang -framework Cocoa -framework AppKit \
  "$SCRIPT_DIR/main.m" \
  -o "$BUILD_DIR/Contents/MacOS/The Mutual MenuBar"

# Create Info.plist with LSUIElement=1 (tells macOS to show only in top menu bar / taskbar)
cat << 'EOF' > "$BUILD_DIR/Contents/Info.plist"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>The Mutual MenuBar</string>
    <key>CFBundleIdentifier</key>
    <string>com.themutual.menubar</string>
    <key>CFBundleName</key>
    <string>The Mutual MenuBar</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
EOF

# Code sign with ad-hoc signature for local execution
codesign -s - --force --deep "$BUILD_DIR"

# Link to project root
ln -sf "$BUILD_DIR" "$PROJECT_ROOT/The Mutual MenuBar.app"

echo "✓ Successfully built: $BUILD_DIR"
echo "✓ Symlink created at: $PROJECT_ROOT/The Mutual MenuBar.app"
