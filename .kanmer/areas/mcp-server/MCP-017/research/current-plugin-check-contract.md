# Research — MCP-017 current worktree guard

## Question

How does the current `plugin:check` guard refuse a linked ticket worktree, and what direct regression coverage can prove that it still fails closed without touching the real board worktree?

## Findings

1. `scripts/check-plugin-sync.mjs` is the canonical guarded entry point. Its guard runs before source/tool, bundle, isolated-payload, or manifest validation. It resolves the checkout's physical `packages/core` path, resolves `@kanmer/core` from the script, and refuses unless the resolved module is a child of that checkout's core directory.
2. The original MCP-007 implementation used `isLinkedWorktree()`, comparing Git's `--git-dir` and `--git-common-dir`, with a `.git`-file fallback. The current main replaced that proxy with an ownership test: it detects the actual reason validation cannot be trusted (the workspace core resolves outside the checkout). This is stricter and also rejects a broken main checkout; it has no path/branch/board-worktree classifier.
3. The check's existing failure text explains the repair: install dependencies in the checkout so `@kanmer/core` resolves locally, then rerun `npm run plugin:check`. `FRD-022 R6` requires a refusal in a linked worktree because byte comparison is meaningful only where the artifact was built.
4. Root `package.json` already discovers every `scripts/*.test.mjs` through `npm run test:scripts`, which is called by `npm test`; no runner or dependency change is required.
5. The existing `scripts/plugin-isolation.test.mjs` demonstrates the repository convention: Node's built-in `node:test`, OS-temporary fixtures, and explicit cleanup. This ticket can remain pure and need not create a Git worktree: the current guard no longer asks Git.

## Implication

The recorded plan's Git/path-vector matrix is stale relative to production. The correct focused change is to extract only the current pure “resolved core belongs to this checkout” predicate into a dependency-free `scripts/lib/` helper, invoke it from `check-plugin-sync.mjs`, and cover normal ownership, linked-worktree/main leakage, prefix collision, and Windows/POSIX normalization semantics. The test must prove the predicate refuses leakage; the normal-checkout `npm run plugin:check` run proves the live adapter still allows its valid path.

## Out of scope

Do not restore the obsolete Git probe, create or access a real/disposable board worktree, alter plugin build/check semantics, or modify CORE-034's board-worktree guard.
