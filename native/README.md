# CACHE — AI inside the app

CACHE is a native iPhone app with Qwen2.5-1.5B-Instruct Q4_K_M (1,117,320,736 bytes) and the llama.cpp b5046 inference runtime built into the app. Chat history and reference retrieval stay on-device. No account, API key, model setup screen or first-launch model download is used.

The GitHub build downloads checksum-pinned assets **on the Mac build machine**, then packages them inside the IPA. Downloading the finished IPA gives the phone everything at once. The local deliverable folder also contains these assets.

The AI is a small local model; it is not ChatGPT and does not have ChatGPT's capability or up-to-date information. The bundled reference library is a small starter library, not a comprehensive survival manual.

## Build

The active native project lives in the repository's `native/` folder; older React Native files at repository root are preserved and not used by this workflow.

GitHub Actions: **CACHE bundled AI IPA**, branch `codex/cache-bundled-ai-20260923`. It builds an ARM64 iPhone executable, checks the actual IPA's model checksum, runs Simulator tests (including real inference), then uploads the IPA and test evidence.

On a Mac with Xcode and XcodeGen:

```sh
python3 scripts/prepare_assets.py  # unnecessary if the full local asset folder is present
xcodegen generate
bash scripts/build-unsigned.sh
```

The result is `build/export/CACHE-bundled-AI-unsigned.ipa`. It is compiled for iPhone but needs Apple device signing before installation. No Apple signing certificate or profile is stored in this project.

## Sign for your iPhone

For an unsigned IPA, use a signing/install tool such as AltStore or SideStore with your own Apple account. Install the entire IPA; the model is already inside it. Do not send Apple passwords or signing private keys in chat.

Alternatively, on a Mac with an Apple development team configured in Xcode:

```sh
bash scripts/build-ipa.sh TEAM_ID UNIQUE_BUNDLE_ID
```

This requests Apple's normal automatic development signing and exports a signed IPA. The team, bundle identifier and connected/registered device must match the provisioning profile. A signing error must be resolved in the Apple account; GitHub cannot create an Apple identity.

## Included

- Compact black/white Chat and Library UI with original CACHE icon artwork.
- White send button for non-empty text; starter suggestions disappear on first send.
- Streamed local responses, Stop, recent context, and background cancellation.
- Saved conversations; in-flight replies remain in their original conversation.
- Local reminder scheduling and deletion.
- Mandatory bundled model, static inference runtime, reference data and licences.

Requires iOS 17+. Device memory, speed and battery use still need testing on your actual iPhone. CPU inference is used in Simulator; Metal acceleration is enabled on device.

Sources: [official Qwen model](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF), [llama.cpp](https://github.com/ggml-org/llama.cpp/tree/b5046). See `scripts/assets.lock.json` for pinned hashes, and `CACHE/Resources/*LICENSE.txt` for licences.
