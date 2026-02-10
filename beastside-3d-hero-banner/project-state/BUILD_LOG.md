# Build Log

This log is chronological and append-only. One entry is required per checkpoint.

Checkpoint storage policy note (effective 2026-02-09):
- Checkpoints are markdown-only (`diff-summary.md`, `restore.md`).
- Historical `source.zip` artifacts were pruned to reduce workspace bloat.
- Historical `manifest.json` files are retained only as lightweight deprecated stubs where filesystem ACL prevents deletion.

## Entry Template
- `checkpoint_id`:
- `date_utc`:
- `request`:
- `decision`:
- `files`:
- `risks`:
- `validation`:
- `next_actions`:

---

## Entry 001
- `checkpoint_id`: 20260209-101640-baseline-full-chat
- `date_utc`: 2026-02-09T10:16:40Z
- `request`: Establish mandatory save-state and context documentation system with full-chat backfill baseline.
- `decision`: Implement `project-state` 3-doc set plus checkpoint artifact workflow and initial baseline checkpoint.
- `files`:
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-101640-baseline-full-chat/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-101640-baseline-full-chat/restore.md`
- `risks`:
- PHP lint tooling unavailable in current local environment (`php` CLI not installed).
- `validation`:
- Documentation schema created and populated.
- Checkpoint artifact created with SHA-256 hash.
- Manifest schema fields populated.
- `next_actions`:
- For next accepted change, read latest docs/manifest first, update docs, generate new checkpoint, then append index/log.

---

## Entry 002
- `checkpoint_id`: 20260209-103356-vendor-assets-preload
- `date_utc`: 2026-02-09T10:33:56Z
- `request`: Bundle all vendor runtime assets so plugin installs in one shot and diagnostics runtime cards resolve.
- `decision`: Vendor official runtime files into `assets/vendor` from upstream sources and document source/license provenance.
- `files`:
- `beastside-3d-hero-banner/assets/vendor/three/three.min.js`
- `beastside-3d-hero-banner/assets/vendor/three/GLTFLoader.js`
- `beastside-3d-hero-banner/assets/vendor/three/LICENSE-threejs.txt`
- `beastside-3d-hero-banner/assets/vendor/draco/draco_decoder.js`
- `beastside-3d-hero-banner/assets/vendor/draco/draco_wasm_wrapper.js`
- `beastside-3d-hero-banner/assets/vendor/draco/draco_decoder.wasm`
- `beastside-3d-hero-banner/assets/vendor/meshopt/meshopt_decoder.js`
- `beastside-3d-hero-banner/assets/vendor/meshopt/LICENSE-meshoptimizer.txt`
- `beastside-3d-hero-banner/assets/vendor/VENDOR_SOURCES.md`
- `beastside-3d-hero-banner/README.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-103356-vendor-assets-preload/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-103356-vendor-assets-preload/restore.md`
- `risks`:
- Vendor files are pinned to `three@0.146.0`; future upgrades must update runtime set together.
- `validation`:
- Verified vendor files exist and are non-placeholder JavaScript/WASM assets.
- Verified frontend JS syntax check passes.
- Verified diagnostics file availability checks should resolve with bundled vendor files present.
- `next_actions`:
- Run plugin in WordPress admin and confirm diagnostics cards for runtime/loader/decoder availability are green.

---

## Entry 003
- `checkpoint_id`: 20260209-110018-wp-smoke-validation
- `date_utc`: 2026-02-09T11:00:18Z
- `request`: Record diagnostics green-state evidence and advance stable checkpoint after smoke verification.
- `decision`: Backfill smoke validation evidence into project-state docs and mark diagnostics/vendor feature rows as validated against WP smoke pass.
- `files`:
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-110018-wp-smoke-validation/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-110018-wp-smoke-validation/restore.md`
- `risks`:
- Screenshot-based smoke evidence validates availability cards but does not fully validate runtime rendering.
- `validation`:
- Confirmed vendor/runtime path checks all present (`three`, `GLTFLoader`, `DRACOLoader`, `draco`, `meshopt`).
- Diagnostics panel screenshot evidence shows all setup cards green except expected runtime-history cards with no events yet.
- `next_actions`:
- Implement real runtime renderer and render-success event gating.

---

