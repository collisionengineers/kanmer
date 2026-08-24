# Plan — CI board-branch fetch ref

1. Update `kanmer-gate` to fetch `refs/heads/$KANMER_BOARD_BRANCH` into `refs/remotes/origin/$KANMER_BOARD_BRANCH`.
2. Make `git worktree add` resolve that same explicit ref, retaining the existing guard and safety check.
3. Add a focused workflow-source contract test so a future simplification cannot reintroduce the unresolved-ref sequence.
4. Run the workflow test and the existing `check-pr` CLI tests, then report the exact commands and results.

## Governing documents

- [FRD-009](../../docs/functional/frd/FRD-009-interrogative-workflow.md): the gate must be enforceable in CI and operate against the board data.
- [ADR-0011](../../docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md): the merge gate may read ticket-state information; this change does not extend its authority.
