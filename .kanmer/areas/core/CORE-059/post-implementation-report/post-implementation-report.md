# Post-implementation report — CORE-059

## Outcome

CORE-059 implements the remaining CORE-043 branch-variable handoff safety on top of the exact CORE-043 cumulative head `4f106865`. Custom-to-custom board renames now push the destination and retain the previous remote ref, returning a stable warning that names `KANMER_BOARD_BRANCH`. The existing protected-default refusal and mismatch guards from CORE-043/CORE-052/CORE-054 remain intact.

Branch: `core-059-gate-ref-retention`
Worktree: `.worktrees/core-059`
Implementation: `835f9f51cbb786024d8d4523d93332399d769a77`
Base: `4f106865` (`origin/core-043-protection-retarget`)

## Changed files

- `apps/gui/src/main/kanmerGit.ts`: retains old remote refs for custom-to-custom renames and returns the operator handoff warning; preserves the protected `kanmer-board` refusal.
- `apps/gui/src/main/kanmerGit.test.ts`: updates real-Git rename/reconciliation assertions for retained custom refs, warning text, and protected-default refusal.
- `docs/manual/board-sync.md`: documents the variable-retarget handoff and deferred old-ref cleanup.
- `docs/manual/troubleshooting.md`: documents recovery for a retained custom remote ref.
- `apps/gui/src/renderer/src/manual/chapters.generated.ts`: regenerated 22-chapter manual output.

No workflow, GitHub API, protection rule, provider, core, or unrelated GUI behavior was changed.

## Governing-doc alignment

- FRD-020 R5 requires publishing the destination before old-ref cleanup and preserving the board worktree path/history. The implementation pushes first and retains the old custom ref until the external gate variable is retargeted.
- ADR-0016 keeps GitHub protection and merge physics outside Kanmer. The GUI does not invent an API or claim to update repository variables; it surfaces the exact administrator action through the warning/manual.
- The protected-default behavior remains fail-closed: `kanmer-board` is refused until an administrator completes the documented variable/protection/worktree handoff.

## Verification ledger

- `npm run test -w @kanmer/gui -- --run src/main/kanmerGit.test.ts`: PASS, 20/20 after rebasing onto `4f106865` (exit 0; 50.00s).
- `npm run build:core`: PASS (exit 0).
- `npm run test:scripts`: PASS, 89/89 (exit 0) after the core build. An earlier parallel invocation raced the absent worktree core dist and failed with missing `packages/core/dist/index.js`; the sequential rerun is authoritative.
- `npm run verify:docs`: PASS; generated manual current (exit 0).
- `npm run check:manual`: PASS; 22 chapters current (exit 0).
- `git diff --check 4f106865 HEAD`: PASS (exit 0).
- GUI typecheck remains blocked by the inherited shared-dispatch baseline: missing `dispatchDeliverableProven`, unsupported `verifyDeliverable`, implicit-any callback, and `antigravity` not assignable to `DispatchProviderId`.
- Broad GUI test attempts did not produce a clean authoritative result in this shared Windows environment: the pre-rebase run was 291/294 with the known shared-dispatch collection/expectation failures plus two transient real-Git cleanup EPERM/timeouts; the final concurrent run was disrupted by worker/package-resolution failures for `debug`/Vite. The touched focused suite is green 20/20.
- GUI build is not claimed: the final standalone rerun exited 1 because the shared checkout lacked the `electron-vite` command shim; an earlier concurrent attempt also hit the known shared-dispatch export/package-resolution failures.
- Hosted Actions and live repository-variable/protection evidence are INCONCLUSIVE; no external credentials or API mutation was attempted.

## Handoff

The PR will target the CORE-043 cumulative branch, remain open for independent review, and stop at Review. No merge, self-review, or cleanup is performed in this lane. Verification should rerun the focused GUI Git suite, manual/docs rails, and the authoritative hosted checks on the merged lineage, then inspect that the custom old remote ref is retained until the `KANMER_BOARD_BRANCH` handoff.
