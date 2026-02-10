# Beastside 3D Hero Banner: Canonical PRD Addendum

## Purpose
This document is the canonical source of approved requirements and acceptance criteria for the current build stream. It captures decisions made across this chat timeline and is paired with `BUILD_LOG.md`, `FEATURE_MATRIX.md`, and checkpoint manifests.

## Product Goal
- Primary goal: use a high-impact 3D hero banner to increase whitelist/signup conversion intent for the multiplayer game website.
- Plugin scope: 3D visual layer only.
- Hero copy and CTA controls are owned by Elementor/theme content systems.

## Launch Scope (Current)
- Embedding surfaces:
- Elementor widget.
- Shortcode API.
- Runtime model strategy:
- GLB/GLTF runtime with conversion workflow from FBX.
- Diagnostics/debug:
- Global debug controls with default ON.
- Per-banner override support (`inherit|on|off`).
- Backend diagnostics panel and log pipeline.
- Frontend admin-only debug overlay (top-left green text).
- Production workflows:
- Structured admin composer UI with live draft preview.
- Template save/apply.
- Snapshot versioning + restore.
- Duplicate banner action.
- Schema-versioned import/export with conflict policies.

## Canonical Requirements

### Global Debug Controls
- `bs3d_debug_enabled` default `true`.
- `bs3d_debug_verbosity` values: `errors|normal|verbose`, default `normal`.
- `bs3d_debug_overlay_enabled` default `true`.
- `bs3d_debug_retention_days` fixed to `14` in v1 UI (read-only).
- Manual clear logs action is available to admins.

### Per-Banner Debug Override
- Banner metadata includes `debugOverride`:
- `inherit` (default).
- `on`.
- `off`.
- Effective resolution:
- `on` forces enabled.
- `off` forces disabled.
- Otherwise inherit global toggle.

### Diagnostics Panel
- Admin-only diagnostics page contains:
- Status cards:
- Three.js runtime availability.
- GLTF loader availability.
- Draco decoder configuration.
- Meshopt decoder configuration.
- Elementor widget registration.
- Shortcode registration.
- Last successful render timestamp.
- Last error timestamp.
- Log stream with filters:
- Level: `info|warn|error`.
- Context/surface: `admin-preview|frontend|elementor|shortcode|import-export|startup`.
- Banner ID.
- Slug.
- Export JSON action for filtered results.
- Clear logs action.

### Frontend Debug Overlay
- Rendered inside each banner container.
- Position: top-left.
- Style: green monospace text with readable dark translucent backing.
- Visibility: logged-in admins only.
- Normal mode shows:
- Banner ID/slug.
- Surface mode.
- Device mode.
- Effective quality profile.
- Model load counts.
- Fallback status and reason.
- Last warning/error summary.
- Verbose mode additionally shows:
- Load duration.
- FPS bucket.
- Draw call estimate.

### Production Renderer
- Frontend renderer must use bundled runtime assets:
- `THREE.GLTFLoader`.
- `THREE.DRACOLoader` with decoder path `assets/vendor/draco/`.
- `MeshoptDecoder` from `assets/vendor/meshopt/meshopt_decoder.js`.
- Model URLs must pass a pre-load normalization pipeline before GLTF fetch.
- Supported normalization rules in v1:
- GitHub `blob` URLs to `raw.githubusercontent.com`.
- Dropbox share URLs to direct/raw URLs.
- Protocol-relative URLs (`//...`) resolved against current page protocol.
- Renderer must reject invalid/empty/non-direct model URLs before load attempt.
- On HTTPS pages, HTTP model URLs must be blocked as mixed content before load attempt.
- For `admin-preview` only, if direct fetch fails due to network/CORS or mixed-content constraints, renderer may retry through a secured WordPress admin proxy endpoint.
- Admin model proxy fallback requirements:
- `manage_options` capability required.
- Request nonce required.
- URL scheme restricted to `http|https`.
- Hostname must not be local/private IP target.
- Path must target `.glb` or `.gltf`.
- Max runtime models in v1: `3`.
- Scene schema includes explicit sections:
- `sceneSchemaVersion`.
- `models[]`.
- `background`.
- `camera`.
- `lighting`.
- `interactions`.
- `fallback`.
- `render_success` must be logged only after:
- all required models are loaded, and
- at least one frame has rendered.
- If fallback timeout/error is activated, late async model completions must not restart rendering for that cycle.

### Admin Composer
- Banner editor uses structured controls as canonical authoring interface.
- Real-time preview uses same renderer pipeline (`surface=admin-preview`).
- Draft edits update preview immediately.
- Persistent writes only occur on explicit post save/update.
- Supports model/media selection, transforms, background mode switching, camera/interactions, lighting, poster fallback, and timeout tuning.

