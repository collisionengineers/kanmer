---
kind: review-attestation
pr: "302"
head_sha: "aa5f73daa03d94c609ce8d45646ab52fd0f54b0b"
verdict: needs-changes
reviewer: "independent-review-agent (claude-opus-5, distinct role from implementer claude-code)"
independent: true
plan_hash: "b6050e0897324ca4"
ticket_updated: "2026-08-28T05:39:17.064Z"
expected_reviewers: []
threads_snapshot:
  - thread: "PRRT_kwDOT2PEds6dElIH"
    finding: "F1"
    resolved: false
  - thread: "PRRT_kwDOT2PEds6dElIK"
    finding: "F4"
    resolved: false
  - thread: "PRRT_kwDOT2PEds6dElIM"
    finding: "F2"
    resolved: false
  - thread: "PRRT_kwDOT2PEds6dElIO"
    finding: "F7"
    resolved: false
  - thread: "PRRT_kwDOT2PEds6dElIR"
    finding: "F3"
    resolved: false
  - thread: "PRRT_kwDOT2PEds6dElIU"
    finding: "F8"
    resolved: false
  - thread: "PRRT_kwDOT2PEds6dElIY"
    finding: "F5"
    resolved: false
  - thread: "PRRT_kwDOT2PEds6dElIZ"
    finding: "F6"
    resolved: false
  - thread: "PRRT_kwDOT2PEds6dElIa"
    finding: "F9"
    resolved: false
  - thread: "PRRT_kwDOT2PEds6dElIe"
    finding: "F10"
    resolved: false
