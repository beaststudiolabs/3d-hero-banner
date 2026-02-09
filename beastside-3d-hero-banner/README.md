# Beastside 3D Hero Banner (v0.2.0)

WordPress plugin scaffold for 3D hero banners with:

- Admin-only debug controls (default ON).
- Diagnostics log storage in custom DB table.
- Diagnostics admin panel with status cards, filters, clear/export actions.
- Frontend debug overlay (top-left green text) visible to logged-in admins only.
- Banner post type + per-banner debug override (`inherit|on|off`).
- Shortcode support: `[beastside_hero_banner id="123"]` or `[beastside_hero_banner slug="home-hero"]`.
- Optional Elementor widget registration when Elementor is active.
- Daily retention cleanup for diagnostics (14 days fixed in v1).
- Pre-bundled vendor runtime assets for one-shot plugin install.
- Production Three.js renderer with GLTF + Draco + Meshopt support.
- Structured admin composer controls with real-time in-admin preview.
- Template save/apply workflow, per-save version snapshots, and banner duplicate action.
- Schema-versioned banner/template/settings import-export with conflict modes.

## Vendor Runtime Files (Bundled)

Runtime libraries are preloaded in the plugin package:

- `assets/vendor/three/three.min.js`
- `assets/vendor/three/GLTFLoader.js`
- `assets/vendor/draco/draco_decoder.js`
- `assets/vendor/draco/draco_wasm_wrapper.js`
- `assets/vendor/draco/draco_decoder.wasm`
- `assets/vendor/meshopt/meshopt_decoder.js`

Source/version details are documented in `assets/vendor/VENDOR_SOURCES.md`.

If these files are removed, diagnostics will flag setup warnings and frontend falls back to poster image.
