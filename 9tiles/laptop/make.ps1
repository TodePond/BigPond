clang --target=wasm32 -flto -nostdlib "-Wl,--allow-undefined" "-Wl,--no-entry" "-Wl,--export-all" -o script.wasm script.c
