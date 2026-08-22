# CORE-089 post-implementation report

CORE-089 reconciled the CORE-026 cumulative branch with current `origin/main` (`34245be039e8fd8395b5e31835602c54e62e98a4`) at the exact reviewed source head `453a92091d7a422a237996f024ab6940ea6fccfb`. A non-content merge commit restored the GUI-109 group-assignment files that the stale PR diff reported as deleted:

- `apps/gui/src/renderer/src/components/ContextMenu.test.tsx`
- `apps/gui/src/renderer/src/lib/groupMenu.ts`
- `apps/gui/src/renderer/src/lib/groupMenu.test.ts`

The integration merge commit is recorded locally on branch `core-089-rebase-verify`; no source behavior was changed by this ticket.

## Evidence

- `npm run build`: PASS (core and MCP server, including standalone bundle).
- `npm run typecheck`: PASS for all workspaces.
- `npm run test:scripts`: first concurrent attempt failed because build had not finished and generated core dist was absent; rerun after build PASS 88/88.
- `npm test -w @kanmer/gui`: focused/group-menu and broader GUI tests emitted PASS through the editor suite, then the Windows cleanup phase hung without a result and was interrupted; no full-suite PASS is claimed. This preserves the known Windows cleanup boundary.
- `git diff --check origin/main..HEAD`: PASS after reconciliation.

The prior hosted run `32598710721` remains preserved in CORE-026 review evidence as failed (core cleanup races plus stale gate snapshot). Fresh hosted verification is intentionally not claimed until CORE-088 source remediations are merged into the cumulative branch; that is the remaining implementation dependency.

## Traceability

- Ticket: CORE-089
- Parent: CORE-026
- Branch: `core-089-rebase-verify`
- Reconciliation commit: record after commit creation
- PR/hosted run: pending independent review and CORE-088 completion

Post-merge proof remains unchecked. Live provider/network/package evidence remains INCONCLUSIVE.
