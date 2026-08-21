# Plan — MCP-017: directly test the current plugin-check worktree guard

## Objective

Add deterministic unit coverage for the current `plugin:check` ownership guard: validation must refuse when `@kanmer/core` resolves outside the checkout's own `packages/core`, while a normal checkout's resolved entry remains accepted.

## Governing docs

- `docs/functional/frd/FRD-022-mcp-server-surface.md` R6 requires `plugin:check` to refuse a linked worktree rather than claim that a byte comparison is meaningful there. This change preserves that contract and proves its actual, current implementation.
- The managed `AGENTS.md` board-worktree rule is preserved: no test reads, writes, or switches the real `.worktrees/kanmer` board checkout.

## Steps

1. Preserve the live contract by recording that the old Git-based `isLinkedWorktree` probe was superseded by a direct workspace-resolution ownership check.
2. Extract the smallest dependency-free pure predicate into `scripts/lib/`; it receives the own-core directory, resolved module path, and optional platform test hook, and returns whether the module is strictly contained by the own core directory.
3. Make `scripts/check-plugin-sync.mjs` call that predicate before any plugin validation. Preserve its existing refusal text and exit behaviour.
4. Add a `node:test` file under `scripts/` that calls the predicate directly and asserts:
   - local core entry acceptance;
   - main-checkout leakage/refusal representative of a linked ticket worktree;
   - prefix-collision refusal;
   - Windows slash/drive/path-case normalization;
   - POSIX case sensitivity;
   - strict containment (the core directory itself is not a module entry).
5. Run the focused test and full scripts suite, then run normal-checkout `npm run plugin:check`, `npm test`, typecheck, and diff whitespace validation. Do not run plugin validation in a linked worktree or touch the board checkout.

## Acceptance

- A regression that changes the predicate to allow external resolution fails the direct test.
- `check-plugin-sync.mjs` imports the predicate before its expensive/build-sensitive checks.
- No Git probe, fixture worktree, network dependency, or new test framework is added.
- The normal checkout remains certifiable with `npm run plugin:check`.

## Verification

```powershell
node --test scripts/plugin-checkout-guard.test.mjs
npm run test:scripts
npm run plugin:check
npm test
npm run typecheck
git diff --check
```