findings:
  - id: F1
    severity: blocker
    summary: "Four of the five newly advertised scopes have no roster-resolution procedure. Section 1 step 1 still resolves the roster with `list_items group: \"<explicit group>\"` and the host group's order, while the new orientation states the host group's membership is not the roster. A ticket-, area-, list- or board-scoped run therefore cannot freeze the roster it was asked for. Blocks FRD-034 Behaviour (\"accepts one ticket, group, area, explicit ticket list or a prepared board\") and AC1."
    disposition: open
  - id: F2
    severity: major
    summary: "The controller's only branch operation still hardcodes main: `After anything merges to `main`, lanes still in flight rebase ... (git fetch origin && git rebase origin/main)` at SKILL.md:192-193. This directly contradicts the preflight clause added by this same PR (\"A controller never hardcodes `main`\") and leaves the newly recorded `delivery_target` unused where it matters, making CORE-116's deliveryTargets decorative in the controller."
    disposition: open
  - id: F3
    severity: major
    summary: "The one automatic replan is authorised on the controller's own classification of a blocking delta-review finding as a \"plan defect\", with no precondition on the remediation budget. At the default `remediation_budget: 1` the delta review occurs when `review_round` already equals the budget, so the replan window coincides exactly with the exhausted state that CORE-121's gate exists to stop. `review -> preparing` is store-legal on a bare reason (backwardMoveEffects returns `{reason}` for every pair except review->implementing), so a self-classified plan defect is a store-legal route around the operator gate. The shipped text also omits the precondition its own open-questions record adopted as the conservative default (\"available before the remediation budget is spent\")."
    disposition: open
  - id: F4
    severity: minor
    summary: "The sync-before-gate commands compare literal `kanmer-board` refs, but the board branch is the configurable repository variable `KANMER_BOARD_BRANCH` (used as `$KANMER_BOARD_BRANCH` by the PR workflow itself). Same defect class as the never-hardcode-`main` rule this PR introduces."
    disposition: open
  - id: F5
    severity: minor
    summary: "No numeric verification budget exists: kanmer-verify routes `transient` to \"stays in Verifying, rerun the failed check\" with no maximum attempt count, and \"a non-PASS result is retryable by default\". FRD-034 AC5 names review AND verification budgets."
    disposition: accepted-risk
    reason: "Bounded in practice by two shipped rules rather than a counter: kanmer-auto section 9 states \"Never automatically retry failed ... verification commands\", so the controller parks rather than loops, and this PR's new active-Verifying invariant forbids reporting `completed` while a ticket sits in an unexplained Verifying state. Repeated unchanged audits are therefore stopped. A numeric budget would need a store field (packages/), which this ticket correctly excludes. Recorded as residual risk for CORE-119."
  - id: F6
    severity: minor
    summary: "run-state-template.md gains `scope`, `scope_selector`, `authority` and `delivery_target` but remains `schema: 1`, so a legacy schema-1 record passes startup schema validation and resumes without a frozen selector, recorded authority or delivery target."
    disposition: open
  - id: F7
    severity: minor
    summary: "The active-Review invariant unconditionally requires an active or immediately queued reviewer, with no exemption for the supported \"up to review\" target point, whose stop condition is precisely a ticket parked in Review with its PR open."
    disposition: open
  - id: F8
    severity: minor
    summary: "Two controllers starting concurrently against one host group can both observe no active `automation/current.md` and overwrite each other's pointer: `set_group_doc` performs an unconditional replacement with no expected-version or exclusive-create option. This PR widens exposure by newly permitting several concurrent controllers."
    disposition: accepted-risk
    reason: "Closing the race requires an expected-version or exclusive-create option on `set_group_doc` in packages/core, which this ticket explicitly excludes and the CORE-131 lane is editing now. The shipped mitigations (a different controller owning a `running` record is a stop predicate; write-then-read-back) narrow but do not eliminate the window. Recorded as residual risk; the disjoint-scope-and-workspace precondition the new prose states is the operating control."
  - id: F9
    severity: minor
    summary: "The preflight requires `get_status.project.fingerprint` to equal \"the run record's `project_fingerprint`\", but preflight runs before the roster freeze and a brand-new run has no record yet (it is created later). Read literally, a fresh run can never satisfy the check."
    disposition: open
  - id: F10
    severity: minor
    summary: "The new evidence-hygiene rule (\"a finding dispositioned minor, note or accepted-risk does not become a new ticket ... a new ticket needs a blocker or major finding\") conflicts with kanmer-review's requirement that a genuinely out-of-scope finding be dispositioned `deferred-to-ticket`, a disposition invalid without a linked ticket. An out-of-scope minor has no legal disposition under the combined instructions."
    disposition: open
  - id: F11
    severity: minor
    summary: "The two forbidden-claim regexes in check 19 are narrower than their names. `/controller (?:merges|may merge|then merges) the (?:PR|pull request)/i` misses \"The controller performs the merge itself\", \"kanmer-auto merges the pull request\" and \"The controller runs gh pr merge\"; `/budget is (?:spent|exhausted)[^.]*\\breplan\\b/i` misses \"A budget-exhausted lane may self-replan\" and \"After REMEDIATION_BUDGET_EXHAUSTED the controller replans automatically\"."
    disposition: accepted-risk
    reason: "Verified by probing both regexes against six and five realistic paraphrases respectively. They are backstops, not the primary guard: the load is carried by the positive assertions (never runs `gh pr merge`, **coordinates** the merge; it does not perform it, to get around that refusal, reason beginning `operator:`), each of which I independently proved fails on deletion. A regression would have to add a contradiction while leaving the positive clauses intact."
  - id: F12
    severity: note
    summary: "Check 19's `/REMEDIATION_BUDGET_EXHAUSTED/` sub-assertion is satisfied by a pre-existing occurrence at SKILL.md:205, so that one sub-assertion is non-additive; deleting the new escalation-boundary occurrence at :271 alone does not fail the check."
    disposition: accepted-risk
    reason: "The check's four other sub-assertions all fail correctly on deletion, so the check as a whole is non-vacuous and does pin the escalation boundary. Confirmed by a 42-mutation battery."
  - id: F13
    severity: note
    summary: "Section 7 instructs \"Record all three in the ledger\" (implementation, reviewer, verifier run identities), but the ticket ledger has a single `Worker` column and no reviewer/verifier identity columns; the three are recoverable only from the append-only Event log."
    disposition: accepted-risk
    reason: "AC2's proof obligation is discharged by the attestation itself (`reviewer`, `independent`, `head_sha`) cross-checked against `expected_reviewers`, which kanmer-review already settles. The ledger is a convenience record, not the AC2 artefact."
  - id: F14
    severity: note
    summary: "FRD-034 Behaviour says the durable run records \"project, authority, fixed initial roster and retry budget\". The run-state template now carries project, authority and the frozen roster, but no retry-budget field."
    disposition: accepted-risk
    reason: "The retry budget is `remediation_budget` on the ticket, the store-authoritative location CORE-121 owns, and is read live before dispatch (SKILL.md:204). Snapshotting it into the run record would create a second, staleable copy of a store-owned counter. The run side records consumption via the ledger's Attempt and new Replan columns."
  - id: F15
    severity: note
    summary: "Deviation: `npm run verify` was not run locally, because a linked worktree has no node_modules. Focused rails were run instead."
    disposition: accepted-risk
    reason: "Acceptable here. The diff touches no packages/ code, no bundle and no tool reference, so the full rail's compiled surfaces cannot be reached. The hosted `verify` job is green at this exact head (run 33145396862, 5m20s), which is the same rail with a build. I independently re-ran both focused rails at the head in my own detached worktree: verify-skill-prose 0, verify-agents-block 31/31. The CORE-131 lane's `npm ci`-in-worktree approach is preferable in general but not required for a prose-only diff."
