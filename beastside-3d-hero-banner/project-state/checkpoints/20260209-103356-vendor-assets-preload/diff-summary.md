# Diff Summary

## Intent
Bundle all runtime vendor assets directly in the plugin package so installation is one shot and diagnostics runtime checks can pass without post-install downloads.

## Key Changes
- Added preloaded vendor runtime assets in `assets/vendor`:
- Three.js runtime (`three.min.js`)
- GLTF loader (`GLTFLoader.js`)
- Draco decoders (`draco_decoder.js`, `draco_wasm_wrapper.js`, `draco_decoder.wasm`)
- Meshopt decoder (`meshopt_decoder.js`)
- Added source/license provenance doc at `assets/vendor/VENDOR_SOURCES.md`.
- Updated README vendor section to reflect bundled assets.
- Updated project-state canonical docs, feature matrix, build log, and checkpoint index.

## Artifact Files
- `source.zip`
- `manifest.json`
- `diff-summary.md`
- `restore.md`
