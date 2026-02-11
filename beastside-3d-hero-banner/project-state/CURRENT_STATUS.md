# Current Project Status

Last updated (UTC): 2026-02-11T01:07:34Z

## Repository State
- Branch: `beta-updates`
- HEAD: `2b2ad9d` (`fix: stabilize model slot drag and direct-pick gizmos`)
- Remote: `origin/beta-updates` in sync
- Plugin version: `0.2.9`
- Stable rollback checkpoint: `20260209-111549-qa-and-release-docs`
- Latest checkpoint: `20260211-010734-status-snapshot-documentation`

## Progress Snapshot
- Total tracked features: `46`
- `implemented`: `28`
- `validated`: `18`
- `in_progress`: `0`
- `planned`: `0`
- `blocked`: `0`

## Completed Milestone Areas
- Core plugin baseline (Elementor + shortcode + diagnostics/debug system)
- Vendor/runtime preload for one-shot install (Three.js, GLTFLoader, Draco, Meshopt)
- Real runtime GLTF renderer with fallback and debug event instrumentation
- Structured admin composer + live draft preview
- Template/version/duplicate workflows
- Import/export workflows with conflict modes
- Model fetch reliability hardening (normalization + secure proxy fallback)
- Elementor published-height auto-stretch + fullscreen mode
- Admin UI modernization (dark glass + 30/70 + legibility hardening)
- Interactive admin preview controls (ambient/point/model helpers, grid/axes/labels)
- Model visibility regression hotfix + direct-pick/slot-stability fixes

## Current Functional Baseline
- Admin preview supports direct target picking and RGB axis gizmo translation.
- Slot-aware model mapping preserves Model 3 targeting in sparse model-slot configurations.
- Grid/axes helpers are rendered in scene space and align to model floor baseline.
- Public frontend render remains helper-free (admin-only helpers).

## Immediate QA Focus
1. Re-test Model 3 drag in both cases:
   - all 3 model slots populated
   - Model 2 empty and Model 3 populated
2. Re-test direct center-marker click selection for:
   - ambient
   - pointLight1..3
   - model1..3
3. Confirm axis-constrained drag behavior:
   - X only, Y only, Z only
   - center handle free movement
4. Verify no regression on published Elementor/shortcode pages.

## Working Policy
- Active development branch: `beta-updates`
- `main` remains promotion-only after explicit approval.
- Save-state is markdown-only checkpoints under `project-state/checkpoints/`.
