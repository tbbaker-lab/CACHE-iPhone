#!/bin/bash
set -euo pipefail
TEAM_ID="${1:?Usage: bash scripts/build-ipa.sh TEAM_ID UNIQUE_BUNDLE_ID}"
BUNDLE_ID="${2:?Provide a bundle identifier owned by your team}"
cd "$(dirname "$0")/.."
python3 scripts/verify_assets.py
xcodegen generate
mkdir -p build
SIGNED_BUILD=$(mktemp -d "$PWD/build/signed.XXXXXX")
export TEAM_ID BUNDLE_ID SIGNED_BUILD
python3 - <<'PY'
import os, pathlib, plistlib
path = pathlib.Path(os.environ["SIGNED_BUILD"]) / "ExportOptions.plist"
path.write_bytes(plistlib.dumps({
    "method": "debugging", "signingStyle": "automatic",
    "teamID": os.environ["TEAM_ID"]
}))
PY
xcodebuild -project CACHE.xcodeproj -scheme CACHE -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$SIGNED_BUILD/CACHE.xcarchive" \
  DEVELOPMENT_TEAM="$TEAM_ID" PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID" \
  CODE_SIGN_STYLE=Automatic -allowProvisioningUpdates archive
xcodebuild -exportArchive -archivePath "$SIGNED_BUILD/CACHE.xcarchive" \
  -exportOptionsPlist "$SIGNED_BUILD/ExportOptions.plist" \
  -exportPath "$SIGNED_BUILD/export" -allowProvisioningUpdates
echo "Signed export: $SIGNED_BUILD/export"