### Reuse Workflows
- Template entity: `bs3d_template` CPT.
- Save current banner as template.
- Apply template to banner.
- Version snapshots:
- Snapshot created on banner save.
- Restore prior version action.
- Duplicate banner action creates independent banner record.

### Import / Export
- JSON package is schema-versioned (`schemaVersion`).
- Supports:
- Single banner export/import.
- Bulk export/import (banners + templates + plugin settings).
- Conflict modes:
- `skip`.
- `overwrite_by_slug`.
- `import_as_copy`.
- Import/export outcomes logged to diagnostics with `surface=import-export`.

### Events and Diagnostics Shape
- Frontend emits debug events:
- `bs3d.debug_status`
- `bs3d.debug_warning`
- `bs3d.debug_error`
- `bs3d.debug_overlay_rendered`
- Runtime/behavioral events emitted:
- `bs3d.banner_loaded`
- `bs3d.banner_visible`
- `bs3d.interaction_start`
- `bs3d.interaction_end`
- `bs3d.fallback_shown`
- `bs3d.load_error`
- Diagnostics record shape:
- `timestamp`
- `level`
- `bannerId`
- `slug`
- `surface`
- `code`
- `message`
- `meta`
- Model fetch diagnostics metadata fields:
- `modelUrlOriginal`
- `modelUrlResolved`
- `normalizationRule`
- `hint`
- Model fetch error code taxonomy includes:
- `network_or_cors_blocked`
- `mixed_content_blocked`
- `unsupported_or_not_direct_url`
- `unknown_model_load_error`

### Retention and Safety
- Diagnostics are persisted in plugin-managed DB table.
- Cleanup runs daily.
- Retention policy: keep last 14 days, delete older records.
- Do not store PII/secrets in persisted metadata.
- URLs and error payloads are sanitized before storage/display/export.

### Vendor Asset Packaging
- Vendor runtime assets must be bundled in plugin package so installation is one shot.
- Required bundled runtime files:
- `assets/vendor/three/three.min.js`
- `assets/vendor/three/GLTFLoader.js`
- `assets/vendor/three/DRACOLoader.js`
- `assets/vendor/draco/draco_decoder.js`
- `assets/vendor/draco/draco_wasm_wrapper.js`
- `assets/vendor/draco/draco_decoder.wasm`
- `assets/vendor/meshopt/meshopt_decoder.js`
- License/source metadata must be documented in `assets/vendor/VENDOR_SOURCES.md`.
- Diagnostics setup cards should resolve runtime/decoder availability from bundled assets after plugin install.

## Acceptance Criteria
1. New install has global debug enabled by default.
2. Admin can disable debug globally; non-critical logging/overlay respects disabled state.
3. Per-banner override supersedes global state as designed.
4. Overlay is visible to logged-in admins only and never public visitors.
5. Overlay appears top-left in green text and shows expected status fields.
6. Diagnostics panel shows setup status and filtered logs.
7. Known runtime issues (missing loader/runtime, timeout/fallback paths) generate diagnostic records.
8. 14-day retention cleanup runs and removes older records.
9. Elementor and shortcode rendering paths continue to work with debug both on/off.
10. Normal debug mode introduces minimal runtime overhead.
11. Renderer loads GLTF models using bundled Draco/Meshopt support.
12. `render_success` is emitted only after real render readiness criteria are met.
13. Admin composer preview reflects unsaved draft edits in real time.
14. Template apply/save, version restore, and duplicate workflows are available to admins.
15. Import/export supports single and bulk packages with conflict-mode controls.
16. Save-state docs/checkpoint artifacts are updated for each accepted change.
17. Model fetch failures are classified with actionable diagnostics and URL normalization metadata.
18. Admin preview can recover from CORS/network fetch failures via secure proxy fallback without changing public shortcode API.
19. Plugin activation must produce no unexpected output (including UTF-8 BOM leakage from PHP files).
20. Published shortcode/Elementor banners can recover from direct fetch CORS/network failures using signature-validated, banner-bound proxy fallback (not open proxy).
21. Banner composer provides per-banner viewport mode (`standard` or `fullscreen`) and fullscreen mode renders at viewport height on published pages.
22. In Elementor `standard` mode, banners auto-stretch to the widget/container height (with 340px fallback when parent height is not defined), and runtime canvas resizes when container layout changes without requiring window resize.
23. Admin UI surfaces (Settings, Diagnostics, Banner Composer) support a modern glass/bubble presentation layer while preserving existing control behavior and data flow.
24. Admin UI v2 styling uses a dark glass palette with always-visible control outlines, a 30/70 Composer layout split on desktop (responsive stack on smaller screens), and viewport-smart Live Preview sizing while preserving existing workflows.
25. Admin visual updates must be cache-busted on delivery so updated CSS/JS appears immediately after plugin update/install.
26. Admin Composer and all plugin admin screens maintain readable text and visible idle control outlines under dark theme styling, including Composer token scope and placeholder legibility.
27. Scene schema v2 is supported with canonical camera lens selection (`camera.lensMm`) and lighting extensions (`lighting.ambientEnabled`, `lighting.pointLights` up to 3), with backward migration from legacy `camera.fov`.
28. Admin preview supports dedicated edit mode for camera/point lights with axis-plane constrained drag placement (`XY`, `XZ`, `YZ`) and updates draft form coordinates in real time.
29. Admin-only helper visuals (camera frame + ambient indicator + point-light placeholders) are rendered only on `admin-preview` surface and never on Elementor/shortcode frontend surfaces.
30. Banner Composer layout supports the requested 3-row UX structure: row 1 preview + camera/lighting, row 2 model cards in 3 columns, row 3 remaining settings in 3 columns with responsive collapse.
31. Scene schema v3 is supported with `lighting.ambientPosition.{x,y,z}` persisted and sanitized with backward-safe defaults.
32. Admin preview uses TransformControls-based drag editing for `ambient`, `pointLight1-3`, and `model1-3` with XY/XZ/YZ plane constraints.
33. Camera frame helper remains visible as a non-draggable guide in admin preview.
34. Admin preview provides thin grid overlay (default ON), axes toggle, and selected-target floating XYZ label toggle without persisting these UI states into scene payload.
35. Drag updates in admin preview mutate runtime + form coordinates directly without full preview re-bootstrap blink during active drag.

