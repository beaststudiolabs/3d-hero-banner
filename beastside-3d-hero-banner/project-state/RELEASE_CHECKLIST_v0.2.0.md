# Release Checklist (v0.2.0)

## Goal
Ship `Beastside 3D Hero Banner v0.2.0` as a reproducible WordPress plugin release with traceable artifacts.

## 1. Source Control
- [ ] Confirm `main` is clean (`git status`).
- [ ] Confirm release target commit hash.
- [ ] Confirm remote `origin/main` is up-to-date.

## 2. Version and Metadata
- [ ] `beastside-3d-hero-banner/beastside-3d-hero-banner.php` header `Version` is `0.2.0`.
- [ ] `beastside-3d-hero-banner/beastside-3d-hero-banner.php` constant `BS3D_VERSION` is `0.2.0`.
- [ ] `beastside-3d-hero-banner/README.md` reflects current feature scope.

## 3. Runtime Asset Verification
- [ ] Confirm bundled vendor files exist:
- `assets/vendor/three/three.min.js`
- `assets/vendor/three/GLTFLoader.js`
- `assets/vendor/three/DRACOLoader.js`
- `assets/vendor/draco/draco_decoder.js`
- `assets/vendor/draco/draco_wasm_wrapper.js`
- `assets/vendor/draco/draco_decoder.wasm`
- `assets/vendor/meshopt/meshopt_decoder.js`
- [ ] Confirm `assets/vendor/VENDOR_SOURCES.md` is present and accurate.

## 4. QA Gate
- [ ] Run automated checks:
- `node --check beastside-3d-hero-banner/assets/js/frontend.js`
- `node --check beastside-3d-hero-banner/assets/js/admin-composer.js`
- [ ] Run live WP manual QA matrix from `project-state/QA_REPORT_2026-02-09.md`.
- [ ] Resolve all release-blocking failures.

## 5. Save-State and Documentation
- [ ] Update `project-state/BUILD_LOG.md` for release actions.
- [ ] Update `project-state/FEATURE_MATRIX.md` for validated release features.
- [ ] Update `project-state/PRD_ADDENDUM_CANONICAL.md` change history if scope changed.
- [ ] Update `project-state/CHECKPOINT_INDEX.md` stable pointer.
- [ ] Create release checkpoint folder with:
- `source.zip`
- `manifest.json`
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
- [ ] Tag release commit (example: `v0.2.0`).
- [ ] Push tag to GitHub.
- [ ] Create GitHub Release notes summarizing:
- Production renderer foundation.
- Admin composer + live preview.
- Templates/versioning/duplicate.
- Import/export package workflows.
- Save-state/checkpoint documentation updates.
- [ ] Attach distributable plugin zip to release.

## 9. Rollback Preparedness
- [ ] Confirm latest stable checkpoint ID in `CHECKPOINT_INDEX.md`.
- [ ] Validate rollback instructions in checkpoint `restore.md`.
- [ ] Keep previous stable plugin zip and release notes available.