---

# Review attestation — SKILL-036 (PR #302)

Independent review at head `aa5f73daa03d94c609ce8d45646ab52fd0f54b0b`. I did
not write this change and did not rely on the implementer's report for any
finding below; every claim was re-derived from the diff, the shipped prose, the
store source, and rails I ran myself.

**Verdict: `needs-changes`.** One blocker (F1) and two majors (F2, F3). The
ticket stays in Review. Not merged.

## What the change does

Eight files, 460 insertions / 26 deletions, nothing under `packages/`. It
extends `kanmer-auto` in place with FRD-034's five scopes and a frozen roster, a
preflight, wider overlap detection, a sync-before-gate rule, an escalation
boundary, active Review/Verifying invariants and evidence-hygiene rules; adds
matching clauses to `kanmer-review` and `kanmer-verify`; adds template fields;
and enforces all of it with a new check block 19 (18 assertions) plus five
fixture tests.

## Extend in place, or a thirteenth skill?

**Extend in place is the right call, and I would have made the same one.** I
verified each premise of the implementer's argument rather than accepting it:

- `kanmer-auto` genuinely already owns every durable-state mechanism FRD-034
  names — the run record and history path, the run/disposition vocabularies, the
  five-step reconciliation loop, the stop predicates, the serial fallback
  (section 6), role independence (section 7) and the four-list report (section 10).
- `verify-skill-prose.mjs` checks 13, 14, 16 and 18 do assert that prose
  verbatim, so a fork would have to either duplicate the assertions or leave the
  second orchestrator unenforced.
- Two skills with authority over one `automation/current.md` is a real defect,
  not a rhetorical one — F8 shows the single-writer case is already racy.

The roster stays at 12 (`EXPECTED_SKILLS = 12`, and the validator reports
`the roster is 12 skills`). The trigger description was correctly widened to
name `/goal` and to drop the now-false "DO NOT USE FOR a single ticket or an
ungrouped area"; at 486 characters it is well inside frontmatter limits.

The cost of extending in place is precisely F1: the *declaration* of five scopes
landed in the orientation section while the *resolution procedure* stayed in
section 1 as a group-only call, because section 1's shape did not change. That
is the "quietly left a criterion unmet because it did not fit the existing
skill's shape" failure, and it is why F1 is a blocker rather than a nit.

## FRD-034 criterion-by-criterion

