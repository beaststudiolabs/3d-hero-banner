# Restore

## Restore Target
- `checkpoint_id`: `20260210-061745-admin-ui-bubble-refresh-v1`

## Restore Scope
This checkpoint includes visual/admin presentation updates and documentation changes. No runtime rendering logic, shortcode signatures, or diagnostics event names were altered.

## Files to Restore if Reverting
- `beastside-3d-hero-banner/assets/css/admin.css`
- `beastside-3d-hero-banner/includes/class-bs3d-plugin.php`
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/RELEASE_CHECKLIST_v0.2.5.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`

## Verification After Restore
1. Confirm settings and diagnostics pages render without `bs3d-page-shell` wrappers if reverted.
2. Confirm previous admin CSS appearance is restored.
3. Confirm `BS3D_VERSION` matches restored release value.
4. Confirm project-state documents remain internally consistent with checkpoint ordering.
