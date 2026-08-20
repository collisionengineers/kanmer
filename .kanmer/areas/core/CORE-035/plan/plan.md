# Plan — CORE-035: compiled-workflow spine integration verification

## Objective

Prove the complete 0.4.0 compiled-workflow spine against a real disposable private GitHub copy of the exact Kanmer source under test: packet refusals, bounded execution, real PR checks and gate outcomes, protected merge, detached exact-merge-SHA verification, PASS proof, Done movement, and full cleanup—without any manual override.

## Starting state

- CORE-033, MCP-023, SKILL-021, and CORE-025 block execution and must be merged/proven first.
- The production Kanmer repository and board must remain untouched by the fixture.
- The integration deliverable is the retained command/interaction log and final proof, not a new harness.

## Governing docs

- ADR-0016/FRD deltas from DOC-011: four audiences, readiness predicates, GitHub merge physics, packet/SHA records.
- CORE-033 playbook: exact protection settings and required-check rollout.
- CORE-024/025: exact `kanmer-gate` codes, warning/failure rollout, ticket-resolution and board-fetch behavior.
- MCP-023: packet ready/refusal contract and order.
- MCP-024/SKILL-021: current-head review and detached merged-SHA proof.
- EPIC-009: disposable end-to-end proof, no leases/new stages/override.

## Required changes

### A. Preconditions and run identity

1. Re-read all four blockers and confirm status Done, merged/reachable implementation SHAs, and PASS proof:
   - CORE-033
   - MCP-023
   - SKILL-021
   - CORE-025.
2. Confirm CORE-031/032/024, MCP-022/024, CORE-034, GUI-085, and DOC-011 are also merged because the scenario consumes their rail, identity/error, record, stability, and governing contracts.
3. Run the production Kanmer `npm run verify` on the exact source SHA to be copied; record SHA, command, environment, and zero exit.
4. Confirm authenticated `gh` can create a private repository, configure rules/protection, view Actions/checks, and delete the repository. Record account alias only; never store tokens.
5. Generate a collision-resistant run ID: UTC timestamp plus 8 random lowercase hex characters.
6. Set and record variables without secrets:

   ```bash
   RUN_ID=<...>
   FIXTURE_REPO=kanmer-spine-integration-$RUN_ID
   FIXTURE_DIR=<temp-root>/$FIXTURE_REPO
   SOURCE_SHA=<exact merged Kanmer SHA>
   ```

7. Create `scratch/integration-run.md` on CORE-035 with run ID, source SHA, operator alias, UTC start, environment, expected gate matrix, and empty cleanup section.
8. Start the final log file content locally/in memory with a strict event format: sequence, UTC, system, cwd, command/MCP call, input SHA/project fingerprint, expected result, actual result/exit, output excerpt. Redact secrets before every write.

### B. Create the disposable source repository

9. Clone/export the exact production Kanmer source at `SOURCE_SHA` into `$FIXTURE_DIR/source`; exclude all production remotes/board worktrees and untracked files.
10. Confirm `git rev-parse HEAD == SOURCE_SHA` and `git status --porcelain` is empty.
11. Remove the production `origin` association from the fixture clone before creating the disposable remote; retain the source SHA in the log.
12. Use `gh repo create <owner>/$FIXTURE_REPO --private --source . --remote origin --push` under authorized control.
13. Read back remote URL/repository visibility/default branch and confirm it points only to the disposable repo.
14. Confirm the copied `.github/workflows/pr.yml`, `scripts/verify.mjs`, `packages/core/src/merge-gate.ts`, and `packages/mcp-server/src/check-pr.mjs` exist at the expected source SHA.
15. Create/push `kanmer-board` from an orphan or clean board-state commit as required by the shipped setup flow; do not copy the production board.
16. Create the board worktree at `source/.worktrees/kanmer` on `kanmer-board`; confirm actual branch and clean status.
17. Start the built/installed Kanmer MCP server under test against this board root and source repo. Capture `get_status` server identity, project fingerprint, board source, board-worktree health, tool count, and compatibility fields.
18. Confirm the project fingerprint belongs to the disposable roots and differs from the production project fingerprint. Do not continue if roots point to production.

### C. Seed deterministic board fixtures through Kanmer