## Entry 004
- `checkpoint_id`: 20260209-110019-renderer-foundation
- `date_utc`: 2026-02-09T11:00:19Z
- `request`: Replace scaffold rendering with production GLTF runtime and true diagnostics values.
- `decision`: Rebuilt `assets/js/frontend.js` around real Three.js renderer lifecycle, real GLTF model loading, Draco/Meshopt decoder integration, true fallback timeout handling, and post-frame `render_success` logging.
- `files`:
- `beastside-3d-hero-banner/assets/js/frontend.js`
- `beastside-3d-hero-banner/assets/css/frontend.css`
- `beastside-3d-hero-banner/includes/class-bs3d-renderer.php`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-110019-renderer-foundation/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-110019-renderer-foundation/restore.md`
- `risks`:
- No local PHP runtime available for end-to-end WordPress execution checks.
- WebGL behavior still requires in-browser runtime verification in target WP environment.
- `validation`:
- `node --check assets/js/frontend.js`: pass.
- Verified runtime code path enforces `render_success` only after first frame and required models loaded.
- Verified fallback timeout path ties to `scene.fallback.timeoutMs` and records diagnostics.
- `next_actions`:
- Implement structured admin composer and live draft preview refresh.

---

## Entry 005
- `checkpoint_id`: 20260209-110020-admin-composer-v1
- `date_utc`: 2026-02-09T11:00:20Z
- `request`: Replace JSON editing workflow with structured composer controls and real-time admin preview.
- `decision`: Added structured metabox controls, media-picker helpers, synchronized slider/number controls, and live preview refresh via new `assets/js/admin-composer.js` using the same frontend renderer pipeline.
- `files`:
- `beastside-3d-hero-banner/assets/js/admin-composer.js`
- `beastside-3d-hero-banner/assets/css/admin.css`
- `beastside-3d-hero-banner/includes/class-bs3d-banner-post-type.php`
- `beastside-3d-hero-banner/includes/class-bs3d-plugin.php`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-110020-admin-composer-v1/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-110020-admin-composer-v1/restore.md`
- `risks`:
- Composer UI still depends on runtime model URLs being valid GLB/GLTF assets.
- `validation`:
- `node --check assets/js/admin-composer.js`: pass.
- Verified metabox save path now uses structured POST fields as canonical source for persistence.
- Verified media-picker enqueue (`wp_enqueue_media`) is active on banner edit screens.
- `next_actions`:
- Finalize template/version/duplicate and import/export integration details and checkpoint docs.

---

## Entry 006
- `checkpoint_id`: 20260209-110021-template-versioning
- `date_utc`: 2026-02-09T11:00:21Z
- `request`: Deliver template save/apply, snapshot versioning, restore, and duplicate banner workflows.
- `decision`: Kept template CPT + version manager implementation, wired duplicate action in plugin bootstrap, and integrated template/version controls in banner editor.
- `files`:
- `beastside-3d-hero-banner/includes/class-bs3d-template-post-type.php`
- `beastside-3d-hero-banner/includes/class-bs3d-version-manager.php`
- `beastside-3d-hero-banner/includes/class-bs3d-banner-post-type.php`
- `beastside-3d-hero-banner/includes/class-bs3d-plugin.php`
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-110021-template-versioning/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-110021-template-versioning/restore.md`
- `risks`:
- Template and version restore flows require live WP admin testing for full UX validation.
- `validation`:
- Verified template creation and payload retrieval helpers exist and are wired.
- Verified version snapshot creation on save and restore action path.
- Verified duplicate admin action copies core banner meta and creates snapshot.
- `next_actions`:
- Finalize and checkpoint import/export package workflows.

---

## Entry 007
- `checkpoint_id`: 20260209-110022-import-export-v1
- `date_utc`: 2026-02-09T11:00:22Z
- `request`: Add schema-versioned banner/template/settings import/export with conflict handling and diagnostics logging.
- `decision`: Finalized data transfer admin page and handlers for single/bulk export, JSON import, conflict modes (`skip`, `overwrite_by_slug`, `import_as_copy`), and diagnostics events on outcomes.
- `files`:
- `beastside-3d-hero-banner/includes/class-bs3d-data-transfer.php`
- `beastside-3d-hero-banner/includes/class-bs3d-plugin.php`
- `beastside-3d-hero-banner/README.md`
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-110022-import-export-v1/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-110022-import-export-v1/restore.md`
- `risks`:
- Import payload roundtrip requires runtime WordPress validation to confirm post/meta persistence in target environment.
- `validation`:
- Verified conflict mode routing and status accounting in import pipeline.
- Verified diagnostics `surface=import-export` logging for export/import actions.
- Verified banner status export now preserves source post status.
- `next_actions`:
- Run full WP admin/manual QA checklist for renderer, composer, template/version, and import/export workflows.

