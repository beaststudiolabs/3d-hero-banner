# Release Checklist (v0.2.5)

## Goal
Ship `Beastside 3D Hero Banner v0.2.5` as a reproducible WordPress plugin release with traceable artifacts.

## 1. Source Control
- [ ] Confirm `beta-updates` is clean (`git status`).
- [ ] Confirm release target commit hash.
- [ ] Confirm remote `origin/beta-updates` is up-to-date.

## 2. Version and Metadata
- [x] `beastside-3d-hero-banner/beastside-3d-hero-banner.php` header `Version` is `0.2.5`.
- [x] `beastside-3d-hero-banner/beastside-3d-hero-banner.php` constant `BS3D_Version` is `0.2.5`.
- [ ] `beastside-3d-hero-banner/README.md` reflects current feature scope.

## 3. Runtime Asset Verification
- [x] Confirm bundled vendor files exist:
- `assets/vendor/three/three.min.js`
- `assets/vendor/three/GLTFLoader.js`
- `assets/vendor/three/DRACOLoader.js`
- `assets/vendor/draco/draco_decoder.js`
- `assets/vendor/draco/draco_wasm_wrapper.js`
- `assets/vendor/draco/draco_decoder.wasm`
- `assets/vendor/meshopt/meshopt_decoder.js`
- [x] Confirm `assets/vendor/VENDOR_SOURCES.md` is present.

## 4. QA Gate (F022-F037 Hardening)
- [x] Run automated checks:
- `node --check beastside-3d-hero-banner/assets/js/frontend.js`
- `node --check beastside-3d-hero-banner/assets/js/admin-composer.js`
- [x] Capture live WP validation evidence for confirmed items (`BS3D-F022`, `F024`, `F031`, `F032`, `F035`, `F037`).
- [ ] Capture remaining live WP blocker evidence (`BS3D-F023`, `F025`, `F026`, `F027`, `F028`, `F033`, `F036`).
- [ ] Resolve all release-blocking failures.

## 5. Save-State and Documentation
- [x] Update `project-state/BUILD_LOG.md` for validation hardening actions.
- [x] Update `project-state/FEATURE_MATRIX.md` promoted validation statuses.
- [x] Update `project-state/QA_REPORT_2026-02-09.md` with dated addendum.
- [x] Update `project-state/CHECKPOINT_INDEX.md` with latest validation checkpoint.
- [x] Create docs-only checkpoint folder with:
- `diff-summary.md`
- `restore.md`

## 6. Package Build
- [ ] Build plugin package zip containing `beastside-3d-hero-banner/` as root folder.
- [ ] Verify zip installs successfully in clean WP site.
- [ ] Activate plugin and confirm no fatal errors.

## 7. Post-Install Smoke
- [ ] Confirm diagnostics status cards load in admin.
- [ ] Confirm shortcode render path works.
- [ ] Confirm Elementor widget registration path works (when Elementor is active).
- [ ] Confirm frontend banner render + fallback behavior.

## 8. GitHub Release
- [ ] Tag release commit (example: `v0.2.5`).
- [ ] Push tag to GitHub.
- [ ] Create GitHub Release notes summarizing:
- Published safe-proxy fetch reliability hardening.
- Elementor standard-mode auto-stretch height fix.
- Admin-first bubble/glass refresh for Settings, Diagnostics, and Composer.
- Checkpoint/documentation traceability updates.
- [ ] Attach distributable plugin zip to release.

## 9. Rollback Preparedness
- [x] Confirm latest stable checkpoint ID in `CHECKPOINT_INDEX.md` remains explicit.
- [x] Validate rollback instructions exist in latest checkpoint `restore.md`.
- [ ] Promote a new stable checkpoint only after blocker list is cleared.

## Current Release Blockers
1. Missing explicit manual evidence for `BS3D-F023`.
2. Missing explicit manual evidence for template/version/duplicate/import-export workflows (`BS3D-F025` to `BS3D-F027`).
3. Missing forced-timeout evidence for `BS3D-F028`.
4. Missing fresh install activation proof for `BS3D-F033`.
5. Missing explicit fullscreen-mode evidence for `BS3D-F036`.

6. Pending visual sign-off for admin UI bubble refresh (BS3D-F038).