19. Initialize/adopt the disposable board only through normal setup/create tools.
20. Create an area such as `int` if required by format 3, with no changes to standard six stages/profiles.
21. Create INT-001 as a ticket with `profile: spike`, status Backlog/Preparing as appropriate, body identifying research as deliverable, and at least one research document.
22. Create INT-002 as `profile: feature`, with no required preparation docs initially and one unchecked question in `open-questions.md`.
23. Create INT-003 as a ticket whose profile requirements are fully met, then take it as a deliberately distinct MCP actor/assignee and record `.worktrees/int-003` (never board path).
24. Create INT-004 as the happy-path ticket with the smallest resolved profile permitted by the gate design while still exercising plan/checklist/PR/review/proof. If `chore` requires plan only, add a checklist as optional execution control without making packet readiness depend on it.
25. Write INT-004’s exact plan/checklist/files/open-questions with no unresolved questions. Scope is only two fixture files in the disposable source copy:
   - `scripts/spine-fixture.mjs`
   - `scripts/spine-fixture.test.mjs`.
26. Add one dependency ticket/edge such that INT-004 is initially blocked for the phase-2 dependency test; prepare a normal path to mark the blocker Done before final merge.
27. Re-read all four tickets, their gate reports, groups/links, and the disposable project identity. Save IDs/timestamps/content versions to the log.
28. Snapshot the board file list/hashes before read-only packet calls.

### D. Prove packet refusal order and no-write behavior

29. Call `get_execution_packet(INT-001)` and assert:
   - `ready:false`
   - `code:GATE_BLOCKED`
   - reason identifies spike/research deliverable
   - no implementation docs/worktree/take are created.
30. Compare board snapshot; record zero write/activity change caused by the read.
31. Call `get_execution_packet(INT-002)` and assert missing preparation requirements refusal occurs before question refusal; `missing` excludes `questions-resolved`.
32. Add exactly the required research/files/plan/checklist documents for INT-002 through normal writes, leaving the unchecked question.
33. Call the packet again and assert dedicated unresolved-question refusal with `missing:["questions-resolved"]`.
34. Call `get_execution_packet(INT-003)` as a different actor and assert occupancy refusal with `missing:[]` and owner/worktree context.
35. Call the same packet as the owning actor and assert the occupancy condition no longer refuses, proving same-actor resume semantics.
36. Release/leave INT-003 in a documented fixture state; it does not join the happy path.
37. Call `get_execution_packet(INT-004)` before resolving its deliberate dependency. Record whether packet itself remains ready—the dependency is later merge-gate physics, not a packet refusal—without inventing another refusal class.
38. Assert INT-004 ready response includes exact project fingerprint, ticket/group/docs/content versions, full gates, stop condition, commands hint, and extra-doc listing.
39. Compare board snapshots after each read and prove packet calls are non-mutating.

### E. Execute INT-004 through the shipped weak-agent path

40. Invoke/follow the shipped `kanmer-execute` skill using the ready packet. Its first ticket-data call must be the packet already recorded or freshly re-read.
41. Sniff `get_status.compat.expectedProject`; pass the disposable fingerprint on every write only when advertised.
42. Create branch `int-004-spine-fixture` (or ID-prefixed equivalent accepted by the gate) from current disposable `origin/main`.
43. Create `source/.worktrees/int-004` and assert it is not/does not resolve to `.worktrees/kanmer`.
44. Take INT-004 with exact actor, branch, and worktree metadata; record successful guard and board health.
45. Implement only the two planned fixture files:
   - an exported deterministic built-in-only function in `scripts/spine-fixture.mjs`;
   - a Node `node:test` file under `scripts/*.test.mjs` that proves positive and negative behavior.
46. Run the focused fixture test, `npm run test:scripts`, and `npm run verify` in the implementation worktree. Record every attempt/exit; do not discard failures.
47. Update checklist/report through version-aware Kanmer writes and name the real production caller: root `test:scripts` glob invoked by `npm test`/`npm run verify` in the disposable repo.
48. Commit the exact two-file diff. Record full commit SHA and confirm it is reachable from the branch.
49. Push branch and open a PR to disposable `main` **without** a `Kanmer:` footer for the first gate test. Do not use a branch prefix that accidentally resolves a different ticket unless the shipped branch fallback itself is an intended test; if branch ID prefix would resolve, use a neutral first branch and rename/recreate for the final path, recording both.
50. Move INT-004 to Review only when its real preparation/report gates permit, while deliberately controlling wrong-stage timing for phase-2 test below.

