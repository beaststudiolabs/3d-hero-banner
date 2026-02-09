# Restore Instructions

## Default Rule
Use latest stable checkpoint from `project-state/CHECKPOINT_INDEX.md` unless a specific checkpoint ID is requested.

## Restore Steps
1. Backup current `beastside-3d-hero-banner` directory.
2. Remove or rename current plugin folder.
3. Review `diff-summary.md` and project-state docs for exact change details.
4. Apply or reapply the documented changes in your current plugin workspace.
5. Reactivate plugin if needed.
6. Verify `assets/vendor` contains Three.js, GLTFLoader, Draco, and Meshopt files.

## Post-Restore Verification
- Check `project-state/CHECKPOINT_INDEX.md` points to this checkpoint as stable.
- Confirm diagnostics cards for runtime/loader/decoder availability use bundled files.

