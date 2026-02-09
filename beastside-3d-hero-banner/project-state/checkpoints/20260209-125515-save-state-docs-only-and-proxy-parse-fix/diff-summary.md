# Diff Summary

## Intent
1. Switch save-state checkpoints to markdown-only artifacts to avoid archive bloat.
2. Fix backend admin-preview GLB load failures during proxy retry.

## Key Changes
- Updated save-state policy docs to require only markdown checkpoint artifacts.
- Pruned checkpoint archive `source.zip` files and minimized `manifest.json` files as deprecated stubs where deletion was ACL-blocked.
- Updated checkpoint restore guidance to docs-only workflow.
- Updated frontend proxy retry model loading to use `fetch` + `GLTFLoader.parse`, avoiding GLB misparse from admin-ajax URLs.
- Updated QA/release docs and feature tracking for new policy.

## Artifact Files (Docs-Only)
- `diff-summary.md`
- `restore.md`

