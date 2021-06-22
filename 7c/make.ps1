clang --target=wasm32 -O3 -flto -nostdlib "-Wl,--no-entry" "-Wl,--export-all" -o script.wasm script.c
