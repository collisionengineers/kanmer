# Plan — CORE-095

## 1. Apply a core-package file-isolation policy

In `packages/core/package.json`, change both core Vitest entry points from their default file-parallel mode to Vitest's supported `--no-file-parallelism` option:

- `test`: retain `vitest run` and disable only parallel **files**;
- `test:watch`: retain watch mode and use the same file-level policy.

Do not add `--testTimeout`, `--hookTimeout`, `--retry`, worker-count masking, or platform-specific shell logic. The effect is deterministic suite ordering for the real filesystem-heavy core tests; individual tests retain the existing 5-second finite failure bound.

## 2. Document the maintenance convention

Update the existing command/convention guidance in `AGENTS.md` near the test commands to say that core Vitest files are intentionally serial because the suite exercises real filesystem and lock behavior on Windows. Keep the public command names unchanged and avoid adding a new CI rail.

## 3. Preserve behavior and assertions

Do not modify core runtime source or the named tests' expected values. The implementation review must verify that:

- stale-dead-owner lock recovery still proves reclamation and cleanup;
- area default/explicit profile precedence still proves the same profile selection;
- area ID/folder placement still proves the same paths and IDs;
- every existing test still has its ordinary finite timeout.

## 4. Verify progressively, then on the protected integration fixture

From CORE-095’s clean ticket worktree after the planned edit:

1. Run the three named files through the package `test` script; record the exit code and test counts.
2. Run the full core suite through the same package script; record the exit code and test counts.
3. Run core typecheck and build, plus `git diff --check`.
4. Run the authoritative `npm run verify` from a normal checkout as required by the repository rail.
5. After independent review/merge, have CORE-035 rerun its already-created protected Windows fixture at the reviewed exact head. Its `verify` job must pass; retain PR #1’s existing failed run as historical evidence.

Any failure remains a failure. If serial file execution does not eliminate the relevant Windows timeout, stop rather than raising a global timeout or weakening assertions.

## Governing documents

The linked FRD-006 remains accurate: proof must distinguish retained failure from a fresh pass on merged main. No FRD/ADR edit is planned. `AGENTS.md` is updated because this PR changes the maintenance convention for an existing command.
