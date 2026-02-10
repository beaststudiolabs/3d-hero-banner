# Restore

## Restore Target
- `checkpoint_id`: `20260210-050120-elementor-auto-stretch-height`

## Default Rollback Guidance
1. Use the latest stable checkpoint from `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md` if no checkpoint is explicitly requested.
2. If this checkpoint must be reverted, restore changed files to their prior versions using your VCS history.

## Files in Scope
- `beastside-3d-hero-banner/includes/class-bs3d-renderer.php`
- `beastside-3d-hero-banner/assets/css/frontend.css`
- `beastside-3d-hero-banner/assets/js/frontend.js`
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`

## Post-Restore Verification
1. Run `node --check beastside-3d-hero-banner/assets/js/frontend.js`.
2. In WordPress + Elementor, verify banner standard mode behavior matches expected target for the restored revision.
3. Confirm `project-state` docs are consistent with the restored checkpoint lineage.
