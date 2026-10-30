#!/bin/sh
# Builds module.wasm from viz.c. Needs clang with the wasm32 target (clang --print-targets | grep wasm).
# No libc: -nostdlib, and --allow-undefined lets sin/cos become imports from "env", which the host
# fills from Math. The host enforces the 64 MiB memory limit at run time.
set -e
cd "$(dirname "$0")"
clang --target=wasm32 -nostdlib -O2 -Wl,--no-entry -Wl,--export-all -Wl,--allow-undefined -o module.wasm viz.c
echo "built $(pwd)/module.wasm ($(wc -c < module.wasm) bytes)"
