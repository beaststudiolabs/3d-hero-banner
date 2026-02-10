# Diff Summary: model-visibility-transformcontrols-hotfix

## Objective
Restore model visibility after the TransformControls rollout by ensuring gizmo runtime failures cannot break the renderer/model load pipeline.

## What Changed
- Replaced legacy function-style TransformControls inheritance with class-based inheritance:
  - `class TransformControls extends THREE.Object3D`
- Preserved existing drag behavior, axis visibility toggles, and event dispatch (`dragging-changed`, `objectChange`, etc.).
- Added defensive initialization in `frontend.js` around TransformControls construction:
  - wraps setup in `try/catch`
  - logs warning diagnostic code `transform_controls_unavailable`
  - continues runtime without drag gizmos instead of aborting scene initialization.
- Stripped BOM from `TransformControls.js` to keep file encoding clean.
- Bumped plugin version to `0.2.8` for cache-busting so updated frontend assets load immediately.

## Files Changed
- `beastside-3d-hero-banner/assets/vendor/three/TransformControls.js`
- `beastside-3d-hero-banner/assets/js/frontend.js`
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`

## Validation Notes
- `node --check beastside-3d-hero-banner/assets/vendor/three/TransformControls.js` passed.
- `node --check beastside-3d-hero-banner/assets/js/frontend.js` passed.
- Static verification confirms plugin version updated to `0.2.8`.
- `php -l` was not available in this environment.