| Criterion | Where it lands at this head | Met? |
|---|---|---|
| Behaviour: accepts one ticket, group, area, explicit ticket list or prepared board | Declared at SKILL.md:17-19 and in the description. **No resolution procedure exists for four of the five**: section 1 step 1 is still `list_items group: "<explicit group>"` using the host group's order, which the same PR declares is *not* the roster. | **No — F1** |
| Behaviour: durable run records project, authority, fixed roster, retry budget | `project_fingerprint`, new `authority`, frozen roster in Selection contract. Retry budget lives on the ticket as `remediation_budget`, read live. | Yes (F14 note) |
| Behaviour: new unrelated tickets and captures do not join a running roster | Roster "resolved once at run creation and never re-resolved"; captures excluded explicitly with `CAPTURE_NOT_PROMOTED`. | Yes |
| Behaviour: reconcile before dispatch and after every result | Pre-existing section 3 five-step loop, unchanged; extended with sync-before-gate and the active-stage invariants. | Yes |
| Behaviour: review by a fresh run bound to the exact current PR head | kanmer-review's attestation binds `head_sha`; new section 7 requires distinct implementation/reviewer/verifier run identities. | Yes (F13 note) |
| Behaviour: after merge a fresh verifier validates **the configured target's** exact merged SHA | Preflight resolves the verification target from delivery policy. But the controller's only branch operation still rebases onto hardcoded `origin/main`. | Partial — **F2** |
| AC1 — frozen roster, leases, terminal disposition for every member, no unrelated captures | Freeze, captures and leases (claim transfer, `take_ticket renew`, `LEASE_EXPIRED`) all present; completion definition in section 8. **But the roster cannot be frozen for four of five scopes.** | **No — F1** |
| AC2 — attestations prove implementation identity differs from reviewer, bound to exact head | `reviewer` + `independent` + `head_sha` in the attestation, cross-checked against `expected_reviewers`; new distinct-run-identity clause. | Yes |
| AC3 — in-scope correction stays in the original ticket/PR, one delta review | Pre-existing, asserted by check 18, unchanged by this diff. | Yes |
| AC4 — exact merged-SHA PASS before Done, failures routed to the correct earlier phase | kanmer-verify's four-class routing table, intact; strengthened by the earned-`transient` rule. | Yes |
| AC5 — budgets stop repeated unchanged audits, preserving minor/note dispositions | Bounded-churn section plus the scope-discipline clause. Weakened by F3 (self-classified replan reopens the loop) and by the absence of a verification budget (F5). Minor/note preservation is stated but collides with `deferred-to-ticket` (F10). | Partial — **F3** |
| Edge case — merged PR left in Review, PASS proof left in Verifying | New "Active Review and Verifying invariants" section, with `completed` forbidden while either is unexplained. | Yes (F7 wrinkle) |
| Edge case — owner-only decision is one exact question, not a retry counter | Pre-existing section 1.6 and the `REMEDIATION_BUDGET_EXHAUSTED` operator-only rule at :205, reinforced by the escalation boundary. | Yes |

## Scrutiny items I was asked to settle

**1. No renumbering damage — clean.** Base and head both carry `## 1.` through
`## 11.` with identical numbers and titles; `## 4. Mandatory stop predicates` is
byte-identical. Only the unnumbered orientation heading was retitled. All new
material landed as `###` subsections. I ran both rails myself at the head in my
own detached worktree: `verify-skill-prose.mjs` exit 0 with `ALL CHECKS PASSED`,
`verify-agents-block.mjs` 31/31.

**2. Check 19's fixtures genuinely fail on deletion — yes, verified
independently.** The five fixture tests pass (18/18 in the file). More
importantly I did not take them on trust: I built a 42-case mutation battery
that deletes each asserted clause from a fresh copy of the real skills tree and
requires the *named* check to emit `FAIL`. **41 of 42 mutations correctly
failed their named check.** The single exception is F12 — a harness artefact
(single-occurrence replace against a token that legitimately pre-exists at
:205), not a vacuous check. The fixtures are also well built: `edit()` asserts
its anchor exists before mutating, so a silently renamed clause fails the
fixture rather than passing it. Both forbidden claims are genuinely exercised by
fixture 3 and do fire — though see F11 on their breadth.

