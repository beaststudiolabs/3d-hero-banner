# Checkpoint Index

Latest stable checkpoint should be used for rollback unless a specific checkpoint ID is requested.

| checkpoint_id | date_utc | change_slug | scope | summary | stable |
|---|---|---|---|---|---|
| 20260210-092423-admin-legibility-rebalance-v2 | 2026-02-10T09:24:23Z | admin-legibility-rebalance-v2 | incremental-change | Fixed dark-theme legibility by scoping tokens to Composer, rebalancing neutral contrast, adding fallback color vars/placeholders, and bumping plugin version to 0.2.7. | no |
| 20260210-085621-admin-cache-bust-hotfix | 2026-02-10T08:56:21Z | admin-cache-bust-hotfix | incremental-change | Added filemtime-based cache-busting for admin CSS/composer JS and bumped plugin version to 0.2.6 so admin UI updates are not blocked by stale assets. | no |
| 20260210-082110-admin-dark-30-70-layout-v2 | 2026-02-10T08:21:10Z | admin-dark-30-70-layout-v2 | incremental-change | Applied dark-glass admin v2 refinements with warm palette tokens, 30/70 Composer split, stronger default control outlines, viewport-smart Live Preview sizing, and Data Transfer shell/panel parity. | no |
| 20260210-061745-admin-ui-bubble-refresh-v1 | 2026-02-10T06:17:45Z | admin-ui-bubble-refresh-v1 | incremental-change | Applied admin-first bubble/glass visual refresh to Settings, Diagnostics, and Composer; bumped plugin version to 0.2.5 for cache-busting. | no |
| 20260210-055536-validation-pass-f022-f037 | 2026-02-10T05:55:36Z | validation-pass-f022-f037 | incremental-change | Validation hardening pass recorded live evidence for F022/F024/F031/F032/F035/F037 and added v0.2.4 release gate with explicit blockers. | no |
| 20260210-050120-elementor-auto-stretch-height | 2026-02-10T05:01:20Z | elementor-auto-stretch-height | incremental-change | Added Elementor container auto-stretch height behavior for standard mode and ResizeObserver-driven runtime resizing. | no |
| 20260210-010938-frontend-safe-proxy-and-fullscreen | 2026-02-10T01:09:38Z | frontend-safe-proxy-and-fullscreen | incremental-change | Added signed public model-proxy fallback for published renders and per-banner fullscreen viewport mode. | no |
| 20260209-125515-save-state-docs-only-and-proxy-parse-fix | 2026-02-09T12:55:15Z | save-state-docs-only-and-proxy-parse-fix | incremental-change | Converted save states to markdown-only checkpoints and fixed admin proxy model parse path for GLB/GLTF. | no |
| 20260209-124728-activation-output-bom-fix | 2026-02-09T12:47:28Z | activation-output-bom-fix | incremental-change | Removed UTF-8 BOM from PHP include file to eliminate 3-character unexpected output on activation. | no |
| 20260209-123937-model-fetch-proxy-cachebust | 2026-02-09T12:39:37Z | model-fetch-proxy-cachebust | incremental-change | Bumped plugin version to 0.2.1 for cache-busting so model proxy fallback JS is guaranteed to load. | no |
| 20260209-123342-model-fetch-proxy-fallback | 2026-02-09T12:33:42Z | model-fetch-proxy-fallback | incremental-change | Added secure admin-preview model proxy fallback and frontend retry path for network/CORS model fetch failures. | no |
| 20260209-120529-model-fetch-normalization-fix | 2026-02-09T12:05:29Z | model-fetch-normalization-fix | incremental-change | Added model URL normalization and classified fetch diagnostics for direct link/CORS/mixed-content failures. | no |
| 20260209-111549-qa-and-release-docs | 2026-02-09T11:15:49Z | qa-and-release-docs | incremental-change | Added QA execution report artifact and v0.2.0 release checklist after GitHub push. | yes |
| 20260209-110602-renderer-timeout-guard | 2026-02-09T11:06:02Z | renderer-timeout-guard | incremental-change | Hardened renderer fallback path so timeout/error state blocks late async model completion from restarting render flow. | no |
| 20260209-110022-import-export-v1 | 2026-02-09T11:00:22Z | import-export-v1 | incremental-change | Finalized schema-versioned data transfer workflows with conflict handling and diagnostics logging. | no |
| 20260209-110021-template-versioning | 2026-02-09T11:00:21Z | template-versioning | incremental-change | Added template save/apply, version snapshots/restore, and duplicate banner support. | no |
| 20260209-110020-admin-composer-v1 | 2026-02-09T11:00:20Z | admin-composer-v1 | incremental-change | Delivered structured admin composer controls and real-time admin preview integration. | no |
| 20260209-110019-renderer-foundation | 2026-02-09T11:00:19Z | renderer-foundation | incremental-change | Replaced simulated flow with production Three.js GLTF renderer, real model loads, and render-success gating. | no |
| 20260209-110018-wp-smoke-validation | 2026-02-09T11:00:18Z | wp-smoke-validation | incremental-change | Recorded green diagnostics smoke validation evidence and updated feature matrix verification rows. | no |
| 20260209-103356-vendor-assets-preload | 2026-02-09T10:33:56Z | vendor-assets-preload | incremental-change | Bundled Three.js, GLTFLoader, Draco, and Meshopt vendor assets for one-shot installation and updated source/license docs. | no |
| 20260209-101640-baseline-full-chat | 2026-02-09T10:16:40Z | baseline-full-chat | full-chat-backfill | Initial context preservation baseline with full-chat feature/documentation backfill. | no |

## Rollback Rule
- Default rollback target: latest row with `stable = yes`.
- If a specific checkpoint is requested, use that checkpoint ID exactly.
- Save-state policy note (effective 2026-02-09):
- Checkpoints are markdown-only (`diff-summary.md`, `restore.md`) to avoid archive bloat.
