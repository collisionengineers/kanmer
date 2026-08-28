---
kind: review-attestation
pr: "302"
head_sha: "26306355aaf2fb374dbfb2e63e82dd344724654a"
board_sha: "94ee49ec40a2693d80872489d0dd446e13cd5338"
verdict: pass
reviewer: "independent-review-agent (claude-opus-5, distinct role from implementer claude-code)"
independent: true
plan_hash: "b6050e0897324ca4"
ticket_updated: "2026-08-28T06:16:37.597Z"
expected_reviewers: []
threads_snapshot:
  - thread: "PRRT_kwDOT2PEds6dElIH"
    finding: "F-001"
    resolved: true
  - thread: "PRRT_kwDOT2PEds6dElIM"
    finding: "F-002"
    resolved: true
  - thread: "PRRT_kwDOT2PEds6dElIR"
    finding: "F-003"
    resolved: true
  - thread: "PRRT_kwDOT2PEds6dElIK"
    finding: "F-004"
    resolved: true
  - thread: "PRRT_kwDOT2PEds6dElIY"
    finding: "F-005"
    resolved: true
  - thread: "PRRT_kwDOT2PEds6dElIZ"
    finding: "F-006"
    resolved: true
  - thread: "PRRT_kwDOT2PEds6dElIO"
    finding: "F-007"
    resolved: true
  - thread: "PRRT_kwDOT2PEds6dElIU"
    finding: "F-008"
    resolved: true
  - thread: "PRRT_kwDOT2PEds6dElIa"
    finding: "F-009"
    resolved: true
  - thread: "PRRT_kwDOT2PEds6dElIe"
    finding: "F-010"
    resolved: true
  - thread: "PRRT_kwDOT2PEds6dE-Ty"
    finding: "F-019"
    resolved: true
  - thread: "PRRT_kwDOT2PEds6dE-T1"
    finding: "F-020"
    resolved: true
  - thread: "PRRT_kwDOT2PEds6dE-T3"
    finding: "F-021"
    resolved: true
  - thread: "PRRT_kwDOT2PEds6dE-T6"
    finding: "F-022"
    resolved: true
  - thread: "PRRT_kwDOT2PEds6dE-T-"
    finding: "F-023"
    resolved: true
