# Checkpoint Index

Latest stable checkpoint should be used for rollback unless a specific checkpoint ID is requested.

| checkpoint_id | date_utc | change_slug | scope | summary | stable |
|---|---|---|---|---|---|
| 20260209-110602-renderer-timeout-guard | 2026-02-09T11:06:02Z | renderer-timeout-guard | incremental-change | Hardened renderer fallback path so timeout/error state blocks late async model completion from restarting render flow. | yes |
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
