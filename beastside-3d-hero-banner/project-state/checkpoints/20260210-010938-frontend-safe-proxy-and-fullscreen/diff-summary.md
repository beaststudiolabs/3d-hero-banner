# Diff Summary

## Intent
- Fix published render model fetch failures by adding signed safe-proxy fallback for shortcode/Elementor surfaces.
- Add per-banner fullscreen height mode so published banners can render at viewport height.

## Key Changes
- Added public signed proxy endpoint and signature generation/verification tied to `banner_id + model_index + resolved_url`.
- Extended frontend context and payload for public proxy fallback and site canonical host normalization.
- Enabled frontend model proxy retries for published surfaces when direct fetch fails due to CORS/network or mixed-content constraints.
- Added per-banner `viewport_mode` (`standard`/`fullscreen`) with wrapper class `bs3d-fullscreen` and fullscreen CSS (`100vh` + `100dvh`).
- Propagated viewport mode through template payloads, version snapshots/restores, duplicate workflow, and import/export mapping.
- Updated plugin version to `0.2.3` for asset cache-busting.

## Files Touched
- `beastside-3d-hero-banner/includes/class-bs3d-renderer.php`
- `beastside-3d-hero-banner/assets/js/frontend.js`
- `beastside-3d-hero-banner/includes/class-bs3d-banner-post-type.php`
- `beastside-3d-hero-banner/assets/js/admin-composer.js`
- `beastside-3d-hero-banner/assets/css/frontend.css`
- `beastside-3d-hero-banner/includes/class-bs3d-template-post-type.php`
- `beastside-3d-hero-banner/includes/class-bs3d-version-manager.php`
- `beastside-3d-hero-banner/includes/class-bs3d-data-transfer.php`
- `beastside-3d-hero-banner/includes/class-bs3d-plugin.php`
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`

