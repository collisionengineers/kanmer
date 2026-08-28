# Plan — SKILL-036: durable `/goal` orchestration with bounded independent review and verification

*The plan. Not the checklist — reasoning establishes bounded work; the checklist distils it into independently observable actions.*

## Objective

Make FRD-034's `/goal` controller **usable**, by extending the shipped
`kanmer-auto` contract in place — variable scope with a frozen roster, an
identity/delivery preflight, wider overlap detection, a bounded escalation
boundary after a spent remediation budget, Phase 13 active-stage invariants,
and the operating rules the live HZN-008 run paid for — and by making every new
clause enforceable in `scripts/verify-skill-prose.mjs`, exactly as SKILL-037 did.

## Starting state

- `origin/main` is `28a12643` (CORE-116). The skills roster is **12**;
  `scripts/verify-skill-prose.mjs` asserts that number and, in checks 13/14/16/18,
  asserts literal strings and multi-line regexes inside
  `kanmer-auto/SKILL.md`, its two assets, `kanmer-review/SKILL.md`,
  `kanmer-verify/SKILL.md`, `kanmer-execute/SKILL.md` and
  `kanmer-closeout/SKILL.md`.
- `kanmer-auto` already implements the durable run record
  (`automation/current.md` + immutable `automation/runs/<run-id>.md`), the run
  and disposition vocabularies, lane assignment, the five-step reconciliation
  loop, 17 stop predicates, the serial fallback, role independence and the
  four-list report. It accepts **only** one explicit existing group, states no
  roster freeze, and performs no preflight.
- `Store.backwardMoveEffects` (`packages/core/src/store.ts:1001`) gates only
  `review → implementing` (attestation bound to a `prs[]` entry, or an
  `operator:` reason) and raises `REMEDIATION_BUDGET_EXHAUSTED` at
  `review_round >= remediation_budget`. Every other backward move needs a
  non-empty reason and nothing more.
- The installed server is v0.3.12 and exposes no `get_status.boardSync`
  (verified this session: `server.version 0.3.12`, `sha256Short 639df4cf`).
- A quick capture is `profile: "capture"` (CORE-117 / FRD-032).
- The board resolves **main-only** delivery because Kanmer's own `board.yml`
  deliberately carries no `delivery:` block, so a hardcoded `main` would pass
  every check in this repo and still be wrong elsewhere.

## Governing docs

- **FRD-034 — Durable goal control and independent review (`refs`): Meets.**
  - *Behaviour, scopes*: §"Variable scope and the frozen roster" adds one
    ticket / one group / one area / an explicit ticket list / the prepared
    board, with the roster frozen in `## Selection contract`.
  - *Behaviour, "New unrelated tickets and captures do not join a running
    roster"*: the same section states that the roster is closed and that
    `profile: "capture"` items are never selected.
  - *Behaviour, reconcile before dispatch and after every result*: already
    shipped in §3; extended with the active-stage invariants and the
    sync-before-gate rule.
  - *Behaviour, "Review is performed by a fresh run … bound to the exact
    current PR head"*: already shipped in §7 and `kanmer-review`; extended so
    the controller records `implementation_run_id != reviewer_run_id` in the
    ledger.
  - *Behaviour, "After merge, a fresh verifier validates the configured
    target's exact merged SHA"*: preflight resolves the configured target from
    delivery policy instead of `main`.
  - *AC 1* (frozen roster, leases, terminal disposition for every member, no
    unrelated captures) — §"Variable scope and the frozen roster" plus the
    unchanged completion definition in §8.
  - *AC 2* (attestations prove distinct identities, bound to the exact head) —
    the reviewer-dispatch clause and `kanmer-review`'s existing attestation
    schema.
  - *AC 3* (in-scope correction stays in the original ticket/PR, one delta
    review) — already shipped; §3's remediation route is unchanged.
  - *AC 4* (exact merged-SHA PASS before Done; failures routed to the correct
    earlier phase) — already shipped in `kanmer-verify`'s table; extended with
    the hosted-CI discharge evidence rule so a flake is not classed
    `transient` by assertion.
  - *AC 5* (budgets stop repeated unchanged audits while preserving minor/note
    dispositions) — §"Bounded churn and the escalation boundary" plus the scope
    discipline clause.
  - *Edge case, merged PR left in Review / PASS proof left in Verifying* —
    §"Active Review and Verifying invariants".
  - *Edge case, owner-only decision becomes one exact question, not an extended
    retry counter* — already shipped (§1.6, stop predicate 4); reinforced by the
    escalation boundary.