**3. CORE-121 laundering — partially closed, and this is F3.** The explicit
bypass is refused and pinned: the text says the controller "never routes
`review` -> `preparing` to get around that refusal", and deleting `to get around
that refusal` fails check 19. I confirmed from `store.ts` that
`backwardMoveEffects` returns a bare `{reason}` for every pair except
`review -> implementing`, so `review -> preparing` neither resets nor increments
`review_round` — the counter survives a replan, which is good and means a replan
loop cannot reset the budget. **But** the replan is authorised on the
controller's own classification of a finding as a "plan defect", with no budget
precondition, and at the default budget of 1 that window coincides exactly with
the exhausted state. A controller taking bullet one never reaches bullet two.
The shipped text also drops the "available before the remediation budget is
spent" precondition that the ticket's own open-questions record adopted as its
conservative default.

**4. The controller still never merges — confirmed.** `never runs `gh pr merge``
survives verbatim and is asserted by both check 13 and check 19; deleting it
fails check 19. The new material says "**coordinates** the merge; it does not
perform it" and "never as a reason for the controller to merge instead".
Coordination did not become permission.

**5. Delivery targets from policy — this is F2.** The preflight is correct and
well argued (including why main-only is a resolved answer, not an absent one).
It is not wired through: `git rebase origin/main` at :192-193 is the controller's
only branch operation and still hardcodes main.

**6. No fifth `failure_class` — confirmed.** The vocabulary line is unchanged at
`implementation | plan | transient | inconclusive`, the routing table still has
exactly four rows, and check 18 asserts them row by row and passes. CORE-131's
four-way routing is safe.

**7. AGENTS.md — confirmed outside the managed block.** The block runs lines
1-81; the edited skills-tree line is 227. One line, and the old text ("clear an
area via parallel subagents in conflict-free waves") was genuinely wrong.

## Deviation judgement

`npm run verify` not being run locally is **acceptable** — see F15. The diff
touches no `packages/` code, so the full rail's compiled surfaces are
unreachable by it, and the hosted `verify` job is green at this exact head. The
CORE-131 lane's `npm ci`-in-worktree approach is better practice in general, but
that lane edits `packages/core` and genuinely needs a build; this one does not.
The difference does not matter here.

The `test:scripts` discharge holds. I verified the load-bearing claim
specifically: `scripts/auto-run-state.test.mjs` builds every fixture from inline
template literals, imports only `packages/core/dist/index.js`, performs no disk
read of the asset templates and accepts no root override — so this PR's template
edits cannot reach it. It passes 1/1 from the built main checkout. The two
`ERR_MODULE_NOT_FOUND` failures are the missing build, and the two `EBUSY`
failures are `scripts/antigravity-plugin-config.test.mjs`, confirmed absent from
the eight-file diff and off-limits as CORE-128's. I also checked the rest of the
`test:scripts` set: `pr-workflow.test.mjs` does read the changed `AGENTS.md`,
but asserts only on merge-gate and board-regate strings, none of which this
one-line change touches.

## CI at this head

Required checks are green: `verify` SUCCESS (5m20s) and `kanmer-gate` SUCCESS
(1m1s), both in run 33145396862 at `aa5f73da`; `regate` skipped by design. The
earlier `kanmer-gate` failure against a pre-push board was re-run and is now
green, so that discharge is sound. No flake discharge was needed.

## Residual risk carried forward

F5, F8, F11, F12, F13, F14 and F15 are dispositioned `accepted-risk` with
reasons above and are **not** filed as tickets, per HZN-008 scope discipline —
filing them would un-accept the risk just accepted. The two that matter most for
CORE-119 are F5 (no numeric verification budget; bounded only by the
no-auto-retry rule) and F8 (the `current.md` pointer race, which needs a
`packages/core` change this ticket correctly excluded).

## What is required to reach `pass`

F1, F2 and F3 fixed in this PR under the sanctioned same-PR return, with check
19 extended so each fix is enforced rather than merely written — the standard
this ticket set for itself. F4, F6, F7, F9 and F10 are minors that should be
swept in the same batch since they are all single-clause edits in the same
files, but they do not individually block `pass`.
