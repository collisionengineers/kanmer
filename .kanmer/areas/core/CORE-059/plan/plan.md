# Plan — CORE-059

## Governing docs

- **FRD-020:** preserve the board history and publish the destination before any cleanup; retaining the old remote ref extends that safety rule until the external gate is retargeted.
- **ADR-0016:** do not add an unauthorised GitHub API or merge-physics abstraction. Surface the repository-variable handoff as an operator action.

## Approach

Keep the existing local rename and destination push. When the source branch is custom (not the protected default), do not delete its remote ref; return a warning that names `KANMER_BOARD_BRANCH` and tells the operator when old-ref cleanup is safe. The protected-default refusal remains unchanged. Update deterministic real-Git tests and the two manual surfaces, then regenerate the shipped manual.

## Ordered steps

1. Change `renameBoardBranch` so custom-to-custom renames retain the old remote ref and return a stable warning after the destination push.
2. Update real-Git rename tests to prove the destination has the same history, the worktree path is unchanged, both remote refs remain, and the warning is surfaced.
3. Update board-sync and troubleshooting manual text, then regenerate the generated manual and run the manual consistency check.
4. Run focused GUI Git tests, typecheck/build, scripts/docs/diff rails, and record any inherited failures without weakening assertions.
5. Write the post-implementation report, record the commit/PR, and open the review packet.

## Proof and risks

Proof is the exact-head real-Git fixture plus manual/build rails. The main residual risk is an administrator forgetting to retarget the repository variable; the warning and retained ref make that state visible and recoverable. GitHub variable mutation and live branch-protection proof remain outside this ticket.
