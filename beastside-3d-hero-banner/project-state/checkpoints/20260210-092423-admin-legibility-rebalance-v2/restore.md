# Restore Notes

## Checkpoint
- `checkpoint_id`: `20260210-092423-admin-legibility-rebalance-v2`
- `date_utc`: `2026-02-10T09:24:23Z`

## Default Restore Rule
Use latest stable checkpoint from `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md` unless a specific checkpoint ID is requested.

## This Checkpoint Restore Intent
Restore readable dark-theme admin styling and Composer token scope correctness.

## Files To Re-apply
- `beastside-3d-hero-banner/assets/css/admin.css`
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`

## Verification Steps
1. Confirm plugin version shows `0.2.7`.
2. Open Banner Composer and confirm text is legible before focus.
3. Confirm control outlines are visible in idle state and stronger on hover/focus.
4. Confirm 30/70 desktop split remains intact.
5. Confirm Settings/Diagnostics/Data Transfer use same readable dark contrast profile.
