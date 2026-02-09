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
- `source.zip`
- `manifest.json`
- `diff-summary.md`
- `restore.md`
- Checkpoint trigger: every accepted change that modifies code, configuration, or documentation in build scope.
- Rollback default: latest stable checkpoint in `CHECKPOINT_INDEX.md`, unless a specific checkpoint ID is requested.

## Interface Standards
- `manifest.json` required fields:
- `checkpoint_id`
- `created_utc`
- `change_slug`
- `scope`
- `summary`
- `files_snapshot_root`
- `artifact_sha256`
- `feature_ids`
- `validation` with `syntax`, `manual_checks`, `known_gaps`
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
1. Read latest `PRD_ADDENDUM_CANONICAL.md`, `BUILD_LOG.md`, `FEATURE_MATRIX.md`, and latest checkpoint `manifest.json`.
2. Implement accepted change.
3. Update all three core docs.
4. Create checkpoint folder with required files.
5. Append or update `CHECKPOINT_INDEX.md`.
6. Run validation checklist and record outcomes in `BUILD_LOG.md`.
7. Mark relevant feature rows as `validated` only after checks pass.

## Validation Scenarios
1. Save-state integrity:
- Check required checkpoint files exist.
- Verify `artifact_sha256` matches `source.zip`.
- Confirm restore instructions are complete and executable.
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
