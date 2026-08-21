# Plan — DOC-018: ship DOC-013 review hardening

## Approach

Apply the already independently reviewed local hardening commit `ec918ceb` to a fresh branch based on merged `main`. This follow-up repairs the original PR handoff only; it does not reopen PR #122 or change remote runtime behavior.

## Evidence

- Original manual merge: PR #122, merge `8eec2c625656af999d876db4e9587f885f5a08cc`.
- Reviewed but previously unpushed hardening: `ec918ceb`.
- Scope: the 26-row diagnostic matrix, docs verifier enforcement, generated manual refresh, and redacted packaged CLI evidence already recorded on the local review branch.
- MCP-028 public/Worker proof remains deferred.

## Steps

1. Take DOC-018 and create a fresh branch/worktree from merged `main`.
2. Cherry-pick `ec918ceb`; inspect the diff to ensure only the reviewed docs/verifier files change.
3. Run `npm run build`, `npm run verify:docs`, `npm test`, `npm run typecheck`, GUI build, and `git diff --check`.
4. Run an independent review on the pushed commit; fix any finding in this ticket only.
5. Merge the PR, rerun merged-main docs/test rails, write proof, and clean up.

## Stop condition

Stop before claiming completion if the hardening SHA is not reachable from merged `main`, if any verification command fails, or if the diff includes remote runtime/provider changes.
