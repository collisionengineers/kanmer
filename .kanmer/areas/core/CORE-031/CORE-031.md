---
id: CORE-031
type: ticket
title: Create `npm run verify` wrapping one shared VERIFY_STEPS
status: done
area: core
order: 10
assignee: codex-mcp-client
profile: chore
stageEntered:
  preparing: '2026-08-20T12:02:11.660Z'
  review: '2026-08-21T17:10:28.714Z'
  verifying: '2026-08-21T17:52:09.568Z'
  done: '2026-08-21T17:52:14.525Z'
labels: []
groups:
  - EPIC-009
  - HZN-004
  - HZN-007
links: []
blocks:
  - CORE-032
commits:
  - 2a0d489
  - 5e52d89
  - 87d83ba
  - c8c501b
  - f1c4a68
prs:
  - '120'
archived: false
created: '2026-08-20T10:14:42.483Z'
updated: '2026-08-21T17:52:16.964Z'
---

## What
`scripts/verify.mjs` exporting a single `VERIFY_STEPS` array + a root `"verify"` script; `scripts/release.mjs` imports the same array then continues with bump/pack.

## Why
GitHub cannot require a check that doesn't exist; AGENTS.md §10 is manual-only today. One step list prevents a third pyramid.

## Approach
dependency-free (same family as release.mjs). Steps: `npm run build` (materialise clean-checkout package exports) → `npm test` (includes check:manual) → `npm run typecheck` (all workspaces) → both MCP smokes → `npm run smoke:discovery` → `npm run verify:skills` → `npm run verify:agents-block` → `npm run plugin:check`. Excluded: GUI build, Electron boot smoke, `dist:check`, `plugin:build` (plugin:check compares committed bytes to a fresh build — running plugin:build in CI would dirty the tree). This **changes the release rail** (order + adds smoke:discovery + drops the duplicate check:manual entry) — say so in AGENTS.md §6: "`npm run verify` is the PR check; `scripts/release.mjs` is verify + bump/pack; do not invent a third pyramid."

## Verification
- [x] `npm run verify` green from a clean standalone checkout (build-first rail; then tests/typecheck/smokes)
- [x] release.mjs consumes VERIFY_STEPS
- [x] AGENTS.md §6 updated

## Outcome
PR #120 merged to `main` at `d58bb781`. Shared verification is wired into the root PR command and release gate. Standalone verification passed with a clean checkout, and merged-main verification passed after later MCP artifact remediation. Independent review passed; proof is recorded after merge.
