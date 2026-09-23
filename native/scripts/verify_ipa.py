"""Inspect the actual compiled IPA, including its embedded model bytes."""
import hashlib
import json
import plistlib
import sys
import zipfile
from pathlib import Path
root = Path(__file__).resolve().parents[1]
lock = json.loads((root / "scripts/assets.lock.json").read_text())
ipa = Path(sys.argv[1])
with zipfile.ZipFile(ipa) as archive:
    names = archive.namelist()
    infos = [n for n in names if n.startswith("Payload/") and n.count("/") == 2 and n.endswith(".app/Info.plist")]
    assert len(infos) == 1, "IPA must contain exactly one app"
    prefix = infos[0].removesuffix("Info.plist")
    info = plistlib.loads(archive.read(infos[0]))
    binary = archive.read(prefix + info["CFBundleExecutable"])
    assert binary[:4] == bytes.fromhex("cffaedfe"), "App executable must be 64-bit Mach-O"
    assert int.from_bytes(binary[4:8], "little") == 0x0100000c, "App must contain an ARM64 device executable"
    with archive.open(prefix + "cache-model.gguf") as model:
        value = hashlib.sha256()
        while block := model.read(8 * 1024 * 1024):
            value.update(block)
        actual = value.hexdigest()
    assert actual == lock["model"]["sha256"], "IPA model is missing or altered"
    for name in ["knowledge.json", "Qwen-LICENSE.txt", "llama-LICENSE.txt"]:
        assert prefix + name in names, "Missing bundled resource: " + name
    assert b"llama_model_load_from_file" in binary, "Model runtime symbol missing"
print(json.dumps({"ipa": ipa.name, "model": lock["model"]["name"], "modelSHA256": actual,
                  "arm64Executable": True, "modelInsideIPA": True,
                  "signing": "UNSIGNED - requires device signing"}, indent=2))