---

## Entry 008
- `checkpoint_id`: 20260209-110602-renderer-timeout-guard
- `date_utc`: 2026-02-09T11:06:02Z
- `request`: Stabilize renderer fallback behavior after implementation by preventing late async model loads from re-entering render loop.
- `decision`: Added guard conditions so timeout-triggered fallback state blocks subsequent render loop start and suppresses false `render_success` emission.
- `files`:
- `beastside-3d-hero-banner/assets/js/frontend.js`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-110602-renderer-timeout-guard/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-110602-renderer-timeout-guard/restore.md`
- `risks`:
- Runtime behavior still requires browser-level QA with intentionally slow/unavailable model hosts.
- `validation`:
- `node --check assets/js/frontend.js`: pass.
- Verified render loop now exits immediately when fallback is active.
- Verified model-load promise resolution path now no-ops when fallback already triggered.
- `next_actions`:
- Execute live timeout scenario in WP admin/frontend to confirm no false success event after fallback.

---

## Entry 009
- `checkpoint_id`: 20260209-111549-qa-and-release-docs
- `date_utc`: 2026-02-09T11:15:49Z
- `request`: After pushing to GitHub, run option 1 QA pass and option 2 release checklist.
- `decision`: Added explicit QA report artifact with executed automated checks and live WP matrix, plus v0.2.0 release checklist for packaging/tagging/release workflow.
- `files`:
- `beastside-3d-hero-banner/project-state/QA_REPORT_2026-02-09.md`
- `beastside-3d-hero-banner/project-state/RELEASE_CHECKLIST_v0.2.0.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-111549-qa-and-release-docs/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-111549-qa-and-release-docs/restore.md`
- `risks`:
- Live WP manual flows are still environment-dependent and remain pending until run in active WordPress instance.
- `validation`:
- `node --check` passed for frontend and admin composer scripts.
- Vendor runtime presence checks passed.
- Latest checkpoint hash verification passed.
- `next_actions`:
- Execute manual WordPress matrix from `QA_REPORT_2026-02-09.md` and mark failures with evidence screenshots/log snippets.

---

## Entry 010
- `checkpoint_id`: 20260209-120529-model-fetch-normalization-fix
- `date_utc`: 2026-02-09T12:05:29Z
- `request`: Fix runtime `Failed to fetch` model load errors using direct URL normalization and actionable diagnostics without introducing a proxy.
- `decision`: Added a model URL normalization pipeline (GitHub blob, Dropbox share, protocol-relative), pre-load URL guards (invalid/non-direct URL and HTTPS mixed-content block), and classified model-load diagnostics (`network_or_cors_blocked`, `mixed_content_blocked`, `unsupported_or_not_direct_url`, `unknown_model_load_error`) with troubleshooting metadata (`modelUrlOriginal`, `modelUrlResolved`, `normalizationRule`, `hint`).
- `files`:
- `beastside-3d-hero-banner/assets/js/frontend.js`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-120529-model-fetch-normalization-fix/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-120529-model-fetch-normalization-fix/restore.md`
- `risks`:
- External hosts may still block browser fetches due to CORS/hotlink policies even after URL normalization; direct, CORS-enabled hosting remains required.
- Manual WordPress runtime verification is still pending until user test signal is provided.
- `validation`:
- `node --check beastside-3d-hero-banner/assets/js/frontend.js`: pass.
- Static verification confirmed normalization and error taxonomy hooks exist in renderer load path.
- Existing fallback/event flow remains unchanged and still routes through `setFallback` on model-load failure.
- `next_actions`:
- Pause for user manual test signal (Phase 2 QA Hold).
- After user confirmation, append validation evidence, create post-QA checkpoint, and continue next phase on `beta-updates`.

---

