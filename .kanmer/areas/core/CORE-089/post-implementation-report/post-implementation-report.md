# CORE-089 post-implementation report

CORE-089 reconciled the CORE-026 cumulative branch with current `origin/main` (`34245be039e8fd8395b5e31835602c54e62e98a4`) at the exact reviewed source head `453a92091d7a422a237996f024ab6940ea6fccfb`. A non-content merge commit restored the GUI-109 group-assignment files that the stale PR diff reported as deleted:

- `apps/gui/src/renderer/src/components/ContextMenu.test.tsx`
- `apps/gui/src/renderer/src/lib/groupMenu.ts`
- `apps/gui/src/renderer/src/lib/groupMenu.test.ts`

## Evidence

- Integration commit: `dcfe49b5af7d5dad026a8ced4380039df2d7a3cc`.
- PR #216 independently reviewed PASS and merged non-squash into `core-026-project-declared-sources` as `f2e694a4f9ce689c0949814ea88c2910ddb93f37`.
- GUI-109 group-menu files match current `main` byte-for-byte.
- Focused integration tests: 8/8 PASS.
- Workspace typecheck, docs verification, and diff-check: PASS.
- The prior hosted run `32598710721` remains preserved in CORE-026 review evidence as failed. Fresh hosted verification waits for CORE-088 source remediations.

No source behavior was changed by this ticket. Live provider/network/package evidence remains INCONCLUSIVE. Post-merge proof remains unchecked until verification on merged main.
