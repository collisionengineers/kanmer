# GUI-112 plan — custom branch handoff and protected sync lifecycle

## Governing docs

- `docs/functional/frd/FRD-020-board-git-worktree-sync.md`: preserve R1/R3 and R5. The board remains in `.worktrees/kanmer`; automatic/manual sync never touches another branch; protected-default renames refuse; custom renames push the destination and retain the old remote ref until `KANMER_BOARD_BRANCH` is retargeted.
- `docs/architecture/adr/ADR-0016-compiled-workflow.md`: GitHub protection and required checks remain merge physics. This ticket records operator intent and local evidence but does not add a GitHub API/App or claim hosted retarget proof.

## Outcome

A configured custom branch can be renamed to another custom branch through the existing GUI path without being mistaken for an incomplete handoff. The live worktree is checked against the cached branch before ordinary rename, an exact requested branch is accepted only as a completed administrator handoff, and an unexpected branch pauses fail-closed. Failed closed-project reconciliation remains visible and retryable. GUI-created MCP registrations receive the saved branch convention, while portable defaults remain path-free. Settings, AGENTS, FRD/manual text, and workflow tests agree that the hosted variable must be updated before a retained old ref is deleted.

## Ordered implementation

1. Add pure invocation coverage and pass the configured branch from GUI settings into local MCP server environments; keep default portable descriptors byte-stable and avoid project-path embedding.
2. Separate cached-branch preflight from requested-destination handoff recognition in the existing GUI branch helpers/caller, preserving protected-default refusal and unexpected-branch blocking.
3. Make a failed board-worktree reconciliation with a retained root visible in Settings and make the manual Retry caller re-run reconciliation before attempting sync.
4. Add real-Git/helper and production-caller regressions for ordinary custom rename, exact handoff, unexpected branch, unavailable reconciliation, and no unsafe sync/ref mutation.
5. Update the managed instruction source and generated AGENTS/setup mirror with the retained-ref/Actions-variable/local-MCP convention; update FRD-020 R5 and board-sync/settings/troubleshooting sources, then regenerate the embedded manual.
6. Keep the workflow's configured branch fetch and add/refresh static assertions proving no literal `kanmer-board` fetch remains.
7. Run focused GUI Git/sync/provider tests, full GUI/typecheck/build/manual/scripts/docs/diff rails as feasible; preserve any inherited baseline or unavailable hosted-protection failures exactly.
8. Write the post-implementation report, update the checklist/traceability, push the dedicated branch, open the GUI-112 PR, and stop at Review for independent review.

## Scope boundary

No GitHub API/App, branch-protection or Actions-variable mutation, CORE-043 merge/review, new package, provider feature, or unrelated MCP behavior change.

## Proof approach

Local real-Git tests prove branch/ref/worktree ordering and no-mutation refusal. Pure provider tests prove configured-branch propagation. Production-caller tests prove failed reconciliation does not invoke `syncBoard` until live state is safe. Static workflow/manual/managed-block checks prove textual consistency. Hosted protection/variable retargeting remains INCONCLUSIVE and must be called out in the report.

## Risks and mitigations

- A requested destination can be mistaken for an administrator handoff: inspect the live branch and accept only exact destination; reject every other branch.
- A paused sync error can be erased by branch refresh: keep mismatch-generated state separate from genuine sync failures and only clear the generated state on exact handoff.
- Local MCP and hosted workflow may disagree: pass the saved convention into GUI registrations and keep the same name in the managed instructions and docs.
- Generated/manual drift can hide the real handoff: regenerate and run the repository's manual/docs/managed-block rails.
