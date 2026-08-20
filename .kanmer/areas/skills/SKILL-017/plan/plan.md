# Plan — SKILL-017: correct `kanmer-auto` stopping and serial fallback

## Objective

Make `kanmer-auto` stop on explicit live safety/readiness predicates, return every worker to the controller for reconciliation, persist an exact hand-off before stopping, and use the same algorithm with one lane when parallel dispatch is unavailable—without collapsing independent review/verification into self-approval.

## Starting state

- `kanmer-auto` contains contradictory or insufficient stopping/fallback prose.
- SKILL-020 makes roster work gates-first.
- SKILL-016 supplies durable group run state.
- SKILL-021 binds execute/review/verify to packets and SHA records.
- The compiled workflow requires GitHub/check/stage evidence rather than agent assertions.

## Required changes

### 1. Audit every continuation/stop statement

1. Read the complete current `kanmer-auto/SKILL.md` and every referenced asset.
2. Extract every phrase containing continue, finish, done, stop, retry, fallback, serial, subagent, review, merge, verify, force, or blocked.
3. Compare each with SKILL-016/020/021 and FRD-023.
4. Identify contradictions, unreachable rules, and implicit scope broadening.
5. Preserve correct lane cap, group ordering, board-worktree, and gates-first instructions.
6. Remove or rewrite universal “continue until done” language.

### 2. Define controller action loop

7. State that the controller chooses one safe action per ready lane.
8. Before assignment, require live reads of item, links/dependencies, taken state, relevant documents/versions, and `get_doc_gates`.
9. Persist lane assignment before dispatch through SKILL-016 state.
10. Require each worker prompt to contain the execution packet/approved plan, exact role, allowed scope, and Stop condition.
11. On worker return or timeout, return control to the controller—never let the worker select another ticket.
12. Re-read live item/docs/activity/Git/PR evidence.
13. Compare actual mutations with approved scope/checklist.
14. Persist reconciliation/result before choosing the next action.
15. If the state is uncertain, stop dispatch until resolved.

### 3. Define mandatory stop predicates

16. Add a numbered stop table/section with exact predicate, run status, evidence to record, and resume action.
17. Stop before writes/dispatch for wrong project fingerprint or unsupported required capability.
18. Stop for unhealthy/unknown board worktree where the next action could touch the board/source incorrectly.
19. Stop when durable run state cannot be written and read back.
20. Stop for unresolved non-parked questions.
21. Stop when a required governing/pipeline document is absent.
22. Stop when the approved plan/document version changed materially and approval is stale.
23. Stop for live dependency or ticket occupancy by another actor.
24. Stop for branch/worktree mismatch or unsafe path.
25. Stop on worker-reported plan deviation, ambiguity, destructive risk, security/secret issue, or unavailable required command/environment.
26. Stop on failed test/verification rather than retrying blindly.
27. Stop when required PR/check/merge state cannot be established.
28. Stop when the plan's explicit `## Stop condition` is reached.
29. Stop at operator target/time/budget/cancel boundary.
30. Pause/block when no ticket has a safe next action.
31. Complete only under the explicit completion predicate.

### 4. Define persisted hand-off

32. Before an intentional safe stop, set run status `paused`, `blocked`, `completed`, or `aborted` as appropriate.
33. Record exact failed/reached predicate id/text rather than generic prose.
34. Record affected ticket(s), last observed stage/gate/document versions, worker/attempt, commands/evidence already obtained, and remaining roster.
35. Record one deterministic next read/action required to resume.
36. Append a stop event to the durable event log.
37. Write/readback full run record, then pointer, before returning final output.
38. If state persistence itself fails, report that failure and do not claim a durable hand-off/completion.

### 5. Distinguish worker, ticket, and run completion

39. Define worker completion as return at its assigned Stop condition—not ticket done.
40. Define ticket lane target by the run's declared boundary and live Kanmer/Git/PR evidence.
41. Require live gate/doc/stage proof before marking a ledger row finished.
42. Define run completed only when every selected non-skipped ticket meets target and no lane is active/waiting.
43. Keep blocked/skipped distinctions and reasons visible.
44. Do not infer completion from text summaries or checklist prose alone.

### 6. Implement serial fallback

45. Define serial fallback as setting/persisting `lane_limit: 1` plus a `parallel-unavailable` event/reason.
46. Keep the identical ordered roster, gates-first readiness, action loop, state cadence, worktree/take rules, packet, and stop predicates.
47. Permit only one active/uncertain ticket at a time.
48. Finish/reconcile/persist the current action before assigning the next ticket.
49. Do not pre-take future tickets.
50. Do not broaden scope or combine tickets to reduce calls.
51. If no worker dispatcher exists but the controller can safely adopt the designated preparation/execution role, enter that role explicitly and obey its skill.
52. Return to controller mode after the role's Stop condition.
53. Never represent the same context as an independent reviewer of its own implementation.
54. If independent review/verifier capability is unavailable, stop at that boundary with the exact required hand-off.
55. Do not waive exact-SHA verification/proof.