findings:
  - id: F-001
    severity: blocker
    summary: "Four of the five advertised scopes had no roster-resolution procedure; section 1 step 1 resolved only the host group, contradicting the same PR's statement that host membership is not the roster. Blocked FRD-034 Behaviour and AC1."
    disposition: fixed
  - id: F-002
    severity: major
    summary: "The controller's only branch operation hardcoded `git rebase origin/main`, contradicting the preflight's never-hardcode-`main` rule and leaving `delivery_target` unused."
    disposition: fixed
  - id: F-003
    severity: major
    summary: "The one automatic replan was authorised on the controller's own classification of a plan defect with no budget precondition; at the default `remediation_budget: 1` that window coincided exactly with the exhausted state CORE-121's gate exists to stop."
    disposition: fixed
  - id: F-004
    severity: minor
    summary: "Sync-before-gate commands compared literal `kanmer-board` refs though the board branch is the configurable `KANMER_BOARD_BRANCH`."
    disposition: fixed
  - id: F-005
    severity: minor
    summary: "No numeric verification budget: `transient` routes to a rerun with no maximum attempt count. FRD-034 AC5 names review and verification budgets."
    disposition: accepted-risk
    reason: "Deliberately untouched this round. Bounded by two shipped rules rather than a counter: section 9's \"Never automatically retry failed ... verification commands\" means the controller parks rather than loops, and the active-Verifying invariant forbids reporting `completed` while a ticket sits unexplained in Verifying. A numeric budget would need a store field in packages/, correctly excluded here. Residual risk for CORE-119."
  - id: F-006
    severity: minor
    summary: "Templates gained four fields but stayed `schema: 1`, so a legacy record would resume without a frozen selector, authority or delivery target."
    disposition: fixed
  - id: F-007
    severity: minor
    summary: "The active-Review invariant had no exemption for the supported \"up to review\" target point, whose stop condition is a ticket parked in Review."
    disposition: fixed
  - id: F-008
    severity: minor
    summary: "Two controllers starting concurrently against one host group can overwrite each other's `automation/current.md`; `set_group_doc` has no expected-version or exclusive-create option."
    disposition: accepted-risk
    reason: "Deliberately untouched this round. Closing the race needs a packages/core change this ticket excludes and the CORE-131 lane is editing. Mitigations remain: a different controller owning a `running` record is a stop predicate, plus write-then-read-back and the disjoint-scope-and-workspace precondition. Residual risk for CORE-119."
  - id: F-009
    severity: minor
    summary: "The preflight identity check was unsatisfiable for a brand-new run, which has no run record to compare its fingerprint against."
    disposition: fixed
  - id: F-010
    severity: minor
    summary: "The evidence-hygiene rule forbidding tickets for minor findings collided with kanmer-review's `deferred-to-ticket` disposition, leaving an out-of-scope minor with no legal disposition."
    disposition: fixed
  - id: F-011
    severity: minor
    summary: "The two forbidden-claim regexes were narrower than their names and missed realistic paraphrases such as \"The controller performs the merge itself\" and \"A budget-exhausted lane may self-replan\"."
    disposition: fixed
  - id: F-012
    severity: note
    summary: "Check 19's `/REMEDIATION_BUDGET_EXHAUSTED/` sub-assertion is satisfied by a pre-existing occurrence at SKILL.md:205, so that one sub-assertion is non-additive."
    disposition: accepted-risk
    reason: "Deliberately untouched. The check's other sub-assertions all fail correctly on deletion, so the check as a whole is non-vacuous and does pin the escalation boundary."
  - id: F-013
    severity: note
    summary: "\"Record all three in the ledger\" (implementation, reviewer, verifier identities) has no dedicated ledger columns; the three are recoverable only from the Event log."
    disposition: accepted-risk
    reason: "Deliberately untouched. AC2's proof obligation is discharged by the attestation itself (`reviewer`, `independent`, `head_sha`) cross-checked against `expected_reviewers`. The ledger is a convenience record, not the AC2 artefact."
  - id: F-014
    severity: note
    summary: "FRD-034 Behaviour names a recorded \"retry budget\"; the run-state template has no such field."
    disposition: accepted-risk
    reason: "Deliberately untouched. The budget is `remediation_budget` on the ticket, the store-authoritative location CORE-121 owns, read live before dispatch. A snapshot would be a second staleable copy of a store-owned counter."
  - id: F-015
    severity: note
    summary: "Deviation: `npm run verify` was not run locally in either round, because a linked worktree has no node_modules."
    disposition: accepted-risk
    reason: "Acceptable. The delta touches no packages/ code (0 paths under packages/), so the full rail's compiled surfaces are unreachable by it. The hosted `verify` job is green at this exact head (run 33147236831, 4m55s). I re-ran both focused rails myself at this head: verify-skill-prose exit 0 with 31 check-19 assertions, verify-agents-block 31/31, and the fixture file 28/28."
  - id: F-016
    severity: note
    summary: "F-003's fix closes the controller-side route, but the `operator:` reason prefix that reopens a spent budget remains a string convention rather than an authenticated claim."
    disposition: accepted-risk
    reason: "Pre-existing CORE-121 design, shipped and merged, and outside this ticket's packages/ boundary. Recorded so the F-003 fix is not read as a stronger guarantee than it is: it binds a controller that follows the contract, and check 19 pins the contract."
  - id: F-017
    severity: note
    summary: "Because the precondition is `review_round` < `remediation_budget`, at the default budget of 1 the automatic replan is never available at a delta review. The feature is inert on default settings and activates only where an operator has raised the budget."
    disposition: accepted-risk
    reason: "The correct conservative outcome, matching the open-questions record's adopted default, but recorded so a later reader does not assume the replan paragraph is live by default."
  - id: F-018
    severity: note
    summary: "My own round-1 attestation used finding ids `F1`..`F15`, which the merge gate rejected as invalid (`findings[0].id must be an F-### identifier`, a STALE_REVIEW warning), so it was not counted as a valid attestation."
    disposition: fixed
    reason: "Corrected here: ids are `F-001`..`F-023` per `packages/core/src/review-attestation.ts`, and `board_sha` is recorded so SYNC_REQUIRED evaluates as `current` by ancestry rather than `unrecorded`."
  - id: F-019
    severity: minor
    summary: "New: the rebase clause uses the run's single recorded `delivery_target`, but `deliveryTargets(policy, item)` (origin/main `packages/core/src/board.ts:260`) resolves per ticket and is hotfix-aware, so one run-wide value cannot represent a run mixing an ordinary ticket with a recorded hotfix."
    disposition: accepted-risk
    reason: "Verified the signature on origin/main: the function takes `item.delivery_branch` and returns hotfix/baseBranch/prTarget/verificationTarget. Real but narrow — it diverges only on a project whose releaseBranch differs from its integrationBranch AND a hotfix ticket in the same run; board.ts documents main-only as the default and common case, where the two are identical. Strictly better than the hardcoded `main` it replaced, and the preflight already names each ticket's own execution packet as a target source. Residual risk for CORE-119."
  - id: F-020
    severity: minor
    summary: "New: the replan still moves `review` -> `preparing` directly, which `backwardMoveEffects` does not attestation-guard; the reviewer suggests taking the guarded `review` -> `implementing` return first and walking back one stage at a time."
    disposition: rejected-with-reason
    reason: "The observation is factually right and is already recorded as residual (F-016, F-017), but the proposed remedy would be wrong: routing a plan defect through `review -> implementing` increments `review_round` and consumes a remediation round, contradicting the deliberate design that a replan \"does not raise `remediation_budget`\" and is a distinct route from remediation. The meaningful control is the budget precondition added this round, which is pinned by check 19 and which I proved fails on deletion. Backward moves are also not subject to the one-forward-gated-boundary rule, so no gate is skipped."
  - id: F-021
    severity: minor
    summary: "New: `git rev-parse origin/<board-branch>` reads the local remote-tracking ref, which is only as fresh as the last fetch, so the sync comparison does not consult the actual remote."
    disposition: accepted-risk
    reason: "Analysed rather than accepted: the omission fails safe. A remote-tracking ref can only name commits that were on the remote, so local == tracking still proves the local board tip is on the remote. A remote that has advanced makes the comparison fail spuriously (a false alarm, the safe direction), never falsely certify. The unsafe direction — local commits not pushed — is always caught, because an unpushed tip can never equal the tracking ref. Adding an explicit fetch would still be a cheap improvement and is recorded for CORE-119, but it is not a correctness hole."
  - id: F-022
    severity: minor
    summary: "New: for area, list, board and ticket scopes, roster members may belong to groups other than the run host, but step 2 reads only the host group's context, so binding epic/horizon decisions on a member's own group go unread."
    disposition: accepted-risk
    reason: "A real incompleteness in newly added functionality rather than a regression: before this change the only scope was one group, where host and member group coincide. FRD-034 does not name group contexts among its criteria, so no acceptance criterion is unmet. Recorded as residual risk for CORE-119, where a multi-group golden-board roster would exercise it."
  - id: F-023
    severity: major
    summary: "New: section 1 step 2's \"Drop archived or blocked tickets\" drops a dependent whose blocker is inside the same roster, because `blockedSet()` hands the whole board to `computeBlockedIds`, which marks a target blocked whenever any live item that blocks it is not at the last stage. The freeze then prevents it rejoining, so section 2's `blocks`-edge ordering rule is unreachable for an in-roster pair."
    disposition: deferred-to-ticket
    ticket: "SKILL-038"
    reason: "Verified in source (`packages/mcp-server/src/index.ts:412`, `packages/core/src/links.ts:61-73`). Pre-existing — both sentences predate this PR and neither is in the diff — but materially amplified by the new area/list/board scopes. Deferred rather than fixed in place because the remediation budget is spent and merging does not make the shipped state worse than main today."
