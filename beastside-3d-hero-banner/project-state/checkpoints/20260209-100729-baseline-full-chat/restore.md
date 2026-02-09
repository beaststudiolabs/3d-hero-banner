# Restore Instructions

## Default Rule
Use this checkpoint as the latest stable rollback target unless a different checkpoint ID is explicitly requested.

## Restore Steps
1. Backup current plugin folder if needed.
2. Remove or rename current `beastside-3d-hero-banner` directory in WordPress plugins.
3. Review `diff-summary.md` and project-state docs for exact change details.
4. Apply or reapply the documented changes in your current plugin workspace.
5. Reactivate plugin in WordPress admin if required.
6. Confirm expected files and docs exist under `project-state/`.

## Verification After Restore
- `project-state/PRD_ADDENDUM_CANONICAL.md` exists and references this checkpoint ID.
- `project-state/FEATURE_MATRIX.md` rows point to this checkpoint ID.
- `project-state/BUILD_LOG.md` includes this checkpoint entry.
- `project-state/CHECKPOINT_INDEX.md` marks this checkpoint as stable.
ï»¿

