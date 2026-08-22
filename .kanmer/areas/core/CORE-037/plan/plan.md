# Plan — CORE-037: Normalize Windows temporary-path assertions in Git integration tests

## Approach

Keep the remediation in `apps/gui/src/main/kanmerGit.test.ts`: introduce one test-local path-identity helper that canonicalizes existing paths with `realpathSync.native` on Windows and falls back to `resolve` when native resolution is unavailable or the path is absent, then use it only at the three existing-worktree identity comparisons. This preserves the real Git fixture, branch/ref assertions, and production path API while making the assertion compare filesystem identity rather than Windows spelling. It is narrower and safer than changing `kanmerGit.ts`, lower-level path semantics, fixtures, or CI configuration.

## Governing docs

- `docs/functional/frd/FRD-020-board-git-worktree-sync.md`: meets R1/R5's stable board-worktree path contract by keeping production values and Git/ref operations unchanged; the test now recognizes equivalent filesystem spellings without treating different locations as equal.

## Steps

1. Add a private `pathIdentity` helper in the real-Git test file using native realpath for existing Windows paths and lexical `resolve` fallback for missing/non-Windows paths.
2. Replace only the existing-worktree path equality assertions at the rename/path-preservation and idempotence checks with `pathIdentity`; leave missing-path, branch, ref, and filesystem-presence assertions unchanged.
3. Run the focused real-Git test and record exit code, test count, and any pre-existing cleanup timeout/EPERM failure without relabelling it.
4. Run the full GUI test suite, workspace typecheck/build, and `git diff --check`; run the shared verification rail where proportionate and preserve any baseline failures, especially the known Windows path-alias CI evidence and local cleanup failure.
5. Write the implementation report/checklist evidence, commit only the scoped test change, push the ticket branch, open a PR naming CORE-037, and move the ticket to Review for independent review.

## Verification

On the ticket worktree, run the focused `kanmerGit.test.ts` suite, then the full GUI suite, `npm run typecheck -w @kanmer/gui`, `npm run build -w @kanmer/gui`, and `git diff --check`. Run the root/shared rail if time and environment permit. The report must distinguish the path-identity remediation result from any existing Windows cleanup EPERM/hook timeout or unrelated CI failure; proof is deferred to merged-main verification.

## Risks / open questions

- Native realpath can fail for a missing or concurrently removed path; the helper falls back to lexical `resolve`, preserving existing missing-path assertions.
- The local baseline already has a cleanup EPERM/hook-timeout failure, and the GitHub path-alias failure is external evidence. Neither is silently claimed fixed by a local pass.
- No operator questions remain; broad cleanup or CI changes are separate scope.