---

# Review attestation — SKILL-036 (PR #302), delta review

Independent delta review at head `26306355aaf2fb374dbfb2e63e82dd344724654a`,
scoped to the diff since `aa5f73da` plus confirmation that every finding I
raised is actually fixed. Previous attestation: `needs-changes` at `aa5f73da`.

**Verdict: `pass`.** All three blocking/major findings from round 1 are fixed,
all five swept minors are fixed, and F-011 was fixed although it had been
accepted as residual risk. Five new findings arrived from the automated reviewer
on this head: four minor (dispositioned) and one major that is **pre-existing
and not introduced by this change**, filed as **SKILL-038** and dispositioned
`deferred-to-ticket`. No blocker.

## The delta

One commit, fast-forward `aa5f73da..26306355`, five files, 421 insertions /
34 deletions. **Zero paths under `packages/`.** No renumbering
(`git diff | grep '^[+-]## '` is empty), `EXPECTED_SKILLS` still 12.

## Every round-1 finding

| Id | Sev | Status | Evidence I checked myself |
|---|---|---|---|
| F-001 | blocker | **fixed** | Section 1 step 1 now carries five per-scope resolution steps — ticket `get_item`, group `list_items group:`, area `list_items area:` in `list_board` order, list `get_item` per named id with an unknown/archived id a stop *before* the freeze, board `list_items` unfiltered — plus "the result is one ordered list frozen into `## Selection contract` … and steps 2–6 below apply to it identically". Step 2 now reads "the **run host group's** shared context", removing the contradiction. I verified the tool calls are real, not plausible: `list_items` genuinely filters by `area` (`smoke.mjs:1133`) and runs unfiltered. |
| F-002 | major | **fixed** | Rebase is onto `origin/<delivery_target>` with absolute `git -C` paths, and the check asserts the positive form **and** `!/rebase origin\/main/`. (Refined by new finding F-019.) |
| F-003 | major | **fixed** | See the dedicated section below. |
| F-004 | minor | **fixed** | `<board-branch>` resolves from `get_status.boardWorktree.expectedBranch`. I verified that field exists and means what the prose says: `packages/mcp-server/src/index.ts:602` is `process.env.KANMER_BOARD_BRANCH?.trim() \|\| "kanmer-board"`, exposed under `boardWorktree` at :667 — including the documented fallback. |
| F-006 | minor | **fixed** | Both templates stamped `schema: 2`, plus a refuse-to-resume rule for schema 1, unknown or absent. I verified no `packages/` code reads the run-record `schema` field, so stamping 2 cannot break a server path. |
| F-007 | minor | **fixed** | Explicit "up to review" exemption; "Every other target still requires one." |
| F-009 | minor | **fixed** | Identity split into resumed and new. |
| F-010 | minor | **fixed** | `deferred-to-ticket` carved out — which is exactly the disposition this review needed for F-023. |
| F-011 | minor | **fixed** | Both forbidden claims became four-rule lists; 13/13 paraphrases now caught. |
| F-005, F-008, F-012, F-013, F-014, F-015 | minor/note | **untouched by design** | Confirmed absent from the delta; still `accepted-risk`. Not re-opened. |

