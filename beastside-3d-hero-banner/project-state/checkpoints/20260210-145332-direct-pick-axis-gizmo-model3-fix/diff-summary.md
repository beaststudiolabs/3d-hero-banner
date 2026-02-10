# Diff Summary

## Intent
- Fix `model3` drag reliability by preserving slot identity (`models[].slot`) through composer payload, sanitization, runtime model targeting, and public proxy signature/lookup.
- Add direct click selection in admin preview via center pick markers so target selection no longer depends on dropdown-first workflow.
- Improve transform gizmo clarity and movement correctness with RGB axis labels and true axis-constrained translation.
- Keep 3D placement context coherent by auto-aligning grid/axes helpers to the model floor baseline.

## Files Changed
- `beastside-3d-hero-banner/assets/js/admin-composer.js`
- `beastside-3d-hero-banner/assets/js/frontend.js`
- `beastside-3d-hero-banner/assets/vendor/three/TransformControls.js`
- `beastside-3d-hero-banner/includes/class-bs3d-banner-post-type.php`
- `beastside-3d-hero-banner/includes/class-bs3d-renderer.php`
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`

## Validation
- `node --check beastside-3d-hero-banner/assets/js/frontend.js`
- `node --check beastside-3d-hero-banner/assets/js/admin-composer.js`
- `node --check beastside-3d-hero-banner/assets/vendor/three/TransformControls.js`

## Notes
- Plugin version bumped to `0.2.9` for frontend/vendor cache-busting (`BS3D_VERSION`).
- PHP CLI linting not run in this environment (`php` unavailable).
