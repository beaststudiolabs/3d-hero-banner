# Restore: interactive-lighting-lens-layout-v1

## Checkpoint
- `checkpoint_id`: `20260210-105945-interactive-lighting-lens-layout-v1`
- `scope`: `incremental-change`
- `branch`: `beta-updates`

## Restore Procedure
1. Ensure working tree is clean or stash local changes.
2. Checkout the branch containing this checkpoint notes:
   - `git checkout beta-updates`
3. Locate the commit that contains this checkpoint ID in project-state docs:
   - `git log --oneline -- beastside-3d-hero-banner/project-state`
4. Restore repository state to that commit (non-destructive recommendation):
   - `git checkout <commit_sha> -- beastside-3d-hero-banner`
5. Reinstall/refresh plugin in WordPress and verify:
   - composer lens selector present
   - point light controls present
   - edit mode + drag plane controls present
   - admin preview helper drag updates form coordinates

## Default Rollback Target
- If this checkpoint must be rolled back, default to latest stable checkpoint listed in:
  - `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
