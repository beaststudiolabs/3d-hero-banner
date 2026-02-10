# Restore Notes

## Checkpoint
- `checkpoint_id`: `20260210-082110-admin-dark-30-70-layout-v2`
- `date_utc`: `2026-02-10T08:21:10Z`

## Default Restore Rule
Use latest stable checkpoint from `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md` unless a specific checkpoint ID is requested.

## This Checkpoint Restore Intent
Restore the admin dark-glass v2 visual refinements and related project-state documentation updates.

## Files To Re-apply
- `beastside-3d-hero-banner/assets/css/admin.css`
- `beastside-3d-hero-banner/includes/class-bs3d-data-transfer.php`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`

## Verification Steps
1. Open Settings, Diagnostics, Composer, and Data Transfer admin screens and confirm dark glass shell/panel visuals render.
2. In Composer desktop width, confirm controls/preview are approximately `30%/70%` and preview frame is fully visible.
3. Confirm form control borders are visible before focus and become stronger on focus.
4. Confirm Composer stacks to one column on smaller widths.
5. Confirm no runtime regression by checking existing frontend diagnostics event flow still works.

## Notes
- Save-state remains markdown-only (`diff-summary.md`, `restore.md`), no zip/manifest artifacts.
