"""Fail the build if the mandatory local model/runtime are missing or mismatched."""
import hashlib
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
lock = json.loads((ROOT / "scripts/assets.lock.json").read_text())
model = ROOT / lock["model"]["path"]
assert model.is_file(), "Run python3 scripts/prepare_assets.py on the BUILD MACHINE."
assert model.stat().st_size == lock["model"]["bytes"], "Incomplete model"
with model.open("rb") as f:
    assert f.read(4) == b"GGUF", "Invalid GGUF header"
    f.seek(0)
    digest = hashlib.sha256()
    while block := f.read(8 * 1024 * 1024):
        digest.update(block)
    assert digest.hexdigest() == lock["model"]["sha256"], "Model checksum mismatch"
runtime = ROOT / lock["runtime"]["path"]
assert (runtime / "ios-arm64/llama.framework/llama").is_file(), "Missing iPhone inference runtime"
assert (runtime / "ios-arm64_x86_64-simulator/llama.framework/llama").is_file(), "Missing Simulator runtime"
for name in ["Qwen-LICENSE.txt", "llama-LICENSE.txt"]:
    assert (ROOT / "CACHE/Resources" / name).is_file(), "Missing third-party licence"
print("Bundled model SHA-256 and iPhone/Simulator runtime verified.")
