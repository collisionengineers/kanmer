# Post-implementation report — SKILL-036

*The report. Not the proof — this is the author's **claim**, written before
merge; proof is **evidence**, gathered after.*

## Summary

FRD-034's `/goal` controller shipped as an **extension of `kanmer-auto` in
place**, not as a second orchestrator. Every durable-state mechanism FRD-034
names — the run record, the status vocabulary, the reconciliation loop, the stop
predicates, role independence — already existed there and is asserted verbatim
by `scripts/verify-skill-prose.mjs` checks 13/14/18; forking it was the explicit
non-goal. What was genuinely missing is now written and enforced: the five FRD-034
scopes with a **frozen roster**, an identity/delivery/board **preflight**,
overlap detection beyond the `files` document, **sync before gate**, a bounded
**escalation boundary** that adds no route around `REMEDIATION_BUDGET_EXHAUSTED`,
the **active Review/Verifying invariants**, merge **coordination** (never
execution), and the evidence rules a two-day multi-controller HZN-008 run paid
for. A new check block 19 asserts each clause in the one skill that acts on it,
and five fixture tests prove each check fails when its clause is removed. The
skills roster is unchanged at **12**; nothing under `packages/` is touched.

## Changes

| File | Change | Why |
|---|---|---|
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | modified | The controller contract. New scope/frozen-roster/run-host-group opening; new `### Preflight before the first mutation`; widened overlap in §2; four new subsections in §3 (`Push the board before trusting a gate`, `Read the evidence, not its summary`, `Bounded churn and the escalation boundary`, `Active Review and Verifying invariants`); merge coordination, run-identity independence and the `required_conversation_resolution` obligation appended to §7; broadened frontmatter `description`; H1 and intro updated to match. No section renumbered — `## 4. Mandatory stop predicates` is still exactly that, which check 14 depends on. |
| `plugins/kanmer/skills/kanmer-auto/assets/run-state-template.md` | modified | Additive `scope`, `scope_selector`, `authority`, `delivery_target` frontmatter; a frozen-roster line and a scope line in `## Selection contract`; two new run invariants; a `Replan` column in the ticket ledger; a resume instruction that forbids re-resolving the roster and requires the board push. All five asserted headings and all eleven asserted fields retained. |
| `plugins/kanmer/skills/kanmer-auto/assets/current-run-template.md` | modified | Additive `scope` / `scope_selector`, so a resuming controller knows what it is adopting before opening the history record. `run_path` and `## Resume instruction` retained. |
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | modified | Two clauses: the gate reads the remote board tip and does not re-run on a board push, with the portable comparison for servers that do not report `boardSync`; and dispositioning a finding and resolving its thread are one obligation, posted publicly first, because `required_conversation_resolution` holds the PR blocked otherwise. |
| `plugins/kanmer/skills/kanmer-verify/SKILL.md` | modified | `transient` is earned, not asserted — same-SHA re-run, diff-untouched confirmation and a mechanism argument, every attempt retained; a proof is read in full, never frontmatter-only; concurrent verifications get their own log paths. No fifth `failure_class`; the routing table is unchanged. |
| `scripts/verify-skill-prose.mjs` | modified | New check block 19: ten contract assertions, four run-state field assertions, two template-shape assertions, and two forbidden claims (the controller merging, and a self-authorised replan after an exhausted budget). `EXPECTED_SKILLS` untouched at 12. |
| `scripts/verify-skill-prose.test.mjs` | modified | Five fixture tests, one per clause group, each mutating the real skills tree in a temp fixture and asserting the named check prints `FAIL`. |
| `AGENTS.md` | modified | One line in the skills tree: `kanmer-auto/`'s comment described clearing an area in waves, which was already stale and became actively wrong. Outside the `kanmer:instructions` managed block (lines 1–81); `verify:agents-block` re-run and green. |

## Governing docs

**FRD-034 — Durable goal control and independent review (the ticket's only
`ref`): met, not modified.** No governing doc was changed and no new ADR was
written; every decision is an application of FRD-034 and the already-merged
CORE-114…124 / SKILL-037 contracts.