## F-003: is the window actually closed, or only re-narrated?

Closed. The precondition is checked **first, from the live item**, and is
explicitly not satisfiable by classification. I re-traced the arithmetic against
`store.ts` rather than accepting the prose:

- `remediation_budget` defaults to 1 and `review_round` to 0.
- Review 1 blocks; the sanctioned return runs `review -> implementing` and
  `backwardMoveEffects` returns `review_round: round + 1` — so it is 1.
- At the delta review, `review_round (1) >= remediation_budget (1)`, so the new
  precondition denies the replan in exactly the window the old text permitted.
- The replan cannot manufacture headroom: `backwardMoveEffects` returns a bare
  `{reason}` for every pair except `review -> implementing`, so
  `review -> preparing` neither resets nor increments `review_round`. The skill
  now states this and it is true.
- The replan is still separately capped at one per ticket.

F-016, F-017 and F-020 record the honest caveats.

## Mutation battery on the new assertions

Same standard as round 1; I did not rely on the fixtures. All against fresh
copies of the real skills tree:

- **A — deletion: 20 mutations, 0 vacuous.** Every new clause fails its *named*
  check when deleted, including both `schema: 2` stamps, all five per-scope
  steps, the budget precondition, `expectedBranch`, and the up-to-review
  exemption.
