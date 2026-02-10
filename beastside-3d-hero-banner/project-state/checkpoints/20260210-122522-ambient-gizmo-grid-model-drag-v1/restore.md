# Restore: ambient-gizmo-grid-model-drag-v1

## Checkpoint
- `checkpoint_id`: `20260210-122522-ambient-gizmo-grid-model-drag-v1`
- `scope`: `incremental-change`
- `branch`: `beta-updates`

## Restore Procedure
1. Ensure working tree is clean or stash local changes.
2. Checkout the branch containing this checkpoint notes:
   - `git checkout beta-updates`
3. Locate the commit containing this checkpoint ID:
   - `git log --oneline -- beastside-3d-hero-banner/project-state`
4. Restore repository state from that commit (non-destructive path):
   - `git checkout <commit_sha> -- beastside-3d-hero-banner`
5. Reinstall/refresh plugin and verify:
   - Edit Mode supports `ambient`, `pointLight1..3`, `model1..3`.
   - Grid/Axes/XYZ label toggles work in admin preview.
   - Camera frame helper is visible and non-draggable.
   - No helper meshes render on published Elementor/shortcode output.

## Default Rollback Target
- If a rollback is requested without a checkpoint ID, use the latest `stable = yes` row in:
  - `beastside-3d-hero-banner/project-state/CHECKPOINT_INDEX.md`