- **ADR-0005 (delivery state is non-gating) — Meets.** The controller reads
  delivery policy only to learn the PR target and the verification target;
  nothing in this contract makes a `delivery_*` field a gate input.
- **CORE-121's backward-move contract — Meets, adds no third authority.**
  `review → implementing` keeps exactly two authorities. The escalation
  boundary deliberately *refuses* to use `review → preparing` as a route around
  `REMEDIATION_BUDGET_EXHAUSTED`.
- **No governing doc is modified and no new ADR is written.** Every decision
  here is an application of FRD-034 and the already-merged contracts.

*(Docs overlay applied — audience: the controller agent and the operator reading
its run record. Source of truth: the shipped skills, `store.ts`'s
`backwardMoveEffects`, `verify-skill-prose.mjs`, and the HZN-008 run ledger.
Claims changed: the scope `kanmer-auto` accepts, and what a controller must do
before trusting a gate, a merge, or a red CI run. Version sensitivity: the
sync-before-gate clause names both the v0.3.12 git form and the candidate
`get_status.boardSync` form, so a reader can tell which applies.)*

## Required changes

### 1. `kanmer-auto` accepts the five FRD-034 scopes and freezes its roster

Replace the scope sentence in §1 so it keeps the literal string
**`one explicit existing group`** (asserted by check 13) while naming all five
scopes. A group scope is the ordinary case. Every other scope has no durable
batch owner of its own and therefore names a **run host group** whose
`automation/` folder owns the record — the existing "stop before mutation and
ask the operator to name or create an epic/horizon" rule becomes the mechanism
for that, not a refusal. The host group's membership is **not** the roster: the
roster is the frozen list in `## Selection contract`, resolved once at run
creation and never re-resolved. A ticket created after the freeze, and any item
with `profile: "capture"`, is out of the run whatever its group, area or
`blocks` edge.

### 2. Preflight before the first mutation

A new short §"Preflight" between orientation and roster selection: confirm the
project fingerprint from `get_status` matches the run record's
`project_fingerprint`; report `get_status.repo` staleness rather than repairing
it; read the delivery policy **once** and record the resolved PR target and
verification target in the run record, because a controller must never hardcode
`main`; and confirm the board worktree is healthy and on `kanmer-board`. A
controller owns its declared scope and its own workspaces — never the project —
so several controllers may run against one board when their scopes and
workspaces are disjoint.

### 3. Overlap detection widens beyond the `files` document

§2 currently compares only `files` documents. Add contract/API surface,
migrations, lockfiles and heavyweight shared resources (a release channel, a
single hosted CI rail, a device or port) as overlap that forces one serial lane,
and state the rail-contention rule the ledger recorded: do not run two heavy
verification rails concurrently, because that is the documented cause of the
Windows timing flake rather than a change regression.

### 4. Sync before gate

New clause in §3: the merge gate reads the **remote** board tip and does not
re-run on board pushes, so a gate result is current only after the board branch
is pushed. Confirm with an absolute-path git comparison of the board worktree's
`kanmer-board` tip against `origin/kanmer-board` (on a candidate server,
`get_status.boardSync` with `ahead` at 0 is the same fact). A gate that passes
while recording "no review attestation", or fails with `SYNC_REQUIRED`, is a
stale-board artefact: push or ask the operator to sync, re-run the failed job at
the same SHA, and only then treat the result as evidence. Agents never push the
board branch themselves unless the operator has granted it.

