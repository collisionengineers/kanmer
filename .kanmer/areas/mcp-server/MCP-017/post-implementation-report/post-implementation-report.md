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
- Root test component rails passed: manual check, core (255 tests), GUI suite, MCP HTTP (3 tests), and scripts suite. A single `npm test` invocation was started; the terminal capture stopped while the already-green GUI portion was reporting, so the component commands above are the recorded complete evidence.
- `npm run typecheck`: all workspaces passed.
- `git diff --check`: passed.
- In the ticket worktree, `npm run plugin:check` correctly refused because `@kanmer/core` resolved to the main checkout rather than this worktree. This is the expected safety behaviour, not a test failure. Run it from merged normal `main` during verify.

## Traceability

- Commit: `dd9f736050dcf029db8c42bcebe258875500410d`
- PR: pending creation.

## Risks and follow-up

The helper deliberately has no filesystem or Git access, matching the production guard's current direct ownership property. It does not restore the obsolete MCP-007 Git probe or overlap CORE-034's board-worktree policy.
