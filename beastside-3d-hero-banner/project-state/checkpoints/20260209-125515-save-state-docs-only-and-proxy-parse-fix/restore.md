# Restore Instructions

## Default Rule
Use latest stable checkpoint from `project-state/CHECKPOINT_INDEX.md` unless a specific checkpoint ID is requested.

## Restore Steps (Docs-Only Mode)
1. Read this checkpoint `diff-summary.md`.
2. Open matching entry in `project-state/BUILD_LOG.md` for full file/action trace.
3. Apply or reapply changes directly in current workspace.
4. Re-run listed validation checks.

## Post-Restore Verification
- Confirm checkpoint policy is markdown-only (`diff-summary.md`, `restore.md`).
- Confirm backend model proxy retry path parses GLB/GLTF without JSON token parse errors.
