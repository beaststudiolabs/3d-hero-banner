# Diff Summary: ambient-gizmo-grid-model-drag-v1

## Objective
Replace camera drag editing with a stable ambient/light/model gizmo workflow in admin preview, add spatial overlays, and keep public frontend behavior unchanged.

## What Changed
- Added local vendor asset `assets/vendor/three/TransformControls.js` and registered/enqueued it through renderer asset registration.
- Updated scene schema to `sceneSchemaVersion: 3` with new `lighting.ambientPosition.{x,y,z}` defaults and sanitization.
- Preserved lens migration behavior (`fov` -> nearest `lensMm`) and existing shortcode/API contracts.
- Updated composer controls and bridge state:
  - Edit targets: `ambient`, `pointLight1..3`, `model1..3`.
  - Drag plane selector: `XY`, `XZ`, `YZ`.
  - Overlay toggles: grid, axes, selected XYZ label (admin session only).
- Frontend runtime (admin preview path):
  - Ambient runtime switched to `THREE.HemisphereLight` and oriented via `ambientPosition`.
  - Added `TransformControls` drag pipeline for ambient/point/model targets.
  - Camera frame helper kept visible as non-draggable guide.
  - Added grid helper + axes helper visibility toggles.
  - Added floating XYZ label for selected target only.
- Drag updates now synchronize coordinates directly back to form fields via helper update events without forced full preview re-bootstrap loops.
- Helpers remain gated to `admin-preview` and are not rendered on Elementor/shortcode frontend surfaces.

## Files Changed
- `beastside-3d-hero-banner/assets/vendor/three/TransformControls.js`
- `beastside-3d-hero-banner/assets/vendor/VENDOR_SOURCES.md`
- `beastside-3d-hero-banner/includes/class-bs3d-renderer.php`
- `beastside-3d-hero-banner/includes/class-bs3d-banner-post-type.php`
- `beastside-3d-hero-banner/assets/js/admin-composer.js`
- `beastside-3d-hero-banner/assets/js/frontend.js`
- `beastside-3d-hero-banner/assets/css/admin.css`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`

## Validation Notes
- `node --check beastside-3d-hero-banner/assets/js/frontend.js` passed.
- `node --check beastside-3d-hero-banner/assets/js/admin-composer.js` passed.
- `node --check beastside-3d-hero-banner/assets/vendor/three/TransformControls.js` passed.
- `php -l` could not be executed in this environment (`php` CLI unavailable).
