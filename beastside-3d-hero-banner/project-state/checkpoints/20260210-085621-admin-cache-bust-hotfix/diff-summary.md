# Diff Summary

## Checkpoint
- `checkpoint_id`: `20260210-085621-admin-cache-bust-hotfix`
- `date_utc`: `2026-02-10T08:56:21Z`
- `scope`: `incremental-change`
- `change_slug`: `admin-cache-bust-hotfix`

## Intent
Ensure recently implemented admin visual changes load reliably in WordPress by preventing stale CSS/JS cache hits.

## Key Changes
- Admin style enqueue now uses `BS3D_VERSION + filemtime(admin.css)`.
- Admin composer script enqueue now uses `BS3D_VERSION + filemtime(admin-composer.js)`.
- Plugin version bumped from `0.2.5` to `0.2.6`.
- Project-state docs updated for traceability and context continuity.

## Files Changed
- `beastside-3d-hero-banner/includes/class-bs3d-plugin.php`
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`

## Validation Snapshot
- Static verification confirms `filemtime`-based enqueue versions for admin CSS and composer JS.
- Static verification confirms plugin version constant update to `0.2.6`.
