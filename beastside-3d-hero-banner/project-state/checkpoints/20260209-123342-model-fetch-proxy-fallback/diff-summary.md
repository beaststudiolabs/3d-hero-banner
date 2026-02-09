# Diff Summary

## Intent
Fix persistent admin preview `Failed to fetch` model errors by adding a secure proxy fallback path when direct browser fetch is blocked.

## Key Changes
- Added secure admin AJAX model proxy endpoint with nonce + capability checks.
- Added proxy URL validation and local/private host blocking for SSRF risk reduction.
- Added frontend retry flow for admin preview model loads when direct fetch fails due to network/CORS or mixed-content constraints.
- Added diagnostics events for retry/success through proxy fallback.
- Updated project-state docs and checkpoint index linkage.

## Artifact Files
- `diff-summary.md`
- `restore.md`


