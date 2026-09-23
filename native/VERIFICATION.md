# Verification status

Local checks: the 1.12 GB GGUF model's SHA-256 matches the official pinned Qwen file. The llama.cpp XCFramework archive matches the upstream documented SHA-256. iPhone and Simulator slices and licences are present.

The GitHub workflow checks an ARM64 Mach-O executable, the entire embedded model checksum, library resources and the linked runtime symbol in the produced IPA. It also runs chat persistence/routing tests, prompt/retrieval tests, actual model generation and UI interactions in iOS Simulator.

Cloud execution results will be recorded here once the workflow completes. A workflow definition is not evidence that its tests passed.

Physical-device performance, real notification delivery, and Apple signing are not validated by Simulator tests.