### F. Exercise real Actions and every shipped merge-gate outcome

51. Wait for the PR workflow to post. Record current head SHA, workflow run IDs, displayed check names, and `verify` result.
52. Confirm `verify` runs the real copied Kanmer rail on Windows and passes the current head.
53. Record first `kanmer-gate` result with no resolvable ticket as `NO_TICKET` failure. Preserve annotations/stdout/stderr and exit code.
54. Amend PR body to include exact footer `Kanmer: INT-004`; synchronize/re-run without changing source if possible.
55. Deliberately put INT-004 in a stage other than Review when the phase-2 job runs; assert emitted `WRONG_STAGE` at the shipped fail/warn severity, then return through normal `move_item` to Review.
56. Ensure the deliberate blocking dependency remains open; rerun and assert `DEPENDENCY_BLOCKED` using derived `blockedBy`, then complete the blocker through its normal proof/Done path or remove only the deliberate fixture edge if that exact cleanup was approved in its plan.
57. Add one unchecked non-parked question to INT-004. Rerun/synchronize and assert phase-1 open-question gate failure; verify no merge is possible.
58. Resolve the question by recording an answer and checking it, not by deleting it; rerun and assert that failure clears.
59. With no review attestation, assert `NO_REVIEW_RECORD` at the exact shipped advisory/fail severity.
60. Write an attestation against a deliberately previous/different head or advance the source head after attesting; assert `STALE_REVIEW` with exact severity. Do not merge.
61. Record a deliberately unreachable SHA in INT-004 `commits[]` using a fixture-only commit object not reachable from PR base, if the shipped tool permits safe metadata update. Assert `COMMITS_UNREACHABLE` at exact warn/fail rollout.
62. Replace/remove the fixture unreachable entry through normal ticket update and record the real reachable implementation SHA. Never leave fabricated production metadata in the final ticket.
63. Gather the real current diff, `headRefOid`, plan content version, ticket updated timestamp, reviews/comments/thread state, and checks using the shipped review skill.
64. Write `scratch/review.md` by whole-file versioned replacement with exact current head, verdict, reviewer/independence, plan hash, and every gate/review finding disposition—including the deliberately fired conditions as fixed/obsolete after change where appropriate.
65. Re-query head/checks/conversations immediately before final merge. If head changed, replace/re-run review.
66. Create one unresolved GitHub review conversation on a harmless line after required checks are otherwise green; confirm branch protection refuses merge. Resolve the conversation normally and confirm that blocker clears.
67. Confirm final required `verify` and `kanmer-gate` checks are green on the same current head and no open dependency/question/finding remains.
68. Attempt merge only through the normal protected PR path with no admin bypass, force, rule disablement, or required-check removal.
69. Record merge result, PR URL, full `mergeCommit.oid`, check rollup, conversation state, and protection evidence.
70. Move INT-004 exactly one stage to Verifying after successful merge.

### G. Exact-SHA verification and proof

71. Run `git fetch origin` in the disposable source root; do not pull/reset/checkout main.
72. Create detached worktree at `source/.worktrees/verify-int-004-<full-merge-sha>` (or collision-safe shortened path while targeting/storing full SHA).
73. Assert inside it:
   - `git rev-parse HEAD` equals `mergeCommit.oid` exactly;
   - `git symbolic-ref -q HEAD` reports detached;
   - worktree is clean;
   - production/main checkout branch and board worktree branch remain unchanged.
74. Run focused fixture test, `npm run test:scripts`, and full `npm run verify` from the detached worktree. Record chronological attempts, cwd, environment, exit codes, and outputs.
75. If any check fails/inconclusive, write/update INT-004 proof with the actual non-PASS result, leave it Verifying, file remediation, and stop the happy path. Do not exploit proof existence.
76. On all required checks PASS, write INT-004 `proof/proof.md` by whole-file versioned replacement with full merged SHA and all attempts, retaining any earlier failures.
77. Re-read proof and parse/compare full SHA, result PASS, attempts, and content version.
78. Move INT-004 to Done through normal gates. Record final item/gate report and reachable commit metadata.
79. Remove the clean detached verification worktree and implementation worktree using normal Git worktree cleanup; retain failure evidence if cleanup cannot complete.

### H. CORE-035 final proof