### 7. Define dispatch failure/retry behavior

56. Distinguish “launch definitely failed before mutation” from “worker status unknown”.
57. For a clearly transient pre-mutation transport failure, permit at most one logged retry.
58. Before retry, re-read ticket taken/activity/Git/PR state to confirm no worker mutation/occupancy.
59. If status is unknown, mark waiting/blocked and dispatch nothing else that could conflict.
60. Never automatically retry failed tests, migrations, build commands, or implementation actions.
61. Never use `force` takeover as fallback.
62. On later resume, reconcile unknown attempts through live state.

### 8. Preserve phase boundaries

63. Preparation uses resolved profile/gates, not universal docs.
64. Execution uses `get_execution_packet`, ticket worktree, checklist, and no-merge boundary.
65. Review uses current PR head/review attestation/checks and required independence.
66. Verification begins only after confirmed merge and uses exact merge SHA.
67. Done is entered only after live proof/questions gates pass.
68. Every stage move uses Kanmer gates and actual required artifacts.
69. Auto never directly edits board files or bypasses MCP.

### 9. Add prose/structural verification

70. Update skill with explicit numbered sections named in `files.md`.
71. Reference SKILL-016 templates rather than restating a competing schema.
72. Add validator assertions for exact `lane_limit: 1`, read/reconcile/persist sequence, Stop condition, role independence, no force, and completion predicate.
73. Add negative prose assertions for the forbidden patterns listed in `files.md`.
74. Ensure validators tolerate legitimate explanatory occurrences but catch normative contradictions.
75. Keep `verify:skills` as the one canonical rail.

### 10. Scenario proof

76. Create disposable grouped tickets with varied profiles/readiness.
77. Run once with parallel capacity and record selection order/predicates.
78. Run equivalent scenario with dispatcher disabled; assert same order/predicates and lane limit one.
79. Assert state is persisted before every serial action.
80. Reach an implementation Stop condition; assert control returns/reconciles before next ticket.
81. Trigger unresolved question, live dependency, occupied ticket, stale plan version, failed command, wrong project, and state-write failure; assert distinct persisted stop reasons and no further dispatch.
82. Simulate pre-mutation transport failure and prove one safe retry only.
83. Simulate uncertain worker status and prove no competing dispatch/take.
84. Remove independent reviewer capability and prove explicit review hand-off, not self-pass.
85. Confirm exact-SHA verifier absence similarly stops.
86. Send a worker “done” message without board evidence and prove ticket/run are not completed.
87. Resume from each stop and follow the recorded deterministic action.
88. Run skill verification and root verify.
89. Record scenario event excerpts and live gate evidence in post-implementation report.

## Expected files

- `plugins/kanmer/skills/kanmer-auto/SKILL.md`
- SKILL-016 canonical run-state template only for aligned enum/field wording
- canonical skill/prose verification scripts
- FRD-023 only if the governing delta is missing

## Acceptance checks

- Every next action is selected by controller after live reconciliation.
- Mandatory stop predicates are explicit and distinct.
- Stop is persisted with exact resume action before final output when safe.
- Worker/ticket/run completion are not conflated.
- Serial fallback is the same algorithm with lane limit one.
- Serial execution never removes required role independence/evidence.
- Unknown worker state blocks further conflicting dispatch.
- Only one narrowly defined pre-mutation transport retry is allowed.
- No force takeover, blind command retry, self-review, auto-waiver, or scope broadening.
- Disposable parallel/serial/stop/resume scenarios and `verify:skills` pass.

## Verification commands

```bash
npm run verify:skills
npm test
npm run typecheck
npm run verify
git diff --check
git status --short
```

Use Kanmer on a disposable group for the scenario matrix and retain durable-state evidence.

## Failure and deviation rules

- Stop implementation if SKILL-016's final state schema/path differs; align to it rather than creating another format.
- Do not weaken execute/review/verify boundaries to make serial mode appear complete.
- Do not add new MCP tools/stages/leases, force takeover, test retries, or automatic merge.
- Do not claim completion without live predicate evidence.
- Do not rebuild MCP bundle for skill-only changes.
- Do not merge; hand off for independent review.

## Stop condition

Stop when `kanmer-auto` has one unambiguous controller loop, explicit persisted stop predicates, correct worker/ticket/run completion definitions, and a lane-limit-one fallback that preserves all gates, state, worktree, role-independence, review, and exact-SHA proof boundaries; all scenario and skill validators are green and the PR is ready for independent review.
