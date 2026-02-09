# Restore Instructions

## Default Rule
Use latest stable checkpoint from `project-state/CHECKPOINT_INDEX.md` unless a specific checkpoint ID is requested.

## Restore Steps
1. Backup current `beastside-3d-hero-banner` directory.
2. Remove or rename current plugin folder.
3. Extract this checkpoint `source.zip`.
4. Copy extracted `beastside-3d-hero-banner` into `wp-content/plugins/`.
5. Reactivate plugin if needed.
6. Run the phase verification checks below.

## Post-Restore Verification
- Export single and bulk packages, then import with each conflict mode.
- Confirm diagnostics logs include import/export entries and resulting counts.

