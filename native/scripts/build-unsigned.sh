#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/verify_assets.py
xcodegen generate
xcodebuild -project CACHE.xcodeproj -scheme CACHE -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath build/device \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build
STAGE=$(mktemp -d "$PWD/build/package.XXXXXX")
mkdir "$STAGE/Payload"
ditto build/device/Build/Products/Release-iphoneos/CACHE.app "$STAGE/Payload/CACHE.app"
mkdir -p build/export
ditto -c -k --keepParent "$STAGE/Payload" build/export/CACHE-bundled-AI-unsigned.ipa
python3 scripts/verify_ipa.py build/export/CACHE-bundled-AI-unsigned.ipa