80. Complete `proof/compiled-workflow-integration.md` on CORE-035 with:
   - source/build/project identities;
   - disposable remote/rule IDs;
   - four packet cases;
   - every gate code, severity, expected/actual result, run/head;
   - protected merge refusal and success;
   - exact merge SHA verification;
   - INT-004 final status/proof;
   - no-override statement;
   - cleanup record.
81. Include a result matrix where every shipped gate/refusal appears exactly once or more and is marked observed; do not mark warnings as failures.
82. Write CORE-035 `proof/proof.md` with result PASS only if all mandatory matrix rows and cleanup pass. The `merged_sha` field should identify the production Kanmer integration source SHA governing this verification; the disposable merge SHA belongs prominently in environment/body/attempts. If canonical schema requires one tested SHA, use the disposable exact merge SHA and state production source SHA separately.
83. Read both proof files back with versions and ensure no secret/raw token/private credential exists.
84. Remove/clear scratch running notes only if the final proof fully supersedes them; do not erase failed attempts.

### I. Cleanup and final audit

85. Capture final branch protection/rules before deletion and confirm they were never weakened.
86. Delete the disposable GitHub repository through the authorized account. If protection prevents deletion, follow GitHub’s repository deletion process—not a branch-rule bypass—and record the action.
87. Remove the entire local fixture directory and confirm source/board/implementation/verify paths no longer exist.
88. Confirm no global Git config, credential file, environment secret, production remote, production rule, production board ticket, or product source file changed.
89. Record `gh repo view`/API not-found result and local path-absence checks in cleanup section.
90. Re-read CORE-035 gate report. Move CORE-035 to Done only after PASS proof and resolved questions; no source PR is required for a verification-only chore unless repository policy explicitly requires one. Record the outcome in the ticket body.
91. If any required condition could not be observed, set final result INCONCLUSIVE/FAIL, leave ticket Verifying, and file a specifically scoped remediation/re-run ticket.

## Expected permanent changes

- CORE-035 research/files/plan/checklist/open-questions/proof and outcome metadata on the Kanmer board.
- No permanent product-source file, workflow, dependency, repository rule, or external fixture.

## Acceptance checks

- The fixture is seeded from the exact Kanmer source SHA under test and uses real production callers.
- Spike, missing-doc, unresolved-question, and other-actor packet refusals are observed in order with no read-side writes.
- Every shipped CORE-024/025 gate outcome fires with its actual warn/fail severity.
- Missing-ticket/open-question/required-check/conversation states physically prevent merge as applicable.
- Final merge uses protection with no override and all required checks green on the current reviewed head.
- Verification runs only the detached exact `mergeCommit.oid`; no mutable main checkout is changed.
- INT-004 reaches Done only on PASS proof retaining all attempts.
- Complete log/proof is secret-free; disposable remote/local state is deleted.

## Commands

Commands are recorded exactly during execution. Key command families:

```bash
git rev-parse HEAD
gh repo create ... --private --source . --remote origin --push
gh pr view ... --json headRefOid,statusCheckRollup,state,mergeCommit
gh pr checks ...
git fetch origin
git worktree add --detach .worktrees/verify-int-004-<sha> <sha>
npm run verify
git worktree list --porcelain
gh repo delete ... --yes
```

MCP calls use the disposable `expected_project` capability/fingerprint and are logged with inputs/results, never credentials.

## Risks and deviation rules

- **Wrong repository/board:** stop on any production path/fingerprint/remote match.
- **Insufficient GitHub permission:** stop INCONCLUSIVE; no local mock or production substitution.
- **Gate severity mismatch:** report actual shipped behavior; do not rewrite expected output or weaken rules.
- **Flaky/failed verify:** retain attempt, stop/remediate; no rerun-only clean narrative.
- **Source defect:** separate fix ticket; CORE-035 does not absorb product changes.
- **Cleanup failure:** final PASS is blocked until external/local fixture state is removed or an operator explicitly accepts/documented risk under canonical proof semantics.
- Never force-push, bypass, disable checks, merge own stale review, alter production rules, use `.worktrees/kanmer` for implementation, or start another ticket.

## Stop condition

Stop when every required packet/gate/protection path is retained in the command log, the happy path reaches protected merge and exact-SHA PASS/Done with no override, CORE-035 proof is read back and secret-free, the disposable remote/local fixture is confirmed deleted, and the ticket is ready for independent review/completion. Do not add a harness or begin another ticket.