### 5. Bounded churn and the escalation boundary

New §: one consolidated review, one in-scope remediation batch, one delta
review — restating no per-skill rule, only the controller's route. If the delta
review's blocking finding is a **plan** defect, the controller may take the one
automatic replan (`review → preparing`, one fresh planning subagent, one plan
revision, re-execute), recorded once per ticket in the ledger's `Replan` column;
it does not raise `remediation_budget`. If `move_item` refuses
`REMEDIATION_BUDGET_EXHAUSTED`, the budget is genuinely spent: the lane goes
`blocked` with the refusal quoted verbatim, and the controller **never** uses
`review → preparing` to route around it. Only an operator re-opens the loop with
a reason beginning `operator:`. This is the parked open question's recommended
default, implemented.

### 6. Active Review and Verifying invariants

New §: a selected ticket in Review must have an open PR, a current head SHA, an
active or immediately queued reviewer, and an attestation state; in Verifying, a
confirmed merged PR, an exact merge SHA, an active or immediately queued
attempt, and a known proof state. A merged PR left in Review and a PASS proof
left in Verifying are reconciled before the run reports anything. The run is
never `completed` while a selected ticket sits in an unexplained Review or
Verifying state.

### 7. Merge coordination, not merging

Extend the existing role-independence section (§7): the controller *coordinates*
the merge by dispatching the independent reviewer that holds it, and reconciles
the merge from GitHub; it still **never runs `gh pr merge`** — that literal
string is asserted and stays. `main`'s `required_conversation_resolution: true`
means a PR stays `BLOCKED` until every thread is resolved however green the
checks: dispositioning a finding in the attestation and resolving its thread on
GitHub are one obligation, owed by the reviewer that dispositioned it.

### 8. Evidence hygiene

Add to §3/§7: read a proof or attestation **in full**, never frontmatter-only —
appended prose can contradict `result:`, and a frontmatter-only read is a
recorded cause of a wrong disposition. Every controller git command uses an
absolute path, after the incident where a drifted working directory ran a merge
inside `.worktrees/kanmer`. Concurrent verifiers get unique log paths. A
reviewer finding dispositioned `minor`, `note` or `accepted-risk` never becomes
a new ticket — filing one un-accepts the risk just accepted; a new ticket needs
a blocker/major finding or one blocking a named FRD acceptance criterion. Never
run a secrets-manager list command to inventory names, and never rely on a
post-hoc text filter to redact output already produced.

### 9. Templates carry the new run facts

`run-state-template.md` gains `scope`, `scope_selector`, `authority` and
`delivery_target` frontmatter (additive — all eleven asserted fields and all
five headings stay), a `Selection contract` line recording that the roster is
frozen and when, and a `Replan` column in the ticket ledger.
`current-run-template.md` gains `scope` and `scope_selector` so a resuming
controller knows what it is adopting before opening the history record.

### 10. Enforcement

New check block **19** in `scripts/verify-skill-prose.mjs`, in check 18's style —
each clause asserted in the one skill that acts on it — plus template-field
assertions, and two negative assertions that the file does not claim the
controller merges or that a budget-exhausted lane may self-replan. Extend
`scripts/verify-skill-prose.test.mjs` with fixture tests that break each new
clause and assert the named check fails. `EXPECTED_SKILLS` stays **12**.

### 11. One AGENTS.md line

