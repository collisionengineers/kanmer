# Post-implementation report — MCP-017

## What changed

- Added `scripts/lib/plugin-checkout-guard.mjs`, a dependency-free, pure `ownsCoreResolution` predicate. It normalizes with the selected platform path API, requires strict child containment, rejects prefix lookalikes, and keeps Windows and POSIX case semantics distinct.
- Updated `scripts/check-plugin-sync.mjs` to call that predicate at the existing earliest ownership preflight, without changing the refusal message or exit handling.
- Added `scripts/plugin-checkout-guard.test.mjs` under the existing `scripts/*.test.mjs` glob. It covers local ownership, leaked main-resolution refusal representative of a linked ticket worktree, prefix collision, strict containment, Windows normalization, and POSIX case sensitivity.

## Governing docs

`FRD-022` R6 requires `plugin:check` to refuse validation from a linked worktree. The diff retains that fail-closed contract and makes its current implementation directly executable in the canonical scripts test rail. No board worktree is inspected or modified.

## Verification

- `node --test scripts/plugin-checkout-guard.test.mjs`: 5/5 passed.
- `npm run test:scripts`: 71/71 passed.
- `npm run build`: passed; core and MCP server/standalone bundles built.
- First exact `npm test`: failed at the existing core migration test `migration: v2 → v3 > resuming does not rewrite tickets an earlier run already migrated` with the Vitest 5-second timeout (254/255 core tests). The command stopped before GUI/HTTP/scripts.
- First `npm run typecheck`: failed in the fresh worktree because the GUI resolved `@kanmer/core` to a missing/unbuilt declaration entry. This was setup state, not a source error.
- After the build, exact `npm test`: passed — manual freshness, core 255/255, GUI 318/318, MCP HTTP 3/3, and scripts 71/71.
- After the build, `npm run typecheck`: passed for every workspace.
- `git diff --check`: passed.
- In this linked ticket worktree, `npm run plugin:check` correctly refused (exit 1) because `@kanmer/core` resolves to the main checkout rather than this worktree. Its normal-checkout success is reserved for merged-main verification.

## Traceability

- Commit: `dd9f736050dcf029db8c42bcebe258875500410d`
- PR: #105 — https://github.com/collisionengineers/kanmer/pull/105 (merged 2026-08-21; merge commit 1fa516248610e8294819f50572b5d67e8495bb30).

## Risks and follow-up

The helper deliberately has no filesystem or Git access, matching the production guard's current direct ownership property. It does not restore the obsolete MCP-007 Git probe or overlap CORE-034's board-worktree policy. Merged-main verification completed on main at 1fa516248610e8294819f50572b5d67e8495bb30; npm run plugin:check passed with the committed bundle byte parity.
