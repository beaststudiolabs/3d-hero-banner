# Restore Instructions

## Default Rule
Use latest stable checkpoint from `project-state/CHECKPOINT_INDEX.md` unless a specific checkpoint ID is requested.

## Restore Steps
1. Backup current `beastside-3d-hero-banner` directory.
2. Remove or rename current plugin folder.
3. Review `diff-summary.md` and project-state docs for exact change details.
4. Apply or reapply the documented changes in your current plugin workspace.
5. Reactivate plugin if needed.
6. Run the phase verification checks below.

## Post-Restore Verification
- In admin banner composer, enter a remote `.glb` model URL and confirm preview no longer fails immediately with `Failed to fetch` when proxy retry is possible.
- Confirm diagnostics overlay/logs include `model_proxy_retry` and `model_proxy_success` on successful recovery.
- Confirm invalid URLs are still rejected with classified diagnostics.