## Entry 011
- `checkpoint_id`: 20260209-123342-model-fetch-proxy-fallback
- `date_utc`: 2026-02-09T12:33:42Z
- `request`: Resolve persistent `Failed to fetch` in admin live preview after normalization-only fix.
- `decision`: Added secure admin-only model proxy endpoint (`wp_ajax_bs3d_model_proxy`) with nonce/capability checks and URL restrictions, then updated frontend loader to retry through proxy when direct model fetch fails due to network/CORS or mixed-content constraints in `admin-preview`.
- `files`:
- `beastside-3d-hero-banner/includes/class-bs3d-renderer.php`
- `beastside-3d-hero-banner/assets/js/frontend.js`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-123342-model-fetch-proxy-fallback/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-123342-model-fetch-proxy-fallback/restore.md`
- `risks`:
- Proxy fallback is intentionally restricted to admin preview and does not alter public visitor fetch behavior.
- GLTF files with external relative dependencies may still require direct-accessible asset hosting; GLB single-file assets are the preferred format.
- `validation`:
- `node --check beastside-3d-hero-banner/assets/js/frontend.js`: pass.
- Static verification confirms localized proxy context keys, admin ajax route, and retry diagnostics (`model_proxy_retry`, `model_proxy_success`).
- `php -l` could not be executed in this shell because PHP CLI is not installed.
- `next_actions`:
- Retest model load in admin composer live preview and confirm direct failure now recovers via proxy retry.
- If validation passes, proceed to post-QA log compact/checkpoint and move next phase work onto `beta-updates`.

---

## Entry 012
- `checkpoint_id`: 20260209-123937-model-fetch-proxy-cachebust
- `date_utc`: 2026-02-09T12:39:37Z
- `request`: Ensure latest model-fetch fix is actually loaded in browser during retest.
- `decision`: Bumped plugin version to `0.2.1` so enqueued frontend assets are cache-busted and admin preview receives updated proxy retry logic immediately.
- `files`:
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-123937-model-fetch-proxy-cachebust/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-123937-model-fetch-proxy-cachebust/restore.md`
- `risks`:
- Browser cache invalidation is improved by version bump, but CDN/server cache layers may still require hard refresh depending on host setup.
- `validation`:
- Plugin header version and `BS3D_VERSION` constant now both `0.2.1`.
- Static inspection confirms script enqueue version source remains `BS3D_VERSION`.
- `next_actions`:
- Retest admin live preview with hard refresh and verify fallback is cleared for valid model URL.

---

## Entry 013
- `checkpoint_id`: 20260209-124728-activation-output-bom-fix
- `date_utc`: 2026-02-09T12:47:28Z
- `request`: Resolve plugin activation warning showing `3 characters of unexpected output`.
- `decision`: Found and removed UTF-8 BOM bytes from `includes/class-bs3d-banner-post-type.php`, which was emitting output before headers during activation include loading.
- `files`:
- `beastside-3d-hero-banner/includes/class-bs3d-banner-post-type.php`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-124728-activation-output-bom-fix/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-124728-activation-output-bom-fix/restore.md`
- `risks`:
- Additional locked temp directories at workspace root remain from prior archive attempts and may require elevated/manual cleanup, but they are outside plugin runtime path.
- `validation`:
- Full plugin PHP BOM scan returns `NO_PHP_BOM_FOUND`.
- Git diff confirms only BOM marker was removed (`﻿<?php` to `<?php`).
- `next_actions`:
- Reinstall/reactivate plugin and confirm activation warning is gone.
- Continue model-fetch retest only after activation output issue is confirmed resolved.

---

## Entry 014
- `checkpoint_id`: 20260209-125515-save-state-docs-only-and-proxy-parse-fix
- `date_utc`: 2026-02-09T12:55:15Z
- `request`: Stop save-state bloat (markdown-only checkpoints) and fix admin diagnostics GLB parse failure during proxy retry.
- `decision`: Updated checkpoint policy to docs-only (`diff-summary.md`, `restore.md`), pruned checkpoint archive zips, retained manifest files as tiny deprecated stubs where ACL blocked deletion, and fixed frontend proxy retry to fetch raw model bytes/text then parse via `GLTFLoader.parse` instead of `loader.load(admin-ajax.php...)`.
- `files`:
- `beastside-3d-hero-banner/assets/js/frontend.js`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/QA_REPORT_2026-02-09.md`
- `beastside-3d-hero-banner/project-state/RELEASE_CHECKLIST_v0.2.0.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-125515-save-state-docs-only-and-proxy-parse-fix/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260209-125515-save-state-docs-only-and-proxy-parse-fix/restore.md`
- `risks`:
- Some historical checkpoint `manifest.json` files could not be deleted due filesystem ACL; they are reduced to lightweight stubs.
- Existing untracked temp directories at workspace root remain ACL-locked and may require manual OS-level cleanup.
- `validation`:
- `node --check beastside-3d-hero-banner/assets/js/frontend.js`: pass.
- Static verification confirms proxy retry now uses `fetch` + `loader.parse` path.
- Save-state policy docs now specify markdown-only checkpoint artifacts.
- `next_actions`:
- Retest backend live preview model URL load and confirm diagnostics no longer show `Unexpected token 'g' ... not valid JSON`.
- If retest passes, proceed with post-QA compact entry and beta-branch continuation.

