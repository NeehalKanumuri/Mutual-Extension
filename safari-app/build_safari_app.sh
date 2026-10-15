#!/usr/bin/env bash
set -e

# ==============================================================================
# The Mutual — Safari Web Extension & Native Host App Builder
# Compiles The Mutual.app containing The Mutual Extension.appex for macOS Safari
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILD_DIR="$PROJECT_ROOT/build"
APP_NAME="The Mutual.app"
APP_BUNDLE="$BUILD_DIR/$APP_NAME"
EXTENSION_NAME="The Mutual Extension.appex"
PLUGINS_DIR="$APP_BUNDLE/Contents/PlugIns"
EXTENSION_BUNDLE="$PLUGINS_DIR/$EXTENSION_NAME"

echo "=========================================================="
echo " Building The Mutual for macOS Safari"
echo "=========================================================="

# 1. Clean build directory
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# 2. Create host app bundle layout
mkdir -p "$APP_BUNDLE/Contents/MacOS"
mkdir -p "$APP_BUNDLE/Contents/Resources"
mkdir -p "$PLUGINS_DIR"

# 3. Create extension bundle layout
mkdir -p "$EXTENSION_BUNDLE/Contents/MacOS"
mkdir -p "$EXTENSION_BUNDLE/Contents/Resources"

# 4. Copy Info.plists
cp "$SCRIPT_DIR/App-Info.plist" "$APP_BUNDLE/Contents/Info.plist"
cp "$SCRIPT_DIR/Extension-Info.plist" "$EXTENSION_BUNDLE/Contents/Info.plist"

# 5. Compile Host App executable
echo "Compiling host application..."
clang -framework Cocoa -framework SafariServices \
  "$SCRIPT_DIR/main.m" \
  -o "$APP_BUNDLE/Contents/MacOS/The Mutual"

# 6. Compile Extension Handler bundle
echo "Compiling Safari Extension handler..."
clang -bundle -framework Foundation -framework SafariServices \
  "$SCRIPT_DIR/SafariWebExtensionHandler.m" \
  -o "$EXTENSION_BUNDLE/Contents/MacOS/The Mutual Extension"

# 7. Copy Web Extension assets to Extension Resources
echo "Copying Safari Web Extension resources..."
cp -R "$PROJECT_ROOT/safari-extension/"* "$EXTENSION_BUNDLE/Contents/Resources/"

# 8. Copy icons to App Resources
if [ -d "$PROJECT_ROOT/icons" ]; then
  cp -R "$PROJECT_ROOT/icons" "$APP_BUNDLE/Contents/Resources/"
fi

# 9. Sign bundles with ad-hoc signature (standard for local developer execution)
echo "Code signing Extension and App bundles..."
codesign -s - --force --deep "$EXTENSION_BUNDLE"
codesign -s - --force --deep "$APP_BUNDLE"

# 10. Also link to project root for convenience
ln -sf "$APP_BUNDLE" "$PROJECT_ROOT/$APP_NAME"

echo "=========================================================="
echo " SUCCESS! The Mutual Safari App has been built."
echo " App location: $APP_BUNDLE"
echo " Link location: $PROJECT_ROOT/$APP_NAME"
echo "=========================================================="
echo "To activate in Safari:"
echo "1. Run: open '$APP_BUNDLE'"
echo "2. In Safari: Settings -> Advanced -> Check 'Show features for web developers'"
echo "3. In Safari menu: Develop -> Check 'Allow Unsigned Extensions'"
echo "4. In Safari Settings -> Extensions: Turn ON 'The Mutual'"
echo "=========================================================="
