# Restore: model-visibility-transformcontrols-hotfix

## Checkpoint
- `checkpoint_id`: `20260210-135027-model-visibility-transformcontrols-hotfix`
- `scope`: `incremental-change`
- `branch`: `beta-updates`

## Restore Procedure
1. Ensure working tree is clean or stash local edits.
2. Checkout the branch containing this checkpoint:
   - `git checkout beta-updates`
3. Locate the commit containing this checkpoint ID:
   - `git log --oneline -- beastside-3d-hero-banner/project-state`
4. Restore files from that commit if needed:
   - `git checkout <commit_sha> -- beastside-3d-hero-banner`
5. Reinstall/update plugin and verify:
   - models are visible in admin preview and published render.
   - if gizmo init fails, renderer still loads models and logs warning diagnostic only.

## Default Rollback Target
- If no specific checkpoint is requested, use latest `stable = yes` row in:
  - `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