## Non-Negotiable Defaults
- Debug mode defaults ON.
- Overlay defaults ON but admin-only.
- Retention fixed at 14 days in v1.
- Checkpoint and docs updates are mandatory for every accepted change.
- Admin capability requirement for mutation actions remains `manage_options`.

## Save-State Standard
- Root folder: `beastside-3d-hero-banner/project-state`.
- Checkpoint folder naming: `beastside-3d-hero-banner/project-state/checkpoints/YYYYMMDD-HHMMSS-change-slug`.
- Required files inside each checkpoint folder:
- `diff-summary.md`
- `restore.md`
- Save-state storage policy (docs-only, effective 2026-02-09):
- Do not store `source.zip` snapshots.
- Do not require `manifest.json`.
- Checkpoints are lightweight markdown records only.
- Historical binary checkpoint artifacts may be pruned to reduce workspace bloat.
- Checkpoint trigger: every accepted change that modifies code, configuration, or documentation in build scope.
- Rollback default: latest stable checkpoint in `CHECKPOINT_INDEX.md`, unless a specific checkpoint ID is requested.

## Interface Standards
- `BUILD_LOG.md` required entry fields:
- `checkpoint_id`
- `date_utc`
- `request`
- `decision`
- `files`
- `risks`
- `validation`
- `next_actions`
- `FEATURE_MATRIX.md` ID format:
- `BS3D-F###`
- IDs are immutable after creation.

## Workflow Rules
1. Read latest `PRD_ADDENDUM_CANONICAL.md`, `BUILD_LOG.md`, `FEATURE_MATRIX.md`, and latest checkpoint markdown notes.
2. Implement accepted change.
3. Update all three core docs.
4. Create checkpoint folder with required files.
5. Append or update `CHECKPOINT_INDEX.md`.
6. Run validation checklist and record outcomes in `BUILD_LOG.md`.
7. Mark relevant feature rows as `validated` only after checks pass.

## Validation Scenarios
1. Save-state integrity:
- Check required checkpoint files exist.
- Confirm checkpoint markdown notes are complete and executable.
2. Documentation consistency:
- Ensure each checkpoint has corresponding entries in `BUILD_LOG.md` and `CHECKPOINT_INDEX.md`.
- Ensure each implemented feature row maps to at least one checkpoint ID.
3. Traceability:
- Select any feature row and confirm linked files and evidence match checkpoint artifacts.
4. Rollback drill:
- Restore from latest stable checkpoint and verify expected structure and docs.
5. Context continuity:
- Verify a new contributor can determine current state and next action from the 3-doc set.