---

## Entry 015
- `checkpoint_id`: 20260210-010938-frontend-safe-proxy-and-fullscreen
- `date_utc`: 2026-02-10T01:09:38Z
- `request`: Fix published banner model fetch failures (preview worked but frontend failed) and add per-banner fullscreen height support.
- `decision`: Added a signed banner-bound public proxy endpoint (`bs3d_model_proxy_public`) for published shortcode/Elementor surfaces, expanded frontend retry logic to use safe proxy fallback when direct fetch is blocked, added same-site canonical host normalization, and introduced per-banner viewport mode (`standard`/`fullscreen`) persisted through templates, versions, duplicate, and import/export workflows.
- `files`:
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
- `beastside-3d-hero-banner/project-state/RELEASE_CHECKLIST_v0.2.5.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-010938-frontend-safe-proxy-and-fullscreen/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-010938-frontend-safe-proxy-and-fullscreen/restore.md`
- `risks`:
- Frontend safe-proxy endpoint now serves published pages and must remain strictly banner-bound/signature-validated to avoid open-proxy behavior.
- Fullscreen mode is height-only (`100vh/100dvh`) and intentionally does not force full-width breakout from theme/Elementor containers.
- `validation`:
- `node --check beastside-3d-hero-banner/assets/js/frontend.js`: pass.
- `node --check beastside-3d-hero-banner/assets/js/admin-composer.js`: pass.
- Static verification confirms signed public proxy URL generation in payload and frontend fallback routing for non-admin surfaces.
- Static verification confirms viewport mode meta save/load and wrapper class propagation (`bs3d-fullscreen`) with fullscreen CSS rules.
- `next_actions`:
- Run live WP verification for published shortcode/Elementor model recovery and fullscreen render behavior.
- Mark BS3D-F035 and BS3D-F036 as `validated` only after manual evidence is captured.

---

