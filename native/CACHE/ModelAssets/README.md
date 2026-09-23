# Included model

`cache-model.gguf` is Qwen2.5-1.5B-Instruct Q4_K_M, 1,117,320,736 bytes, Apache 2.0.

SHA-256: `6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e`.

The local output folder contains the complete model. Git excludes this large binary; the GitHub Mac runner retrieves the pinned file **before building**, verifies it, and includes it as a required app resource. The phone never retrieves the model separately.

The implemented `BundledModelEngine` loads this resource directly through the statically linked llama.cpp runtime. A missing or altered asset fails the build.
