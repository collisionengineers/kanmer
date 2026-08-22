# Plan — CORE-055

## Governing docs

- `docs/functional/frd/FRD-020-board-git-worktree-sync.md`: a live board worktree is the source of truth; mismatches pause automatic sync and must not be repaired implicitly.
- `docs/architecture/adr/ADR-0016-compiled-workflow.md`: protected branch changes require an explicit administrator handoff; the GUI must fail closed when branch state is not proven.

## Ordered steps

1. Base the worktree on exact CORE-054 PR #176 head `1ef6852a676266e1760f61a328e00a7be67fdcb0` and inspect the current protected and ordinary rename ordering.
2. Add a single existing-helper predicate for ordinary rename eligibility, requiring `!branchMismatch`; use it in `applyGitPreferences` so a mismatch skips all rename calls while preserving the current preference.
3. Extend the real-Git regression with a cached branch different from the saved preference, asserting the mismatch decision is false and refs/worktree porcelain are byte-for-byte unchanged.
4. Run focused GUI Git tests, proportionate GUI/full checks, manual/docs/scripts/diff rails, and preserve unrelated typecheck/build failures exactly.
5. Write the implementation report, update checklist and traceability, open the stacked PR, and stop at Review for an independent reviewer.

## Stop condition

Do not self-review, merge, verify, or clean up. Live GitHub protection evidence stays INCONCLUSIVE.
