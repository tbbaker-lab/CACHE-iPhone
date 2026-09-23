"""Build-machine preparation only. This script is never included or run in the app."""
import hashlib
import json
import pathlib
import subprocess
import sys
import urllib.request
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
LOCK = json.loads((ROOT / "scripts/assets.lock.json").read_text())

def digest(path):
    with path.open("rb") as stream:
        value = hashlib.sha256()
        while block := stream.read(8 * 1024 * 1024):
            value.update(block)
        return value.hexdigest()

def download(asset, destination):
    if destination.exists() and digest(destination) == asset["sha256"]:
        print("Verified:", destination.name, flush=True)
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_suffix(destination.suffix + ".partial")
    print("Preparing bundled asset:", asset["name"], flush=True)
    request = urllib.request.Request(asset["url"], headers={"User-Agent": "CACHE-build/1.0"})
    with urllib.request.urlopen(request, timeout=120) as response, partial.open("wb") as output:
        while block := response.read(8 * 1024 * 1024):
            output.write(block)
    if partial.stat().st_size != asset["bytes"] or digest(partial) != asset["sha256"]:
        raise RuntimeError("Asset size/checksum mismatch: " + asset["name"])
    partial.replace(destination)

if __name__ == "__main__":
    download(LOCK["model"], ROOT / LOCK["model"]["path"])
    archive = ROOT / "build-assets/llama-b5046-xcframework.zip"
    download(LOCK["runtime"], archive)
    vendor = ROOT / "Vendor"
    vendor.mkdir(exist_ok=True)
    if sys.platform == "darwin":
        subprocess.run(["ditto", "-xk", str(archive), str(vendor)], check=True)
    else:
        with zipfile.ZipFile(archive) as package:
            package.extractall(vendor)
    subprocess.run([sys.executable, str(ROOT / "scripts/verify_assets.py")], check=True)