## Change History
| checkpoint_id | date_utc | summary |
|---|---|---|
| 20260209-101640-baseline-full-chat | 2026-02-09T10:16:40Z | Initial canonical backfill from full chat scope (core + diagnostics). |
| 20260209-103356-vendor-assets-preload | 2026-02-09T10:33:56Z | Vendored Three.js/GLTFLoader/Draco/Meshopt assets for one-shot plugin installation and updated source/license documentation. |
| 20260209-110018-wp-smoke-validation | 2026-02-09T11:00:18Z | Recorded green diagnostics smoke validation and updated evidence for BS3D-F011 through BS3D-F021. |
| 20260209-110019-renderer-foundation | 2026-02-09T11:00:19Z | Replaced simulated runtime with real GLTF renderer pipeline and true render-success/fallback diagnostics. |
| 20260209-110020-admin-composer-v1 | 2026-02-09T11:00:20Z | Delivered structured admin composer controls and live admin preview driven by draft state. |
| 20260209-110021-template-versioning | 2026-02-09T11:00:21Z | Added template workflows, per-save version snapshots, restore action, and duplicate banner workflow. |
| 20260209-110022-import-export-v1 | 2026-02-09T11:00:22Z | Added schema-versioned import/export package workflows with conflict handling and diagnostics logging. |
| 20260209-110602-renderer-timeout-guard | 2026-02-09T11:06:02Z | Hardened renderer fallback path to block late async loads from triggering false success after timeout/error. |
| 20260209-111549-qa-and-release-docs | 2026-02-09T11:15:49Z | Added formal QA execution report and v0.2.0 release checklist artifacts after GitHub push. |
| 20260209-120529-model-fetch-normalization-fix | 2026-02-09T12:05:29Z | Added model URL normalization, mixed-content/invalid URL guards, and classified fetch diagnostics for CORS/network issues. |
| 20260209-123342-model-fetch-proxy-fallback | 2026-02-09T12:33:42Z | Added secure admin-preview model proxy fallback and frontend retry path for direct fetch failures. |
| 20260209-123937-model-fetch-proxy-cachebust | 2026-02-09T12:39:37Z | Bumped plugin version to 0.2.1 to force frontend cache-bust for model proxy fallback rollout and updated checkpoint linkage. |
| 20260209-124728-activation-output-bom-fix | 2026-02-09T12:47:28Z | Removed UTF-8 BOM from included PHP file to eliminate activation-time unexpected output bytes. |
| 20260209-125515-save-state-docs-only-and-proxy-parse-fix | 2026-02-09T12:55:15Z | Switched checkpoints to markdown-only storage (no source zip/manifest) and fixed admin proxy GLB parse path via fetch+GLTFLoader.parse. |
| 20260210-010938-frontend-safe-proxy-and-fullscreen | 2026-02-10T01:09:38Z | Added signed public-safe model proxy fallback for published banners and introduced per-banner fullscreen viewport mode (100vh/100dvh). |
| 20260210-050120-elementor-auto-stretch-height | 2026-02-10T05:01:20Z | Added Elementor standard-mode container auto-stretch height chain and ResizeObserver runtime sizing updates to prevent capped published banner height. |
| 20260210-061745-admin-ui-bubble-refresh-v1 | 2026-02-10T06:17:45Z | Applied admin-first modern bubble/glass visual refresh to Settings, Diagnostics, and Composer with scoped markup shells and responsive styling. |
| 20260210-082110-admin-dark-30-70-layout-v2 | 2026-02-10T08:21:10Z | Applied admin dark-glass v2 refinements: warm palette tokens, stronger default control outlines, 30/70 Composer split, viewport-smart Live Preview sizing, and Data Transfer shell/panel parity. |
| 20260210-085621-admin-cache-bust-hotfix | 2026-02-10T08:56:21Z | Added filemtime-based admin asset cache-busting and bumped plugin version to 0.2.6 so new admin visuals reliably appear after update/install. |
| 20260210-092423-admin-legibility-rebalance-v2 | 2026-02-10T09:24:23Z | Fixed dark-theme legibility by hardening Composer token scope, rebalancing neutral contrast, adding fallback-safe color vars, and explicit placeholder styling; bumped version to 0.2.7. |
| 20260210-105945-interactive-lighting-lens-layout-v1 | 2026-02-10T10:59:45Z | Added scene schema v2 (lens camera + ambient toggle + point lights), admin-only interactive helper drag placement in preview, and composer 3-row UX reflow (preview/camera-lighting, models, remaining settings). |
| 20260210-122522-ambient-gizmo-grid-model-drag-v1 | 2026-02-10T12:25:22Z | Upgraded to scene schema v3 with `ambientPosition`, switched ambient runtime to hemisphere light, added TransformControls-based admin drag for ambient/point/model targets, and added admin-preview grid/axes/selected XYZ label toggles with no public helper rendering. |