The skills-tree comment for `kanmer-auto/` reads "clear an area via parallel
subagents in conflict-free waves" and becomes actively wrong. Correct it to
describe the durable `/goal` controller. Confirm the line sits **outside** the
`kanmer:instructions` managed block before editing.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Changes 1–8. Hand-written; every check-13/14 literal preserved. |
| Modify | `plugins/kanmer/skills/kanmer-auto/assets/run-state-template.md` | Change 9. Additive frontmatter, new ledger column. |
| Modify | `plugins/kanmer/skills/kanmer-auto/assets/current-run-template.md` | Change 9. Additive frontmatter. |
| Modify | `plugins/kanmer/skills/kanmer-review/SKILL.md` | Change 4 (reviewer half) and 7 (thread resolution). |
| Modify | `plugins/kanmer/skills/kanmer-verify/SKILL.md` | Hosted-CI discharge evidence; read the proof in full; unique verifier log. No fifth `failure_class`. |
| Modify | `scripts/verify-skill-prose.mjs` | Change 10. Check block 19. Not generated. |
| Modify | `scripts/verify-skill-prose.test.mjs` | Change 10. Fixture tests for the new checks. |
| Modify | `AGENTS.md` | Change 11. One line, outside the managed block. |
| Inspect | `packages/core/src/store.ts` | `backwardMoveEffects` — read-only, quoted, never edited. |
| Inspect | `.kanmer/groups/HZN-008/context.md` and `automation/runs/20260827T133106Z-claude-code.md` | Source of the operating rules. Read via MCP; never written by this ticket. |

## Do not modify

- `packages/core/**` and `packages/mcp-server/**` — the CORE-131 lane is editing
  them now. No new tool, field, error code or gate is needed.
- `scripts/antigravity-plugin-config.test.mjs` — CORE-128's lane.
- `plugins/kanmer/mcp/kanmer-mcp.cjs` and every generated bundle.
- `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` — no tool
  name changes.
- The `kanmer:instructions` managed block in `AGENTS.md`.
- `.worktrees/kanmer`, `.worktrees/core-128`, `.worktrees/core-131`, every
  `verify-*` worktree, and the `kanmer-board` branch (never committed or pushed).
- Untracked `goal.md`, `.infisical.json`, `skills-lock.json` — not this ticket's.

## Constraints

- **`EXPECTED_SKILLS` stays 12.** No new skill directory; SKILL-036 extends
  `kanmer-auto` in place rather than forking the run-state pattern.
- Every literal asserted by checks 13, 14, 16 and 18 must survive verbatim —
  notably `one explicit existing group`, ``never runs `gh pr merge` ``,
  `read it back`, the five run statuses, and the template's five headings and
  eleven frontmatter fields.
- Additions must not trip check 7 (no per-profile requirement list) or check 8
  (`.worktrees/kanmer` and "one gated boundary" stay stated), and every
  `kanmer-<word>` token must name a real skill (check 5).
- No third authority for `review → implementing`.
- No fifth `failure_class`.
- Anything the contract tells a controller to read must exist on the installed
  v0.3.12 server, or must name its v0.3.12 equivalent alongside.
- Branch from a freshly fetched `origin/main`; absolute paths in every git
  command; own worktree only.
- `npm run verify` is expected to exit 1 on the antigravity `EBUSY` pair —
  CORE-128's, recorded not fixed.

## Ordered steps

1. Create the branch and worktree from `origin/main` (`28a12643`) via
   `take_ticket`, using absolute paths.
2. Read `kanmer-auto/SKILL.md` in full in the worktree, and re-read
   `verify-skill-prose.mjs` checks 13/14 side by side, so the protected literals
   are known before the first edit.
3. Edit `kanmer-auto/SKILL.md` §1: five scopes, run host group, frozen roster,
   captures excluded — preserving `one explicit existing group`.
4. Add §"Preflight" (identity, repo staleness, delivery target, board worktree
   health, multi-controller scope ownership) and renumber nothing (append as a
   subsection of §1 to keep §2–§11's numbers, which check 14's
   `^## 4\. Mandatory stop predicates$` regex depends on).
5. Widen §2's overlap definition and add the rail-contention rule.
6. Add the sync-before-gate clause and the evidence-hygiene clauses to §3.
7. Add the bounded-churn/escalation-boundary and active-stage-invariant
   sections after §3, again without renumbering §4–§11.
