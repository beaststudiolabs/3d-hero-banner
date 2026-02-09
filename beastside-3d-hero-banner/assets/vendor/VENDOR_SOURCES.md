# Vendor Asset Sources

All runtime assets in this directory are vendored so plugin install can run in one shot without post-install downloads.

## Three.js Runtime + GLTF Loader
- Library: `three`
- Version: `0.146.0`
- Upstream repository: `https://github.com/mrdoob/three.js`
- Release/tag reference: `r146`
- Download endpoints used:
- `https://unpkg.com/three@0.146.0/build/three.min.js`
- `https://unpkg.com/three@0.146.0/examples/js/loaders/GLTFLoader.js`
- `https://raw.githubusercontent.com/mrdoob/three.js/r146/LICENSE`

## Draco Decoder
- Library: Draco decoder files distributed via three.js examples
- Upstream repository: `https://github.com/mrdoob/three.js`
- Version source: `three@0.146.0`
- Download endpoints used:
- `https://unpkg.com/three@0.146.0/examples/js/libs/draco/draco_decoder.js`
- `https://unpkg.com/three@0.146.0/examples/js/libs/draco/draco_wasm_wrapper.js`
- `https://unpkg.com/three@0.146.0/examples/js/libs/draco/draco_decoder.wasm`

## Meshopt Decoder
- Library: `meshoptimizer` decoder distributed via three.js examples
- Upstream repositories:
- `https://github.com/zeux/meshoptimizer`
- `https://github.com/mrdoob/three.js`
- Version source: `three@0.146.0`
- Download endpoints used:
- `https://unpkg.com/three@0.146.0/examples/js/libs/meshopt_decoder.js`
- `https://raw.githubusercontent.com/zeux/meshoptimizer/master/LICENSE.md`

## Notes
- These files were vendored to satisfy one-shot installation requirements.
- If you upgrade one runtime asset, upgrade the entire runtime set from a matching release to avoid compatibility drift.
