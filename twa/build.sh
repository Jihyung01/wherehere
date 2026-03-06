#!/usr/bin/env bash
# WhereHere TWA build script (Mac/Linux)
set -e
cd "$(dirname "$0")"
MANIFEST_URL="https://wherehere-seven.vercel.app/manifest.webmanifest"

if [ ! -d "android" ]; then
  echo "Running bubblewrap init..."
  bubblewrap init --manifest "$MANIFEST_URL"
fi

if [ ! -f "keystore.jks" ]; then
  echo ""
  echo "ERROR: keystore.jks not found. Create it first:"
  echo "  keytool -genkey -v -keystore twa/keystore.jks -alias wherehere -keyalg RSA -keysize 2048 -validity 10000"
  echo ""
  echo "Then update frontend-app/public/.well-known/assetlinks.json with your SHA-256."
  exit 1
fi

echo "Running bubblewrap build..."
bubblewrap build

echo ""
echo "Build succeeded. Outputs:"
echo "  APK: twa/android/app/build/outputs/apk/release/app-release.apk"
echo "  AAB: twa/android/app/build/outputs/bundle/release/app-release.aab (for Play Store)"