## Entry 016
- `checkpoint_id`: 20260210-050120-elementor-auto-stretch-height
- `date_utc`: 2026-02-10T05:01:20Z
- `request`: Fix published Elementor banner height capping so standard mode matches the Elementor container height instead of staying visually constrained.
- `decision`: Added deterministic surface wrapper classes (`bs3d-surface-{surface}`), implemented Elementor-specific auto-stretch CSS for standard mode with existing `340px` fallback, and added `ResizeObserver`-driven runtime resizing (with window resize fallback) so canvas dimensions track container layout changes in real time.
- `files`:
- `beastside-3d-hero-banner/includes/class-bs3d-renderer.php`
- `beastside-3d-hero-banner/assets/css/frontend.css`
- `beastside-3d-hero-banner/assets/js/frontend.js`
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-050120-elementor-auto-stretch-height/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-050120-elementor-auto-stretch-height/restore.md`
- `risks`:
- Elementor sections without explicit parent/container height still rely on the existing `min-height: 340px` fallback by design.
- Theme-level overrides on Elementor widget/container height could still constrain available space; this change aligns to host container height rather than forcing breakout.
- `validation`:
- `node --check beastside-3d-hero-banner/assets/js/frontend.js`: pass.
- Static verification confirms wrapper class output includes `bs3d-surface-elementor` and `bs3d-surface-shortcode`.
- Static verification confirms Elementor stretch CSS chain and `ResizeObserver` setup/teardown paths in runtime.
- Plugin version bumped to `0.2.4` for cache-busting updated frontend CSS/JS in browser.
- `next_actions`:
- Live WP test on published Elementor page: confirm standard mode fills section/container height and remains responsive to layout changes.
- Capture screenshot evidence and mark BS3D-F037 as `validated` if behavior is confirmed.

---

## Entry 017
- `checkpoint_id`: 20260210-055536-validation-pass-f022-f037
- `date_utc`: 2026-02-10T05:55:36Z
- `request`: Execute the next phase plan by moving work to `beta-updates`, running validation hardening for `BS3D-F022` through `BS3D-F037`, and refreshing release-gate artifacts for current version.
- `decision`: Switched active workstream to `beta-updates`, recorded a dated QA addendum with live validation outcomes supplied during implementation, promoted validated rows where evidence exists (`BS3D-F022`, `F024`, `F031`, `F032`, `F035`, `F037`), and added a current release checklist file for `v0.2.4` with explicit unresolved blockers.
- `files`:
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/QA_REPORT_2026-02-09.md`
- `beastside-3d-hero-banner/project-state/RELEASE_CHECKLIST_v0.2.4.md`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-055536-validation-pass-f022-f037/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-055536-validation-pass-f022-f037/restore.md`
- `risks`:
- Full validation closure is still incomplete; several features remain `implemented` pending explicit live evidence (`BS3D-F023`, `F025`, `F026`, `F027`, `F028`, `F033`, `F036`).
- Latest checkpoint is intentionally not marked stable because release blockers remain.
- `validation`:
- Branch discipline check: active branch is now `beta-updates`.
- Manual/live evidence was captured in QA addendum for confirmed runtime items and mapped into feature statuses.
- Remaining blockers were explicitly listed in `RELEASE_CHECKLIST_v0.2.4.md`.
- `next_actions`:
- Complete unresolved validation blockers in live WP and promote remaining eligible rows to `validated`.
- Once blocker list is clear, mark latest validation checkpoint as stable and continue with admin-first UI modernization.

---

## Entry 018
- `checkpoint_id`: 20260210-061745-admin-ui-bubble-refresh-v1
- `date_utc`: 2026-02-10T06:17:45Z
- `request`: Continue the plan by moving into the queued admin-first modernization phase and deliver a more modern "apple bubble" interface direction.
- `decision`: Applied a scoped admin UI refresh across Settings, Diagnostics, and Banner Composer using glass/bubble styling tokens, rounded panel shells, updated page headers/version pills, refined input/button treatments, and responsive layout polish. Functional logic and data flows were intentionally unchanged.
- `files`:
- `beastside-3d-hero-banner/assets/css/admin.css`
- `beastside-3d-hero-banner/includes/class-bs3d-plugin.php`
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-061745-admin-ui-bubble-refresh-v1/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-061745-admin-ui-bubble-refresh-v1/restore.md`
- `risks`:
- This pass is visual-only and scoped to plugin admin surfaces; extreme custom WP admin styling/plugins could still override portions of the new presentation.
- `validation`:
- Static verification confirms new settings/diagnostics page shell classes render from `class-bs3d-plugin.php`.
- Static verification confirms all existing diagnostics actions/forms/filters remain unchanged.
- Plugin version bumped to `0.2.5` for cache-busting admin CSS updates.
- `next_actions`:
- Capture live admin screenshots for Settings, Diagnostics, and Composer to approve visual direction.
- After visual sign-off, proceed with the first new functional feature bundle on top of this UI baseline.


---

