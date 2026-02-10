# Restore Steps

1. Ensure you are in repository root:
- `e:\Beastside 3D Hero Banner`

2. Identify the commit containing this checkpoint (or use local reflog/history):
- `git log --oneline -- beastside-3d-hero-banner`

3. Restore this checkpoint state:
- Preferred: `git checkout <commit_sha>` for a detached inspection.
- Branch restore: `git checkout -b restore-20260210-010938 <commit_sha>`.

4. If selectively restoring only this change from a later branch:
- `git cherry-pick <commit_sha>`

5. Verify restored scope:
- `node --check beastside-3d-hero-banner/assets/js/frontend.js`
- `node --check beastside-3d-hero-banner/assets/js/admin-composer.js`
- Confirm `beastside-3d-hero-banner/beastside-3d-hero-banner.php` version is `0.2.3`.

6. Manual validation after restore:
- Published shortcode/Elementor path can recover model load via signed safe-proxy fallback.
- Fullscreen mode (`Viewport Height = Fullscreen`) renders banner at viewport height.

