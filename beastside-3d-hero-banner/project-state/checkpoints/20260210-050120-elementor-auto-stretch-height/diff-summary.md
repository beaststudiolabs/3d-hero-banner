# Diff Summary

## Checkpoint
- `checkpoint_id`: `20260210-050120-elementor-auto-stretch-height`
- `date_utc`: `2026-02-10T05:01:20Z`
- `scope`: `incremental-change`
- `change_slug`: `elementor-auto-stretch-height`

## Intent
Fix published Elementor banner height capping in standard mode so the banner stretches to the Elementor container height (with existing fallback when parent height is undefined), while keeping fullscreen behavior unchanged.

## Files Changed
- `beastside-3d-hero-banner/includes/class-bs3d-renderer.php`
- `beastside-3d-hero-banner/assets/css/frontend.css`
- `beastside-3d-hero-banner/assets/js/frontend.js`
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`

## Implementation Notes
- Added deterministic wrapper surface class output: `bs3d-surface-{surface}`.
- Added Elementor auto-stretch CSS chain for standard mode:
  - `.elementor-widget-beastside_3d_hero_banner { height: 100%; }`
  - `.elementor-widget-beastside_3d_hero_banner .elementor-widget-container { height: 100%; display: flex; }`
  - `.elementor-widget-beastside_3d_hero_banner .bs3d-banner.bs3d-surface-elementor { flex: 1 1 auto; height: 100%; }`
- Added runtime `ResizeObserver` support (with window resize fallback) to re-size renderer when layout/container height changes without page resize.
- Bumped plugin version to `0.2.4` for frontend asset cache-busting.

## Validation
- `node --check beastside-3d-hero-banner/assets/js/frontend.js` -> pass.
- Static verification confirms observer setup + teardown and Elementor surface class wiring.