## Entry 019
- `checkpoint_id`: 20260210-082110-admin-dark-30-70-layout-v2
- `date_utc`: 2026-02-10T08:21:10Z
- `request`: Apply the dark glass admin refresh v2 with a 30/70 composer layout split, stronger always-visible control outlines, and a fuller live preview frame while preserving all functional behavior.
- `decision`: Updated the admin visual system to a dark glass palette using five warm accent tokens (`#e7b357`, `#ed903a`, `#f06d2d`, `#e84f29`, `#bf291d`), tightened idle-border contrast for inputs/cards/checkbox pills, switched the composer desktop grid to 30/70 with responsive 35/65 transition and mobile stacking, and set live preview height to viewport-smart clamp sizing for full-frame visibility. Data Transfer page markup was normalized to page-shell/panel wrappers for consistent styling parity across all plugin admin surfaces.
- `compact_context`:
- `stable_checkpoint`: `20260209-111549-qa-and-release-docs`
- `branch_policy`: `beta-updates` remains the active forward workstream.
- `next_phase_objective`: Continue feature additions on top of this admin v2 baseline and validate live UX behavior in WP.
- `acceptance_gate`: Composer split/preview visibility and outline visibility must be confirmed in live admin before promoting this checkpoint to stable.
- `files`:
- `beastside-3d-hero-banner/assets/css/admin.css`
- `beastside-3d-hero-banner/includes/class-bs3d-data-transfer.php`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-082110-admin-dark-30-70-layout-v2/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-082110-admin-dark-30-70-layout-v2/restore.md`
- `risks`:
- Dark theme contrast can vary with third-party WP admin CSS overrides.
- Data Transfer panel wrapper normalization is markup-level; plugin logic remains unchanged but should be sanity-checked in live admin.
- `validation`:
- `node --check beastside-3d-hero-banner/assets/js/frontend.js`: pass.
- Static verification confirms existing runtime resize observer paths remain present (`ResizeObserver`, `observeResizeTargets`, `handleRuntimeResize`) and unchanged behavior-wise.
- Static verification confirms admin token + layout selectors are present (`--bs3d-warm-*`, `grid-template-columns: minmax(280px, 30%) minmax(0, 70%)`, clamp preview height).
- `php -l` for `class-bs3d-data-transfer.php` could not be executed in this environment because `php` CLI is not installed.
- `next_actions`:
- Capture live admin screenshots for Settings/Diagnostics/Composer/Data Transfer to confirm dark v2 direction and 30/70 composition readability.
- Verify that idle outlines remain visible before focus across core controls.
- If visual QA passes, continue with the next planned feature bundle on `beta-updates`.

---

## Entry 020
- `checkpoint_id`: 20260210-085621-admin-cache-bust-hotfix
- `date_utc`: 2026-02-10T08:56:21Z
- `request`: User reported the new admin v2 visuals were not appearing in WordPress despite local implementation; enforce reliable asset invalidation so updated admin styles/scripts load immediately.
- `decision`: Added file-modification-time cache-busting for `assets/css/admin.css` and `assets/js/admin-composer.js` in admin enqueue flow, and bumped plugin version to `0.2.6` to force a fresh asset URL baseline after install/update.
- `compact_context`:
- `stable_checkpoint`: `20260209-111549-qa-and-release-docs`
- `branch_policy`: `beta-updates` remains active.
- `next_phase_objective`: Re-run live admin visual QA for dark v2 after installing the 0.2.6 package.
- `acceptance_gate`: Browser must fetch admin CSS/JS with updated query versions and display dark v2 Composer layout.
- `files`:
- `beastside-3d-hero-banner/includes/class-bs3d-plugin.php`
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-085621-admin-cache-bust-hotfix/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-085621-admin-cache-bust-hotfix/restore.md`
- `risks`:
- If an outdated plugin zip is installed, cache-busting logic cannot apply because updated PHP is not present.
- `validation`:
- Static verification confirms enqueue versions now append `filemtime` for admin CSS and composer JS.
- Static verification confirms plugin version constant updated to `0.2.6`.
- `next_actions`:
- Install/update plugin build containing `0.2.6`.
- Hard refresh WP admin and confirm dark v2 styles and 30/70 Composer layout are active.

---