| FRD-034 | Where it is met |
|---|---|
| Behaviour — accepts one ticket, group, area, explicit list or prepared board | `kanmer-auto` §"Orientation, scope and durable-state resume", five scopes named literally |
| Behaviour — durable run recording project, authority, fixed initial roster, retry budget | the run-state template's `project_fingerprint`, `authority`, frozen `Included tickets`, and the existing `remediation_budget` reading in §3 |
| Behaviour — new unrelated tickets and captures do not join a running roster | same section: the roster is "resolved once at run creation … and never re-resolved"; a later ticket and any quick capture are excluded |
| Behaviour — reconcile before dispatch and after every result; worker prose never advances a ticket | already shipped in §3; extended by the sync-before-gate and evidence-hygiene subsections |
| Behaviour — order dependencies, detect overlap, bounded lanes, leases, persist each decision | §2, now with contract/migration/lockfile/resource overlap |
| Behaviour — review by a fresh run bound to the exact current PR head | §7's run-identity clause plus `kanmer-review`'s existing attestation schema |
| Behaviour — after merge a fresh verifier validates the configured target's exact merged SHA | preflight resolves the verification target from delivery policy instead of `main` |
| AC 1 — frozen roster, leases, terminal disposition for every member, no unrelated captures | §"Orientation, scope…" + the unchanged completion definition in §8 |
| AC 2 — attestations prove implementation identity differs from reviewer identity | §7 "Independence is a distinct **run identity**, not a distinct account", with all three identities recorded in the ledger |
| AC 3 — in-scope correction stays in the original ticket/PR with one delta review | already shipped; §3's `needs-changes` route is unchanged and untouched |
| AC 4 — exact merged-SHA PASS before Done; failures routed to the correct earlier phase | `kanmer-verify`'s existing table, now with the discharge rule that stops a red rail being classed `transient` by assertion |
| AC 5 — budgets stop repeated unchanged audits while preserving minor/note dispositions | §"Bounded churn and the escalation boundary" + the scope-discipline bullet in §"Read the evidence, not its summary" |
| Edge case — merged PR left in Review, PASS proof left in Verifying | §"Active Review and Verifying invariants" |
| Edge case — an owner-only decision becomes one exact question, not an extended retry counter | already shipped (§1.6, stop predicate 4); reinforced by the escalation boundary, which routes an exhausted budget to `blocked` rather than to another attempt |

**ADR-0005 (delivery state is non-gating): met.** The controller reads delivery
policy only to learn the PR target and the verification target. Nothing here
makes a `delivery_*` field a gate input.

**CORE-121's backward-move contract: met, and deliberately not extended.**
`review → implementing` still has exactly two authorities — a `needs-changes`
attestation bound to a `prs[]` entry, or a reason beginning `operator:`. The
escalation boundary explicitly refuses to use `review → preparing` as a route
around `REMEDIATION_BUDGET_EXHAUSTED`, and check 19's second forbidden claim
asserts that refusal stays in the prose.

## Risks / follow-ups

- **Parked operator-only question (implemented conservatively, quoted in full in
  `open-questions`).** Whether a controller may take Phase 12's automatic replan
  *after* `REMEDIATION_BUDGET_EXHAUSTED`. `goal.md` PHASE 10–12 reads as though
  the replan is automatic; the shipped skills and the live HZN-008 run both
  park for the operator. The store gates only `review → implementing`, so the
  controller *could* route `review → preparing` on its own authority — which is
  precisely why the answer is a policy the operator owns, not an implementation
  choice. The **conservative reading is implemented as the default**: the one
  automatic replan is available for a *plan* defect before the budget is spent;
  once the refusal has been raised the lane blocks. That is strictly more
  restrictive than either reading, so an operator answer can only loosen it, and
  `replan_used` already carries the state a looser policy would need. **No
  follow-up ticket filed** — per HZN-008's Scope discipline section, this blocks
  no named acceptance criterion.
- **Residual risk, accepted:** check 19 asserts prose by literal and regex, so a
  faithful rewording of a clause will fail CI until the check is updated
  alongside. That is the same trade SKILL-037's check 18 already makes and the
  reason both blocks carry a comment explaining what each assertion protects.
- **Residual risk, accepted:** `kanmer-review`'s `board_sha` clause names
  `get_status.boardSync`, which the installed v0.3.12 server does not expose;
  the portable git comparison is stated alongside in both skills so the rule is
  usable today. It becomes redundant, not wrong, after promotion.
