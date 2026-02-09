# Diff Summary

## Intent
Improve model URL reliability by normalizing common share links and classifying fetch failures with actionable diagnostics.

## Key Changes
- Added URL normalization pipeline in frontend renderer before GLTF model loads.
- Added normalization rules for GitHub blob URLs, Dropbox share URLs, and protocol-relative URLs.
- Added pre-load guards for invalid/non-direct URLs and HTTPS mixed-content URL blocking.
- Added classified diagnostics for model-load failures with troubleshooting metadata fields.
- Updated project-state docs and checkpoint index linkage.

## Artifact Files
- `diff-summary.md`
- `restore.md`


