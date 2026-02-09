# Diff Summary

## Intent
Remove activation-time unexpected output caused by UTF-8 BOM bytes in an included PHP file.

## Key Changes
- Removed BOM marker from `includes/class-bs3d-banner-post-type.php`.
- Verified no plugin PHP file starts with BOM bytes.
- Updated project-state docs and checkpoint index linkage.

## Artifact Files
- `diff-summary.md`
- `restore.md`


