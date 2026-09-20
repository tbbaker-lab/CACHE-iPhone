# CACHE iPhone App

CACHE is a black-and-white, mobile-first offline AI assistant for iPhone. It uses an on-device language model with a local survival/first-aid reference library.

## What is already built

- Exact CACHE branding and app icon from the approved artwork.
- Logo-only animated startup.
- Compact Chat / Library home screen inspired by the approved layout.
- Smooth button, drawer, message, typing and splash animations.
- Saved chats and recent-chat drawer.
- Local knowledge cards for first aid, water, shelter, power, navigation, sanitation, fire and more.
- Local retrieval that adds useful reference notes to the on-device model.
- Real on-device conversational AI using React Native ExecuTorch.
- No cloud AI API is used for normal chat.
- Medical safety instructions are built into the system prompt.

## Offline behavior

The first launch needs internet once so the on-device AI model can download and cache itself. After that model download completes, inference runs on the iPhone and normal chat can work without internet. React Native ExecuTorch handles model download/caching and conversation inference locally.

The selected model is Liquid AI LFM 2.5 1.2B through the React Native ExecuTorch model registry. If you later want a smaller build/download, switch the model constant in `App.tsx` to a smaller supported preset.

## Requirements

- iPhone running iOS 17 or newer.
- Native development build. Expo Go cannot run ExecuTorch because the AI runtime uses native C++ libraries.
- For compiling iOS, macOS/Xcode is required somewhere. The included GitHub Actions workflow does this on a macOS runner even if your own computer is Windows.

## Build an unsigned IPA from Windows using GitHub

1. Create a GitHub repository and upload this project.
2. Push it to the `main` branch.
3. Open the repository's **Actions** tab.
4. Run **Build CACHE unsigned IPA**.
5. Download the `CACHE-unsigned-ipa` artifact when the workflow finishes.
6. Sign/install the IPA with SideStore/AltStore or your Apple developer signing route.

The IPA produced by the workflow is deliberately unsigned. Apple still requires the final app to be signed for your device. A free Apple account generally requires periodic re-signing; paid distribution uses Apple's normal developer distribution process.

## Local developer commands

```bash
npm install
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
npx expo run:ios --device
```

## Test conversation

After the model is ready, test:

1. `hello`
2. `I'm freezing and I have two blankets`
3. `what did I just tell you I had?`

The third message should show multi-turn conversational memory.
