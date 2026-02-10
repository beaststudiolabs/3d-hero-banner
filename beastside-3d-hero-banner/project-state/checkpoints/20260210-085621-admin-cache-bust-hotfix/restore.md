# Restore Notes

## Checkpoint
- `checkpoint_id`: `20260210-085621-admin-cache-bust-hotfix`
- `date_utc`: `2026-02-10T08:56:21Z`

## Default Restore Rule
Use latest stable checkpoint from `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md` unless a specific checkpoint ID is requested.

## This Checkpoint Restore Intent
Restore cache-busting reliability for admin visual assets so UI changes are visible immediately after plugin update/install.

## Files To Re-apply
- `beastside-3d-hero-banner/includes/class-bs3d-plugin.php`
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`

## Verification Steps
1. Confirm plugin header/version shows `0.2.6`.
2. Open banner editor and inspect loaded admin CSS URL query includes updated version token.
3. Confirm dark-glass v2 admin visual changes render on Composer page.
4. Confirm no functional behavior changes in settings/diagnostics/data transfer workflows.