- **Not done, deliberately:** no `packages/core` or `packages/mcp-server` change
  (CORE-131's lane), no `scripts/antigravity-plugin-config.test.mjs` change
  (CORE-128's lane), no bundle rebuild, no new skill, no new `failure_class`, no
  new ticket.

## Verification hand-off

Run in a detached worktree at the exact merged SHA. `packages/core/dist` must
exist first — a fresh linked worktree has none, which is the only reason two
unrelated script tests fail there (see below).

| Command | Expected |
|---|---|
| `npm run verify:skills` | exit 0, ends `ALL CHECKS PASSED`, includes `the roster is 12 skills` and a green `=== 19. SKILL-036 durable /goal orchestration contract ===` block of 18 `PASS` lines |
| `npm run verify:agents-block` | exit 0, `31/31 checks passed` |
| `node --test scripts/verify-skill-prose.test.mjs` | exit 0, `tests 18 / pass 18 / fail 0`, including the five `goal contract validator …` tests |
| `npm run build && npm run test:scripts` | the four failures observed pre-build must be gone except the antigravity pair |
| `git diff --name-only <base>..<merged-sha>` | eight files, none under `packages/`, `plugins/kanmer/mcp/`, or `scripts/antigravity-plugin-config.test.mjs` |

**Commands actually run in the ticket worktree, with exit codes:**

| Command | Exit | Result |
|---|---|---|
| `npm run verify:skills` | 0 | `ALL CHECKS PASSED`; check 19's 18 assertions all `PASS`; `the roster is 12 skills` |
| `npm run verify:agents-block` | 0 | `31/31 checks passed` |
| `node --test scripts/verify-skill-prose.test.mjs` | 0 | `tests 18 / pass 18 / fail 0` |
| `npm run test:scripts` | 1 | 4 failures, all pre-existing or environmental — see the discharge below |
| `node -e` strict YAML parse of the modified `kanmer-auto` frontmatter | 0 | `{ name, description }` parse cleanly under the same `yaml` parser `check-plugin-sync.mjs` uses |
| `npm run verify` | **not run** | A linked worktree has no `node_modules`, so the full rail cannot execute there, and `check-plugin-sync.mjs` refuses to run from one by design. The bundle is untouched, so `plugin:check` is not owed. Deviation from the plan's Commands list, recorded here. Hosted CI on the PR is the rail of record. |

**Discharge of the four `test:scripts` failures — evidence, not assertion:**

1. `the quote-free launcher still reaches the shim when LOCALAPPDATA contains
   spaces` and `the shipped installer shim restores the provider cwd before MCP
   launch` — both from `scripts/antigravity-plugin-config.test.mjs`, which is
   **CORE-128's lane** and outside this ticket's boundary. `git diff
   --name-only` confirms the file is untouched by this diff. The group context
   already records this pair as a known host failure.
2. `scripts/auto-run-state.test.mjs` and `release notes turn shorthand PR refs
   into repository links` — both fail with
   `ERR_MODULE_NOT_FOUND: …/packages/core/dist/index.js`, i.e. an unbuilt
   worktree, not a code defect. **Re-run at the same code from the built main
   checkout: `node --test scripts/auto-run-state.test.mjs
   scripts/release-notes.test.mjs` → exit 0, `pass 2 / fail 0`.** Mechanism:
   neither test file, nor `packages/core`, nor anything they import is in this
   diff; `auto-run-state.test.mjs` builds its run/pointer fixtures from inline
   strings and never reads `run-state-template.md`, so the template change
   cannot reach it.

**Acceptance mapping for the reviewer:** every FRD-034 criterion and both edge
cases map to a named section in the table above; every new clause has a check-19
assertion; every check-19 assertion has a fixture test that proves it fails when
its clause is deleted.

---

## Remediation round 1 — head `26306355aaf2fb374dbfb2e63e82dd344724654a`

Everything above this line describes head `aa5f73da`, the head the independent
review attested against. It is left intact as the round-1 claim; where its
numbers are superseded, this section says so explicitly. This is remediation
**round 1 of a budget of 1**, taken in the sanctioned same-PR re-entry lane on
the authority of the `needs-changes` attestation (`scratch/review.md`, version
`29342076fa26203e`) bound to that head. Same branch, same worktree, same
PR #302 — no second PR, no re-take, no new worktree.

One commit: `26306355`, five files, 421 insertions / 34 deletions. Still nothing
under `packages/`, and nothing in `scripts/antigravity-plugin-config.test.mjs`.

### Finding by finding

| Finding | Severity | What changed | Which check pins it now |
|---|---|---|---|
| **F1** | blocker | §1 step 1 was the single group-only resolution (`list_items group:`) for five declared scopes, contradicting the orientation's own statement that the host group's membership is not the roster. It is replaced by **one resolution step per scope** — ticket (`get_item`), group (`list_items group:`), area (`list_items area:` in `list_board` order), list (`get_item` per named id, operator order, unknown/archived id is a stop before the freeze), board (`list_items` unfiltered, board order). The freeze and the gates-first readiness rules are then stated **once** and declared to apply identically to all five, so no scope has its own semantics. §1 step 2 now reads the **run host group's** context, which is what a non-group scope actually has. | Five named checks — `kanmer-auto resolves the roster for {ticket,group,area,list,board} scope` — plus `kanmer-auto freezes and gates every scope's roster identically`. Deleting any one scope's resolution step fails **that scope's own check** while the other four still pass; the fixture proves that per scope. |
| **F2** | major | `git rebase origin/main` at the old :192-193 — the controller's only branch operation — becomes a rebase onto the run's recorded `delivery_target`, with absolute `-C` paths, and states that the integration branch is policy resolved in the preflight rather than a constant. CORE-116's `deliveryTargets` is now wired through to the one place it mattered. | `kanmer-auto rebases onto the recorded delivery target, never a literal main`, which asserts `rebase origin/<delivery_target>` **and** the absence of `rebase origin/main`. The fixture reverts the clause to `origin/main` and requires the FAIL. |
| **F3** | major | The one automatic replan was authorised on the controller's own classification of a finding as a plan defect with **no budget precondition**, which at `remediation_budget: 1` coincides exactly with the exhausted state — so a controller taking that bullet never reached the bullet forbidding the bypass. The precondition the ticket's own `open-questions` adopted as its conservative default is restored explicitly: the replan is available **only while the remediation budget is still available before it is spent**, checked first from the live item, and a ticket whose `review_round` has reached its `remediation_budget` gets **no** automatic replan at all regardless of classification. The text now separates the two decisions — classification decides *whether* a replan is the right route, the budget decides whether one is *available* — and records that a replan neither resets nor increments `review_round`. | `kanmer-auto allows its one replan only before the remediation budget is spent`. The fixture deletes the precondition clause and requires the FAIL. |
| **F11** | minor (was accepted-risk; fixed anyway) | Both forbidden-claim checks were narrower than their names. Each is now a **list** of rules covering every phrasing that would make the name untrue — including "performs / executes / carries out the merge", "runs `gh pr merge`", "kanmer-auto merges the pull request", "merge is performed by the controller", "a budget-exhausted lane may self-replan", and "after `REMEDIATION_BUDGET_EXHAUSTED` the controller replans automatically". The failure detail now names which rule matched. The skill's genuine negations ("never runs `gh pr merge`", "never merges its own PR", "budget is **still available before it is spent**") are not contiguous matches for any rule, so only the affirmative claim fires. | The two checks keep their names (`no controller performing the merge itself`, `no self-authorised replan after an exhausted budget`). A new fixture appends **eight** paraphrases one at a time, each in its own fixture, and requires the correctly-named check to FAIL for each. |
| **F4** | minor | The sync-before-gate commands compared the literal `kanmer-board`. They now use `<board-branch>`, defined as the **configured** branch read from `get_status.boardWorktree.expectedBranch` — the repository variable `KANMER_BOARD_BRANCH` the hosted gate itself uses, falling back to `kanmer-board` only when unset — and the prose names it as the same defect class as a hardcoded `main`. | Folded into `kanmer-auto pushes the board before it trusts a gate result`, which now requires `origin/<board-branch>`, `expectedBranch`, `KANMER_BOARD_BRANCH`, **and** the absence of `origin/kanmer-board`. The fixture reverts to the literal and requires the FAIL. |
| **F6** | minor | The template gained four fields while staying `schema: 1`, so a legacy record passed startup validation and resumed with no frozen selector, authority or delivery target. Both templates are stamped `schema: 2`, and the resume section states that a `schema: 1` record is **not** resumed as-is: the controller stops and reports it, and the operator either completes the four fields and stamps `schema: 2` or starts a new run. An unknown or absent `schema` is the same stop. Nothing in `packages/core` reads this field — it is skill-level validation — so no runtime behaviour changes. | `kanmer-auto requires run-record schema 2 and refuses to resume a schema-1 record`, plus `run-state template is stamped schema: 2` and `current-run template is stamped schema: 2`. One fixture mutates all three and requires all three FAILs. |
| **F7** | minor | The active-Review invariant unconditionally demanded an active or queued reviewer, with no exemption for the supported **up to review** target whose stop condition is exactly a ticket parked in Review with its PR open. That exemption is now stated, and scoped: at that target such a ticket is *at target*, not unexplained; every other target still requires a reviewer. | Folded into `kanmer-auto states the active Review and Verifying invariants`. The fixture removes the exemption clause and requires the FAIL. |
| **F9** | minor | The identity preflight required the fingerprint to equal "the run record's `project_fingerprint`", which a brand-new run — whose record does not exist until after the freeze — can never satisfy. It now splits the two cases: a **resumed** run must match the existing record (a mismatch is a stop); a **new** run has no record yet, so the value read here is what gets written at creation. | `kanmer-auto's identity preflight covers a new run as well as a resumed one`. The fixture collapses it back to the single case and requires the FAIL. |
| **F10** | minor | The evidence-hygiene rule ("a minor/note/accepted-risk finding does not become a new ticket") collided with `kanmer-review`'s `deferred-to-ticket` disposition, which is invalid without a linked ticket — leaving an out-of-scope minor with no legal disposition. The exception is now explicit: a finding the reviewer genuinely defers as out of scope takes `deferred-to-ticket` **and** its ticket whatever its severity; a minor left as accepted residual risk is not deferred and gets no ticket. | `kanmer-auto keeps `deferred-to-ticket` legal for an out-of-scope finding`. The fixture removes the exception and requires the FAIL. |

### Not re-opened

**F5, F8, F12, F13, F14 and F15 stay dispositioned accepted residual risk and
were not touched.** F8 in particular needs an expected-version or
exclusive-create option on `set_group_doc` in `packages/core`, which this ticket
excludes and CORE-131 is editing. Nothing here files a follow-up ticket, adds a
fifth `failure_class`, renumbers a section, changes `EXPECTED_SKILLS` from 12, or
adds a thirteenth skill. `## 4. Mandatory stop predicates` is byte-identical and
no `## 1.`–`## 11.` heading is in the diff — verified by `git diff | grep '^[+-]## '`
returning nothing.

### Corrected verification hand-off

These supersede the round-1 table's counts.

| Command | Expected at the merged SHA |
|---|---|
| `npm run verify:skills` | exit 0, `ALL CHECKS PASSED`, `the roster is 12 skills`, and check block 19 showing **31** `PASS` lines (was 18) |
| `npm run verify:agents-block` | exit 0, `31/31 checks passed` |
| `node --test scripts/verify-skill-prose.test.mjs` | exit 0, `tests 28 / pass 28 / fail 0` (was 18), including the eleven new `goal contract validator …` mutation tests |
| `git diff --name-only <base>..<merged-sha>` | eight files, none under `packages/`, `plugins/kanmer/mcp/`, or `scripts/antigravity-plugin-config.test.mjs` |

**Commands actually run in the ticket worktree this round, with exit codes:**

| Command | Exit | Result |
|---|---|---|
| `node scripts/verify-skill-prose.mjs` | 0 | `ALL CHECKS PASSED`; check 19 = 31 `PASS`, 0 `FAIL` |
| `npm run verify:skills` | 0 | same rail via the package script |
| `npm run verify:agents-block` | 0 | `31/31 checks passed` |
| `node --test scripts/verify-skill-prose.test.mjs` | 0 | `tests 28 / pass 28 / fail 0` |
| `git push origin skill-036-durable-goal-orchestration` | 0 | `aa5f73da..26306355`, fast-forward on the existing branch |
| `gh pr view 302` | 0 | `state OPEN`, `headRefOid 26306355aaf2fb374dbfb2e63e82dd344724654a`; `gh pr list --head …` returns only #302 |
| `npm run verify` | **not run** | Still not owed, and for the reason the reviewer explicitly accepted last round (F15): this round's diff again touches no `packages/` code, no bundle and no tool reference, so the full rail's compiled surfaces are unreachable by it, and a linked worktree has no `node_modules`. Hosted CI on the PR is the rail of record. |
| `npm run test:scripts` | **not re-run** | Its discharge is unchanged: this round touches neither `scripts/antigravity-plugin-config.test.mjs` (CORE-128's `EBUSY` pair) nor anything `auto-run-state.test.mjs` reads — that test builds its fixtures from inline template literals and never reads `run-state-template.md`, so the `schema: 2` stamp cannot reach it. |

### Fixture standard

The reviewer's 42-case mutation battery found the round-1 checks well
constructed and asked for the same standard on the new ones. Eleven new
`test(...)` blocks were added, and the ones that iterate do so with a fresh
fixture per case: **five** scope mutations (each also asserting a *sibling*
scope's check still passes, so no scope is propped up by a neighbour) and
**eight** forbidden-claim paraphrases. Every new assertion has a mutation that
deletes exactly the clause it claims to pin and requires the FAIL **by check
name**, using `expectFail`/`expectPass` helpers that print the whole validator
output on mismatch. The existing `edit()` helper still asserts its anchor exists
before mutating, so a silently reworded clause fails the fixture rather than
passing it. No new assertion can pass vacuously.