- **B — anti-absorption: 5/5.** Deleting each scope's step fails **only** that
  scope's check while its four siblings still pass. This is the property that
  matters for F-001: check 19 now pins the *capability* per scope, not the
  sentence advertising all five. The implementer's claim that each fixture also
  asserts a sibling still passes is true — `scopeMutations` drives both
  `expectFail` and `expectPass`.
- **C — negative assertions: 2/2.** Re-introducing `rebase origin/main` or
  `rev-parse origin/kanmer-board` is rejected by name.
- **D — forbidden-claim paraphrases: 13/13 caught**, including all five that
  escaped round 1.

Rails at this head, run by me: `verify-skill-prose.mjs` exit 0, `ALL CHECKS
PASSED`, 98 checks with **31** in block 19; `verify-agents-block.mjs` 31/31;
`node --test scripts/verify-skill-prose.test.mjs` **28/28**.

## The five new findings

F-019, F-021 and F-022 are minor and dispositioned `accepted-risk` with reasons
above; F-020 is `rejected-with-reason` because its proposed remedy would consume
a remediation round for a plan defect and so contradict the design F-003 asked
for.

**F-023 is major and is the one I filed.** Section 1 step 2 drops "blocked"
tickets, but `computeBlockedIds` marks a dependent blocked whenever any live
blocker exists anywhere on the board — including one inside the same roster. So
a roster containing both a blocker and its dependent silently loses the
dependent before the freeze, and section 2's `blocks`-edge ordering rule can
never fire. I verified this in source rather than accepting the claim. It is
**pre-existing** (neither sentence is in this diff) though materially amplified
by the new area/list/board scopes, so it does not make the merged state worse
than `main` today. Filed as **SKILL-038** and dispositioned `deferred-to-ticket`
because the remediation budget is spent.

## FRD-034 at this head

The two criteria unmet or partial in round 1 are now met:

- **Behaviour "accepts one ticket, group, area, explicit ticket list or a
  prepared board"** and **AC1** — met. Each scope has an executable resolution
  step using a tool call I verified exists, one freeze rule, one readiness rule.
  (F-023 qualifies AC1 for rosters with internal dependency chains; deferred.)
- **Behaviour "the configured target's exact merged SHA"** — met. The delivery
  target is used at the controller's only branch operation, not merely recorded.
- **AC5** — met. The replan is bounded by the budget as well as by its own
  one-per-ticket cap, and minor/note preservation no longer collides with
  `deferred-to-ticket`.

AC2, AC3, AC4 and both edge cases were met at round 1 and are untouched.

## CI

`verify` **SUCCESS** (4m55s) at `26306355`, run 33147236831.

`kanmer-gate` failed in that run, and the failure is fully explained and not a
regression: its single error was `WRONG_STAGE` — "SKILL-036 is in stage
`implementing`; expected `review`" — evaluated against `boardSha 9ec55d06`, a
board tip predating the `b09f1eb7` push that returned the ticket to Review. That
is precisely the stale-board artefact this PR documents. The board is now
current at `94ee49ec` with `status: review`. The gate does not re-run on a board
push, so it needs an explicit re-run once this attestation is pushed.

That run also warned `STALE_REVIEW: findings[0].id must be an F-### identifier`
— a defect in my own round-1 attestation, fixed here (F-018).

## Residual risk carried forward

F-005, F-008, F-012, F-013, F-014, F-015, F-016, F-017, F-019, F-021, F-022 —
all `accepted-risk` with reasons, none filed, per HZN-008 scope discipline.
F-020 is `rejected-with-reason`. F-023 is `deferred-to-ticket` as SKILL-038.
The most relevant to CORE-119 remain F-005 (no numeric verification budget),
F-008 (the `current.md` pointer race) and F-023 (in-roster dependency ordering).
