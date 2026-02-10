# Restore

## Default Rollback Target
- Stable checkpoint remains: `20260209-111549-qa-and-release-docs`.

## Restore This Checkpoint Context
1. Checkout branch `beta-updates`.
2. Apply files from checkpoint commit `20260210-145332-direct-pick-axis-gizmo-model3-fix`.
3. Confirm plugin version is `0.2.9` in `beastside-3d-hero-banner/beastside-3d-hero-banner.php`.
4. Re-run JS syntax checks:
   - `node --check beastside-3d-hero-banner/assets/js/frontend.js`
   - `node --check beastside-3d-hero-banner/assets/js/admin-composer.js`
   - `node --check beastside-3d-hero-banner/assets/vendor/three/TransformControls.js`
5. Validate in WP admin preview:
   - `model3` drag works.
   - Direct center-marker click selects target and syncs edit-mode dropdown.
   - RGB axis drag constraints behave correctly.
   - Grid/axes align to model floor baseline in 3D scene.