## Entry 021
- `checkpoint_id`: 20260210-092423-admin-legibility-rebalance-v2
- `date_utc`: 2026-02-10T09:24:23Z
- `request`: Fix unreadable admin text and low-contrast controls while preserving the dark glass direction and warm palette styling across all plugin admin screens.
- `decision`: Applied token-scope hardening by defining the full design token block on both `.bs3d-admin-wrap` and `#bs3d-composer-root`, rebalanced neutrals to a readable balanced-dark palette, added fallback values on critical `var(...)` color/border usages, and added explicit placeholder color styling for form controls. Kept 30/70 Composer layout and responsive behavior unchanged. Bumped plugin version to `0.2.7` for reliable admin asset cache-bust delivery.
- `compact_context`:
- `stable_checkpoint`: `20260209-111549-qa-and-release-docs`
- `branch_policy`: `beta-updates` continues as active branch.
- `next_phase_objective`: User visual QA for legibility and palette satisfaction, then proceed with queued feature additions.
- `acceptance_gate`: Readability confirmed on Composer/Settings/Diagnostics/Data Transfer with visible idle outlines and legible text before focus.
- `files`:
- `beastside-3d-hero-banner/assets/css/admin.css`
- `beastside-3d-hero-banner/beastside-3d-hero-banner.php`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-092423-admin-legibility-rebalance-v2/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-092423-admin-legibility-rebalance-v2/restore.md`
- `risks`:
- Third-party WP admin overrides could still alter contrast in isolated selectors.
- If stale plugin zip is used, old CSS can still appear despite improvements.
- `validation`:
- Static verification confirms tokens now exist on both `.bs3d-admin-wrap` and `#bs3d-composer-root`.
- Static verification confirms fallback-aware text/border color usage and explicit placeholder styling.
- `node --check beastside-3d-hero-banner/assets/js/frontend.js`: pass (runtime unchanged in this phase).
- `next_actions`:
- Install/update `0.2.7` build and hard-refresh admin.
- Confirm readability and palette satisfaction with screenshot pass before next feature phase.

---

## Entry 022
- `checkpoint_id`: 20260210-105945-interactive-lighting-lens-layout-v1
- `date_utc`: 2026-02-10T10:59:45Z
- `request`: Implement interactive admin lighting/camera editing, lens-based camera controls, and composer UX reflow (preview top-left, camera/lighting right, model cards in 3-column row, remaining settings in 3-column row).
- `decision`: Upgraded scene schema to v2 with lens-based camera (`lensMm`) and point-light stack support (up to 3) including migration from legacy `fov`; rebuilt composer structure into a 3-row layout with edit-mode + drag-plane controls; added admin-preview runtime helper system (camera frame helper, ambient indicator, translucent point-light placeholders) with click-drag placement on XY/XZ/YZ planes; and updated admin CSS to support the new row/column composition while preserving existing public shortcode/API contracts.
- `compact_context`:
- `stable_checkpoint`: `20260209-111549-qa-and-release-docs`
- `branch_policy`: `beta-updates` remains the active forward workstream.
- `next_phase_objective`: Live WordPress validation of drag placement UX, lens migration behavior, and persistence workflows (template/version/import-export).
- `acceptance_gate`: Admin preview must support reliable click-drag camera/point-light placement and frontend must apply light/camera effects without helper meshes.
- `files`:
- `beastside-3d-hero-banner/includes/class-bs3d-banner-post-type.php`
- `beastside-3d-hero-banner/assets/js/admin-composer.js`
- `beastside-3d-hero-banner/assets/js/frontend.js`
- `beastside-3d-hero-banner/assets/css/admin.css`
- `beastside-3d-hero-banner/project-state/BUILD_LOG.md`
- `beastside-3d-hero-banner/project-state/FEATURE_MATRIX.md`
- `beastside-3d-hero-banner/project-state/PRD_ADDENDUM_CANONICAL.md`
- `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-105945-interactive-lighting-lens-layout-v1/diff-summary.md`
- `beastside-3d-hero-banner/project-state/checkpoints/20260210-105945-interactive-lighting-lens-layout-v1/restore.md`
- `risks`:
- `php -l` could not be run in this environment (`php` CLI unavailable), so PHP syntax validation is based on static inspection only.
- Drag-plane UX may need small sensitivity tuning based on live scene scale and user camera setups.
- `validation`:
- `node --check beastside-3d-hero-banner/assets/js/frontend.js`: pass.
- `node --check beastside-3d-hero-banner/assets/js/admin-composer.js`: pass.
- Static verification confirms composer field/control additions for `lensMm`, ambient toggle, and 3 point lights in `class-bs3d-banner-post-type.php`.
- Static verification confirms admin-preview helper bridge events are wired (`bs3d:editor-bridge`, `bs3d:editor-helper-update`) and helper rendering is gated to admin preview surface.
- `next_actions`:
- Run live WP test pass for drag editing (`camera`, `pointLight1-3`) across XY/XZ/YZ modes.
- Confirm schema v2 persistence through Save, Template Apply, Version Restore, and Import/Export roundtrip.
