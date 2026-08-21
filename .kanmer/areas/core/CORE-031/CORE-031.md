---
id: CORE-031
type: ticket
title: Create `npm run verify` wrapping one shared VERIFY_STEPS
status: implementing
area: core
order: 30
assignee: codex-mcp-client
profile: chore
stageEntered:
  preparing: '2026-08-20T12:02:11.660Z'
taken_at: '2026-08-20T21:51:18.907Z'
branch: core-031-shared-verify-steps
worktree: .worktrees/core-031
labels: []
groups:
  - EPIC-009
  - HZN-004
  - HZN-007
links: []
blocks:
  - CORE-032
archived: false
created: '2026-08-20T10:14:42.483Z'
updated: '2026-08-21T10:57:09.417Z'
---

## What
`scripts/verify.mjs` exporting a single `VERIFY_STEPS` array + a root `"verify"` script; `scripts/release.mjs` imports the same array then continues with bump/pack.

## Why
GitHub cannot require a check that doesn't exist; AGENTS.md §10 is manual-only today. One step list prevents a third pyramid.

## Approach
dependency-free (same family as release.mjs). Steps: `npm test` (includes check:manual) → `npm run typecheck` (all workspaces) → `npm run build` → both MCP smokes → `npm run smoke:discovery` → `npm run verify:skills` → `npm run verify:agents-block` → `npm run plugin:check`. Excluded: GUI build, Electron boot smoke, `dist:check`, `plugin:build` (plugin:check compares committed bytes to a fresh build — running plugin:build in CI would dirty the tree). This **changes the release rail** (order + adds smoke:discovery + drops the duplicate check:manual entry) — say so in AGENTS.md §6: "`npm run verify` is the PR check; `scripts/release.mjs` is verify + bump/pack; do not invent a third pyramid."

## Verification
- [ ] `npm run verify` green from the main checkout
- [ ] release.mjs consumes VERIFY_STEPS
- [ ] AGENTS.md §6 updated

## Outcome
