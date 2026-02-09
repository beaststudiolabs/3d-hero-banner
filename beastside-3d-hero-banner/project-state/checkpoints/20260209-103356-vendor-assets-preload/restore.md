# Restore Instructions

## Default Rule
Use latest stable checkpoint from `project-state/CHECKPOINT_INDEX.md` unless a specific checkpoint ID is requested.

## Restore Steps
1. Backup current `beastside-3d-hero-banner` directory.
2. Remove or rename current plugin folder.
3. Extract this checkpoint `source.zip`.
4. Copy extracted `beastside-3d-hero-banner` into `wp-content/plugins/`.
5. Reactivate plugin if needed.
6. Verify `assets/vendor` contains Three.js, GLTFLoader, Draco, and Meshopt files.

## Post-Restore Verification
- Check `project-state/CHECKPOINT_INDEX.md` points to this checkpoint as stable.
- Confirm diagnostics cards for runtime/loader/decoder availability use bundled files.
