# Diff Summary: interactive-lighting-lens-layout-v1

## Objective
Implement admin-first interactive lighting and lens camera controls with drag placement in Live Preview, plus composer UX reflow.

## What Changed
- Upgraded banner scene schema to `sceneSchemaVersion: 2`.
- Added canonical camera lens field (`camera.lensMm`) with legacy `camera.fov` migration.
- Extended lighting schema with `ambientEnabled` and up to 3 `pointLights`.
- Reworked composer markup into a 3-row structure:
  - Row 1: Live Preview (left) + Camera/Lighting controls (right).
  - Row 2: Model 1/2/3 cards in three columns.
  - Row 3: Remaining settings in three columns.
- Added admin composer bridge controls for edit mode and drag plane (`XY`, `XZ`, `YZ`).
- Added admin-preview runtime helpers in `frontend.js`:
  - camera frame helper
  - ambient indicator sphere
  - translucent point-light placeholders
- Added click-drag placement for camera and point lights, with form field synchronization through `bs3d:editor-helper-update`.
- Added editor bridge listener (`bs3d:editor-bridge`) and interaction suppression while edit mode is active.
- Updated admin CSS to support the new row/column layout and control-group presentation.

## Files Changed
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
- `php -l` could not be executed in this environment (`php` CLI unavailable).