8. Extend §7 with merge coordination and the conversation-resolution obligation.
9. Run `npm run verify:skills`; expect it green before touching anything else.
10. Update both `kanmer-auto` assets (change 9); re-run `verify:skills`.
11. Add the reviewer-side board-sync and thread-resolution clauses to
    `kanmer-review/SKILL.md`, keeping check 18's two negative lookaheads false;
    re-run `verify:skills`.
12. Add the hosted-CI discharge, full-proof-read and unique-log clauses to
    `kanmer-verify/SKILL.md` without adding a class; re-run `verify:skills`.
13. Write check block 19 in `scripts/verify-skill-prose.mjs`; run it and read
    every printed line, not just the exit code.
14. Add the fixture tests to `scripts/verify-skill-prose.test.mjs`; prove each
    new check fails when its clause is removed.
15. Correct the one `AGENTS.md` line; run `npm run verify:agents-block`.
16. Run `node --test scripts/verify-skill-prose.test.mjs`, `npm run test:scripts`,
    `npm run verify:skills`, `npm run verify:agents-block`; record exact exit codes.
17. Write the post-implementation report, commit, push, open the PR with the
    `Kanmer: SKILL-036` footer, and move Implementing → Review.

## Acceptance checks

- **Production caller / registration.** The contract's consumer is the
  controller agent that loads `kanmer-auto/SKILL.md`; the skill is registered by
  its own directory in `plugins/kanmer/skills/`, and
  `scripts/check-plugin-sync.mjs` strict-parses its frontmatter. `verify:skills`
  is the enforcing caller for the prose itself.
- **Every new clause is enforced, not merely written.** Check block 19 asserts
  each one, and a fixture test proves each assertion fails when its clause is
  deleted — the SKILL-037 standard.
- Each of FRD-034's five acceptance criteria and both edge cases maps to a named
  section, as tabulated under Governing docs.
- `verify-skill-prose.mjs` reports `ALL CHECKS PASSED` with
  `the roster is 12 skills`, and checks 13, 14, 16 and 18 still pass unchanged.
- `kanmer-auto/SKILL.md` still contains `one explicit existing group` and
  ``never runs `gh pr merge` ``, and contains no clause permitting an automatic
  replan after `REMEDIATION_BUDGET_EXHAUSTED`.
- No file under `packages/`, no bundle, and no tool-reference file is in the diff.
- Tests prove the claims without weakened assertions; exact commands and exit
  codes are retained in the post-implementation report.

## Commands

Run from the ticket worktree, absolute paths, Windows/PowerShell:

- `npm run verify:skills` — the focused rail for every prose edit.
- `npm run verify:agents-block` — the AGENTS.md managed-block rail.
- `node --test scripts/verify-skill-prose.test.mjs` — the new fixture tests.
- `npm run test:scripts` — the rail that carries the above in CI.
- `npm run verify` — recorded for completeness; **expected to exit 1** on the
  antigravity `EBUSY` pair, which belongs to CORE-128.
- `npm run plugin:check` — **not run**: the bundle is untouched, and the script
  refuses to run from a linked worktree by design.
- Hosted CI on the PR is the rail of record; a red run is discharged only with a
  same-SHA re-run, a diff-untouched confirmation and a mechanism argument.

## Failure and deviation rules

Stop and report, never silently redesign: a `verify:skills` check that cannot be
satisfied without deleting an existing asserted literal; any need to touch
`packages/`, the bundle or a tool reference; any temptation to add a third
`review → implementing` authority or a fifth `failure_class`; a conflict with
CORE-131's or CORE-128's files; a governing-doc conflict; or an unsafe command.
Scope expansion, dependency additions and new tickets are out — a finding that
does not block a named FRD-034 acceptance criterion is recorded as residual
risk on this ticket, not filed. Record every deviation in the
post-implementation report.

## Stop condition

PR open against the delivery policy's PR target with a `Kanmer: SKILL-036`
footer, and the ticket moved Implementing → Review. Do not review, do not
merge, do not resolve GitHub review threads, do not file follow-up tickets, and
do not start another ticket.
