# CORE-043 post-implementation report — cumulative head

## Result

CORE-043 and its merged CORE-048 remediation together implement the protection-aware board-branch rename boundary. The cumulative head refreshes open-context branch state before protected-transition decisions, guards no-board preference persistence, and makes the hosted gate consume KANMER_BOARD_BRANCH with the explicit kanmer-board migration fallback. ADR-0016 conservative protection inference remains an accepted bounded risk; no GitHub protection API mutation is claimed.

## Cumulative traceability

- Original implementation: 1a06ead17cca8f7a6c715db3a6f6fed6b3de5da6
- CORE-048 child: 8ffff2a0f8848bb42868559641b56148ba893ca6
- Child merge into this branch: 11930038542d402865bb26a23787d7d3cad3e2c5
- PR #168 cumulative head: 11930038542d402865bb26a23787d7d3cad3e2c5
- Child PR #170: merged non-squash into this branch

## Verification evidence

- Focused GUI Git: 16/16 PASS.
- Workflow static rail: 1/1 PASS.
- Scripts after core build: 89/89 PASS.
- Core build, docs/manual checks and git diff --check: PASS.
- Hosted run 32571224767: verify PASS; kanmer-gate was dependency-blocked before the circular board edge was removed. A fresh run is required against the repaired board state.
- Full GUI/typecheck/build dispatch/provider parity failures remain explicitly preserved from the packet; live protection retargeting is INCONCLUSIVE.

## Stop condition

The cumulative PR remains open for independent review and hosted rerun. After review PASS, merge is owned by the independent reviewer; CORE-043 and CORE-048 will then be verified together on merged main, after which proof and closeout can proceed.


2026-08-22T13:19:50Z cumulative stack update: CORE-052 PR #175 independently passed fresh cumulative review at f4705d9e and merged non-squash into CORE-043 branch as 4f106865947e556759aeb88363ea9aab7c01beac. CORE-043 now contains the original retarget implementation, CORE-048 hosted/sync remediation, and CORE-052/054/055 handoff-state lineage. Fresh cumulative review of PR #168 is required before merging into main. Hosted protection evidence remains INCONCLUSIVE.

2026-08-22T23:24:00Z GUI-118 implementation handoff: source commit e09009b2 is based on CORE-043 parent 1126253eed586111db60ed72eccf6754f0f5ef06; PR #219 targets core-043-protection-retarget. GUI-118 covers native functional branch binding, serialized project/provider lifecycle, Retry provider reconciliation, transactional branch preference persistence, observed-handoff native staleness, user-scoped reconnect clearing, and actionable push-recovery guidance. Deterministic evidence: settings 4/4, providers 66/66, connect 34/34, index.sync 10/10; reduced GUI 47 files/392 tests; typecheck, GUI build, docs, scripts 89/89 after build, and diff check PASS. The full Git-heavy GUI rail and live native/packaged/protected-host/hosted evidence remain INCONCLUSIVE as recorded in GUI-118. Independent review is required before merge.
