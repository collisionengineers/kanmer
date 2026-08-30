# Plan — SKILL-038: keep in-roster blocked dependents selectable

*The plan. Not the checklist — reasoning establishes bounded work; the checklist distils it into independently observable actions.*

## Objective

`kanmer-auto` stops contradicting itself about blocked tickets: a dependent
whose every live blocker is inside the roster being frozen is **kept** and
ordered behind those blockers, only a ticket blocked from outside the roster is
excluded (with its reason reported), the check named for board **health**
actually pins the board-worktree clause, and `transient` verification re-runs
are bounded by a number recorded in the run record. Skills, scripts and skill
assets only — no `packages/` change.

## Starting state

Verified at `origin/main` **70d23efd**.

- `plugins/kanmer/skills/kanmer-auto/SKILL.md` §1 step 2: "Drop archived or
  **blocked** tickets, and drop **quick captures** …". §2 Lane assignment: "a
  `blocks` edge orders the blocker before its dependent regardless of file
  disjointness". Step 2 runs before the freeze, so §2 is unreachable for a
  roster holding both.
- `packages/mcp-server/src/index.ts:411-415` `blockedSet()` passes the **whole
  board** to `computeBlockedIds` (`packages/core/src/links.ts:61-72`), which
  marks a target blocked for any live blocker anywhere. `list_items`' `blocked`
  is therefore a board fact, not a run fact.
- `get_links` returns a derived `blockedBy` (`links.ts:44-51`) that lists every
  declaring item and is **not** liveness-filtered — liveness must be judged from
  each blocker's own item.
- `scripts/verify-skill-prose.mjs:617-624` pins "…and board **health**" only
  with `/get_status\.boardWorktree/`, which the push-the-board section also
  satisfies via `get_status.boardWorktree.expectedBranch`.
- `kanmer-verify` bounds `transient` by judgement only; the run-state template
  records no retry budget and its ledger has no transient counter.
- Check 19 has **31** assertions; `verify-skill-prose.test.mjs` has **28** tests.
- `## 4. Mandatory stop predicates` is 1877 bytes, sha256
  `03796a0e22ae67a371b1ddb58bbccdf4f08b3d5d9442eb47f59a27c6e9e19b38`.

## Governing docs

- **FRD-034 — Durable goal control and independent review** (`refs`): **Meets**.
  - Behaviour "The controller orders dependencies": today a dependent is dropped
    before the roster freezes, so the ordering clause can never apply. Keeping an
    in-roster dependent and lane-ordering it behind its blockers is what makes
    that sentence true rather than aspirational.
  - Behaviour "records project, authority, fixed initial roster **and retry
    budget**": the run record gains `transient_retry_limit`, the retry budget it
    already owed. AC5 ("Review and verification budgets stop repeated unchanged
    audits") is what the numeric bound discharges for the verification half.
  - AC1 ("reaches a terminal disposition for every member"): a dependent that is
    queued and ordered reaches a disposition; one silently dropped never does.
- No FRD/ADR is modified, and no new ADR is written: this corrects skill prose
  and its verifier against requirements FRD-034 already states.

## Fix overlay (brief-fix)

- **Reproduction:** a roster containing blocker A and dependent B, where A
  `blocks` B and A is not at the last stage. `list_items` reports B
  `blocked: true`; step 2 drops B before the freeze; the frozen roster silently
  omits B. Live instance on this board: `SKILL-036 blocks CORE-119`, and now
  `SKILL-038 blocks CORE-119`.
- **Root cause:** `computeBlockedIds` is board-wide by construction and step 2
  treats its flag as a verdict about the run.
- **Regression boundary:** a ticket blocked from **outside** the roster must
  still be excluded and reported; archived tickets and quick captures must still
  drop; the freeze must stay a single moment; `kanmer-verify`'s `transient`
  evidence obligations and the four `failure_class` values must not change.
- **Negative test:** a forbidden-claim rule that fails if any phrasing of the
  board-wide drop is reinstated, exercised by a fixture per phrasing.

## Required changes

### 1. `kanmer-auto` §1 step 2 — the blocked distinction

Replace "Drop archived or blocked tickets" with "Drop archived tickets", keep
the capture sentences unchanged, and insert after them a block that:

- states, in bold, that a `blocked` flag is a fact about the board and not about
  this run, and that `list_items` sets it for *any* live blocker anywhere;
- names the contradiction it removes (§2 cannot order a dependent that was
  already dropped);
- instructs the controller to read `blockedBy` with `get_links` and to judge
  each blocker's liveness from that blocker's own item (`archived`, and its
  stage against the board's last stage), **because `blockedBy` is derived from
  `blocks` edges alone and is not filtered by liveness**;
- gives the two outcomes as bullets — every live blocker inside the roster being
  frozen ⇒ **keep** the dependent as queued work that §2 puts in one serial lane
  behind its blockers; any live blocker outside ⇒ **exclude** it and report the
  blocking ids and where they sit;
- states that the judgement is made once, against the roster as it is frozen,
  and that a dependent whose blocker is excluded for another reason is itself
  blocked from outside.

The exact anchors the checks will pin (byte-exact, hard-wrapped as written):

- `**A \`blocked\` flag is a fact about the board, not about this run.**`
- `reports \`blocked: true\` whenever *any* live ticket anywhere`
- `read the blocked ticket's \`blockedBy\` with \`get_links\``
- `is not filtered by liveness`
- `**Every live blocker is inside the roster being frozen** — keep the` /
  `dependent.` … `queued work, not an exclusion` … `one` / `serial lane behind its blockers`
- `**Any live blocker is outside the roster being frozen** — exclude the` /
  `dependent` … `naming the blocking ids and` / `where they sit`

### 2. `kanmer-auto` §3 — the transient retry budget

Add a `### The transient retry budget` subsection immediately after §3's "Two
results are routed rather than stopped on" list and before
`### Push the board before trusting a gate`, stating:

- `transient` is the only routing outcome that returns a lane to the stage it
  came from, so it is the only one that can loop;
- the run record carries **`transient_retry_limit`**, defaulting to **2**
  re-runs per ticket per run, counted in the ledger's `Transient` column;
- no server enforces it — it is the controller's own budget, which is why it is
  recorded and counted rather than remembered;
- on the attempt that would exceed it the lane does **not** re-run: it goes
  `blocked` quoting this refusal verbatim in the ledger, the event log and the
  report:

  `transient budget exhausted: <ticket> spent <n>/<transient_retry_limit> re-runs at <merge SHA>; last failing check <check>. Not retried again without an operator decision.`

- every attempt stays in the proof, other safe lanes continue, raising the limit
  is an operator action recorded in the run record, and this is stop predicate
  15's budget boundary — **no new predicate, and `## 4.` is not edited**.

No fifth `failure_class`; `kanmer-verify` is not edited.

### 3. `run-state-template.md`

- frontmatter: add `transient_retry_limit: 2` (after `lane_limit: 3`);
- Run invariants: one line saying `transient` re-runs are bounded by
  `transient_retry_limit` per ticket and the lane blocks with the exact refusal
  when it is spent;
- ledger: add a `Transient` column between `Attempt` and `Replan`, header and
  separator both.

`Replan` must survive (check 19 pins `| Replan |`), and all 11 frontmatter
fields and 5 headings check 13 pins must survive.

### 4. `scripts/verify-skill-prose.mjs` check 19

- **Repair (N-1).** In `"kanmer-auto preflights identity, delivery target and
  board health"`, replace `/get_status\.boardWorktree/` with two regexes that
  exist only inside the preflight bullet:
  `/- \*\*Board worktree\.\*\* \`get_status\.boardWorktree\` must be healthy and on its\s+board branch/`
  and `/never a lane, a\s+rebase target, a cleanup target, or a working directory/i`.
  (§2's similar sentence reads "never a lane, rebase target, or cleanup target",
  so it cannot absorb either.)
- **Add four `goalContract` entries**, each named for exactly what it pins:
  1. `kanmer-auto judges a blocked flag against the frozen roster, not the whole board`
  2. `kanmer-auto keeps a dependent whose every live blocker is inside the roster`
  3. `kanmer-auto excludes only a dependent blocked from outside the roster, with its reason`
  4. `kanmer-auto bounds transient re-runs with a number and blocks with the exact refusal`
- **Add `"transient_retry_limit:"`** to the run-state template field loop
  (yields `run-state template records transient_retry_limit:`).
- **Add one check** `run-state ledger counts transient re-runs per ticket`
  pinning `/\| Transient \|/` on `runStateBody`.
- **Add one `forbiddenGoalClaims` entry**
  `roster that drops every blocked ticket board-wide`, backed by every phrasing
  that would make the name untrue, not only the legacy sentence:
  `/Drop archived or blocked tickets/i`,
  `/drop (?:all |every |any )?blocked tickets/i`,
  `/blocked tickets are (?:always )?(?:dropped|excluded|skipped)/i`,
  `/a blocked ticket is (?:always )?(?:dropped|excluded|skipped) from the roster/i`.
  Each must be verified not to match the new positive prose.

Result: **31 → 38** assertions in check 19.

### 5. `scripts/verify-skill-prose.test.mjs`

Five new tests, all using the existing `goalFixture` / `skillFile` / `edit` /
`runOn` / `expectFail` / `expectPass` helpers, each asserting the mutated clause
fails **its own** named check and that a named sibling still **passes**:

1. deleting the `- **Board worktree.**` preflight bullet ⇒ FAIL the preflight
   check, PASS `kanmer-auto pushes the board before it trusts a gate result`;
2. a three-row table over the blocked clauses, each row naming the check it must
   break and a sibling it must not;
3. reinstating the board-wide drop in four phrasings ⇒ FAIL
   `no roster that drops every blocked ticket board-wide`;
4. removing the transient-budget heading, and separately the verbatim refusal
   ⇒ FAIL the transient check, PASS a named sibling;
5. mutating `transient_retry_limit:` and `| Transient |` in the template ⇒ FAIL
   both template checks, PASS `run-state template records delivery_target:`.

Result: **28 → 33** tests.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `plugins/kanmer/skills/kanmer-auto/SKILL.md` | §1 step 2 blocked distinction; §3 transient retry budget. §4 bytes and all `## N.` numbering unchanged. Source, not generated. |
| Modify | `plugins/kanmer/skills/kanmer-auto/assets/run-state-template.md` | `transient_retry_limit: 2`, one Run-invariant line, `Transient` ledger column. Source, not generated. |
| Modify | `scripts/verify-skill-prose.mjs` | Check 19: N-1 regex repair + 7 new assertions. |
| Modify | `scripts/verify-skill-prose.test.mjs` | 5 new mutation fixtures with anti-absorption assertions. |
| Inspect | `packages/core/src/links.ts`, `packages/mcp-server/src/index.ts` | Read-only evidence for the prose. **Not edited** — CORE-132's lane. |
| Inspect | `plugins/kanmer/skills/kanmer-verify/SKILL.md` | Confirms the four `failure_class` values and the `transient` evidence rule stay untouched. |

## Do not modify

- `## 4. Mandatory stop predicates` (1877 bytes, sha256 `03796a0e…`) and the
  `## 1.`–`## 11.` numbering.
- Anything under `packages/`.
- `scripts/antigravity-plugin-config.test.mjs`; `.worktrees/kanmer`,
  `.worktrees/core-128`, `.worktrees/core-132`, any `verify-*` worktree.
- `EXPECTED_SKILLS` (stays 12); no skill added or removed.
- The `failure_class` set (stays exactly four); `kanmer-verify/SKILL.md`.
- The board branch: MCP writes stay uncommitted, `kanmer-board` is never pushed.

## Constraints

- Branch from freshly fetched `origin/main` = `70d23efd`; lane worktree under
  `.worktrees/skill-038`; every git command uses an absolute path.
- Skills-only change: no `npm ci` should be needed for `verify:skills` or for
  `node --test scripts/verify-skill-prose.test.mjs`. Verify that rather than
  assume it. `plugin:check` refuses from a linked worktree by design
  (`check-plugin-sync.mjs` guard) and `auto-run-state.test.mjs` needs an
  install — record both **INCONCLUSIVE**, never a fabricated pass.
- `npm run verify` exits 1 on the antigravity `EBUSY` pair (CORE-128's, off
  limits) — report it as a known, out-of-scope failure with evidence.
- New prose must not trip check 19's existing `forbiddenGoalClaims`, whose
  `[^.]*` spans mean "budget", "spent/exhausted" and "replan" must not share a
  sentence.
- New prose must not trip check 7: no `` `feature|fix|chore|spike|custom` ``
  profile id in a sentence that also names a doc type or boundary.
- Windows timing/`ENOTEMPTY` failures reach hosted CI: discharge any red run
  with a same-SHA re-run, a diff-untouched confirmation and a mechanism
  argument, retaining the first failure.

## Ordered steps

1. `git -C <repo> worktree add <abs>/.worktrees/skill-038 -b skill-038 70d23efd`
   and confirm `git -C <worktree> rev-parse HEAD` is `70d23efd`.
2. Record the baseline: `node scripts/verify-skill-prose.mjs` exit 0, its check
   count, and `node --test scripts/verify-skill-prose.test.mjs` pass count (31 /
   28). Record the sha256 and byte count of `## 4.`.
3. Edit `kanmer-auto/SKILL.md` §1 step 2 per Required change 1.
4. Edit `kanmer-auto/SKILL.md` §3 per Required change 2, inserting the new
   subsection between the routed-results list and `### Push the board…`.
5. Edit `run-state-template.md` per Required change 3.
6. Re-verify §4's sha256 and byte count are unchanged, and that `## 1.`–`## 11.`
   headings are byte-identical to `70d23efd`.
7. Edit check 19 per Required change 4; run `verify:skills` and confirm exit 0
   and 38 assertions in check 19.
8. Add the five fixtures per Required change 5; run
   `node --test scripts/verify-skill-prose.test.mjs` and confirm 33/33.
9. **Anti-absorption sweep:** for every clause added or repaired, run the
   validator on a fixture with that clause deleted and confirm the FAIL set is
   exactly its own named check. Record the matrix in the report.
10. Confirm the new forbidden-claim rules do **not** match the new positive
    prose (baseline run is green, which is the proof, plus an explicit
    regex-against-the-file check).
11. Run the wider rails, recording each exit code and classifying anything red
    as in-scope, known-out-of-scope, or INCONCLUSIVE.
12. Commit with a `Kanmer: SKILL-038` trailer, push, open the PR with the
    footer, write the post-implementation report, move to Review.

## Acceptance checks

- `node scripts/verify-skill-prose.mjs` exits 0 and check 19 prints **38**
  assertion lines, all PASS.
- `node --test scripts/verify-skill-prose.test.mjs` reports **33** passing tests,
  0 failing, including the 28 pre-existing ones unmodified.
- Deleting the `- **Board worktree.**` bullet FAILs
  `kanmer-auto preflights identity, delivery target and board health` and no
  other check (N-1 discharged).
- Each of the three blocked clauses, deleted individually, FAILs exactly its own
  named check and leaves its named sibling PASSing.
- Deleting the transient-budget heading or its verbatim refusal FAILs
  `kanmer-auto bounds transient re-runs with a number and blocks with the exact refusal`
  and no sibling.
- Reinstating the board-wide drop, in each of four phrasings, FAILs
  `no roster that drops every blocked ticket board-wide`.
- `sha256(## 4. Mandatory stop predicates) == 03796a0e22ae67a371b1ddb58bbccdf4f08b3d5d9442eb47f59a27c6e9e19b38`
  and its byte count is 1877.
- `git -C <worktree> diff --name-only 70d23efd` lists exactly the four files in
  Expected files — no `packages/` path.
- No test assertion is weakened, and every command's exact exit code is retained.

## Commands

Run from the lane worktree with absolute paths.

- Focused: `node scripts/verify-skill-prose.mjs` ;
  `node --test scripts/verify-skill-prose.test.mjs`
- Structure: `awk` extraction of `## 4.` piped to `sha256sum` and `wc -c` ;
  `git diff --name-only 70d23efd`
- Repository rail: `npm run verify` (expected to exit 1 on CORE-128's
  antigravity `EBUSY` pair — report, do not fix) ; `npm run test:scripts`
- INCONCLUSIVE by environment, recorded as such: `npm run plugin:check`
  (refuses from a linked worktree by design) and
  `node --test scripts/auto-run-state.test.mjs` (needs an install).
- Post-PR: `gh pr checks` on the PR head; discharge any red Windows-timing run
  with a same-SHA re-run plus mechanism argument.

## Failure and deviation rules

- If any acceptance check needs a `packages/` edit to pass, **stop and report**
  — that is the controller's decision, not this lane's.
- If `## 4.`'s hash moves, revert that hunk before anything else.
- A new regex that fails a sibling check is absorption: rewrite the anchor,
  never relax the sibling.
- Do not weaken or delete a pre-existing assertion or test to make the suite
  green.
- No follow-up tickets, no thread resolution, no merge, no second ticket.

## Stop condition

The PR is open against `main` from `skill-038` with a `Kanmer: SKILL-038`
footer, the post-implementation report is written, and SKILL-038 is in
**Review**. Do not review, resolve threads, or merge this work.


---

## Consolidated review-remediation plan — 2026-08-28

### Exact inputs

- Current verified base: `add0da7fc17968796f43b3035065de400a4db2d4`.
- Stale PR head: `8a909ee97d95a0c50e5102c3c7f88d4c575614ba`; prior base `d523a29365a20133fc5f0e16a29df40b1a80bd8e`.
- GitHub strict current-base protection is enabled; PR #304 reports `BEHIND`.
- Four current review threads are one consolidated major remediation:
  - `PRRT_kwDOT2PEds6dGORs` — dependency cycles.
  - `PRRT_kwDOT2PEds6dGORx` — run-schema versioning.
  - `PRRT_kwDOT2PEds6dGOR3` — CORE-128 separation.
  - `PRRT_kwDOT2PEds6dGOR-` — canonical AGENTS contract.
- `git merge-tree --write-tree add0da7… 8a909ee…` succeeds; no semantic merge conflict is expected.

### Ordered implementation

1. Rebase the existing `.worktrees/skill-038` / `skill-038-blocked-dependents` pair onto exact `add0da7…`. Preserve no second worktree and no new ticket.
2. Audit the post-rebase diff:
   - no pre-existing CORE-128 teardown line remains in the net diff;
   - exactly the five SKILL-038-added teardowns use `removeTreeWithRetrySync`;
   - no bare `rmSync(` remains;
   - remove the paragraph-only reflow and rewrite/squash history so it does not claim CORE-128 remediation.
3. In `kanmer-auto/SKILL.md`, form the directed live-blocker graph before applying internal-retention:
   - detect every strongly connected cycle and self-loop;
   - acyclic internal dependencies remain queued and serially ordered;
   - external blockers still exclude with named ids;
   - a cycle records an ordered cycle path and complete member set, dispatches none of its members, records each as `blocked` in selection/ledger/events/report, and makes the run explicitly `blocked` instead of waiting forever.
4. Version the run contract:
   - schema 3 is current and is the first schema with `transient_retry_limit` plus the durable `Transient` counter;
   - a schema-1 or schema-2 active record is never resumed, restamped, supplemented, or rewritten under schema-3 assumptions;
   - preserve its entire ledger, close it with a terminal status legal in that schema plus reason/successor id, and create a new schema-3 record/new run id with a freshly frozen roster;
   - unknown or absent schemas are a hard refusal;
   - update the required-field list for new schema-3 runs.
5. Stamp both run templates `schema: 3`; preserve the pointer/history separation and every existing retry-budget field.
6. Update root `AGENTS.md` in the same diff for internal versus external blockers, cycle behavior, numeric default 2, and no in-place old-schema rewrite.
7. Extend check 19 and its mutation suite:
   - cycle check must order before the acyclic-retention check and pin path/members, blocked disposition, and no dispatch;
   - schema check pins version 3, schema-1/2 refusal, no in-place rewrite, and both templates;
   - AGENTS check pins all four conventions;
   - fixtures delete/reorder each clause independently and keep sibling checks green;
   - derive final assertion/test counts from the edited tree instead of preserving stale 38/33 counts.
8. Re-prove `## 4. Mandatory stop predicates` remains 1877 bytes with SHA-256 `03796a0e22ae67a371b1ddb58bbccdf4f08b3d5d9442eb47f59a27c6e9e19b38`; do not alter the eleven numbered sections.
9. Run, once on the final head: `npm run build:core`, `npm run verify:skills`, `node --test scripts/verify-skill-prose.test.mjs`, `git diff --check`, then the complete `npm run verify` Windows rail. Preserve every exit/result.
10. Update the post-implementation report and PR body to remove CORE-128 ownership, describe cycles/schema 3/AGENTS, and name the exact new head.
11. Push the rebased branch with `--force-with-lease` only after verifying the expected old remote head `8a909ee…`. Wait for all automated review/check activity on the exact new head.
12. Post one public consolidated disposition for all four threads, obtain one fresh independent review plus one delta review, resolve only after durable disposition, sync the board, require fresh `verify` and `kanmer-gate`, then merge and exactly verify.

### Negative cases

- A→B→A and A→A never enter dependency waiting.
- An acyclic A→B retains both and orders B after A.
- An external live blocker excludes its dependent and names the blocker.
- Schema 1/2 is not treated as if it carried retry counters.
- The live HZN-008 schema-1 run is not mutated by this PR.
- Missing/unknown schema is refused.
- Removing any AGENTS convention or template stamp fails its own named check.
- Main's 15 CORE-128 cleanup lines are absent from the net diff; SKILL-038's five new teardown calls use the helper from their first retained version.
- No `packages/**` change, fifth failure class, new service, stage, or ticket.

### Acceptance

The final PR is based on exact current main, contains only the six declared files, has no open blocker/major finding or unresolved thread, and has fresh exact-head `verify` plus `kanmer-gate`. The fresh-head check creation also completes CORE-135's remaining stale-base proof.


---

## Exact-head delta-remediation amendment — PR #304 head `8010881c4e48ffabe97aba674361980f8ab3b279`

This amendment supersedes the earlier cycle and legacy-successor steps only where
they set the whole run blocked during selection or allowed a successor before
legacy workers were quiescent. It is the one consolidated response to
F-001–F-004 in review attestation `301136bc9e266eab`.

### Root-cause invariant

Roster resolution is one ordered pipeline:

1. apply every ordinary exclusion, including archived/capture rules and live
   foreign-claim handling;
2. resolve external-blocker exclusions to a fixed point;
3. build the remaining live blocker graph and detect every cyclic strongly
   connected component plus self-loop;
4. give cycle members and all transitive downstream dependents terminal
   `blocked` dispositions that name the originating cycle;
5. retain and order only the remaining safe acyclic internal chains.

A cyclic component does not stop unrelated work. The run stays `running` while
any safe lane is queued or active and becomes `blocked` only after every safe
lane is terminal.

Legacy schema transition has a separate fail-closed invariant: reconcile every
recorded lane, worker, claim, workspace, Git/PR/CI fact and result before
changing the legacy run or pointer. An active or uncertain legacy worker means
no terminal rewrite, no successor, and no pointer change; preserve exact
evidence and stop for operator handoff. Only when every legacy worker is proven
inactive may the complete old ledger be preserved, terminally closed under its
own schema, and linked to a distinct schema-3 successor.

### Files and symbols

- `plugins/kanmer/skills/kanmer-auto/SKILL.md`
  - schema-1/2 transition paragraph: add reconciliation/quiescence gate and the
    no-mutation/no-successor uncertain path;
  - §1 step 2: put claim handling before dependency closure, make external
    exclusions a fixed point, detect SCCs/self-loops, propagate through
    downstream dependents, and defer run-wide `blocked` until safe lanes end.
- `AGENTS.md` item 22: mirror the ordered selection pipeline, downstream
  terminality, independent-lane continuation, and legacy quiescence rule.
- `scripts/verify-skill-prose.mjs` check 19: pin each ordering/safety clause by
  its own named assertion; update the schema transition and AGENTS assertions.
- `scripts/verify-skill-prose.test.mjs`: add isolated mutation fixtures using
  the existing copied-tree helpers and `removeTreeWithRetrySync`.
- Both schema-3 templates remain unchanged unless a focused assertion proves a
  missing required field; no template change is expected in this delta.

### Required negative scenarios

- `A ↔ B` with A live-foreign-claimed: A is excluded for the claim, then B is
  excluded with A named; no cycle is recorded.
- `A ↔ B`, `B → C → E`, plus independent D: A/B/C/E are terminally blocked
  and undispatched with the cycle witness; D reaches its target; only then does
  the run become blocked.
- Multiple cyclic components plus a self-loop: every component has an ordered
  witness path and complete member set; downstream propagation names the
  correct origin.
- Active and uncertain schema-1/2 workers: the old ledger and pointer are
  byte-preserved and no successor exists.
- Fully quiescent schema-1/2 run: preserve the complete ledger, use a terminal
  status legal to that schema, record reason and successor id, then create and
  read back one distinct schema-3 successor.
- Existing acyclic internal, outside-roster blocker, retry-budget, schema stamp,
  CORE-128 separation and mandatory-section tests stay green.

### Verification and handoff

Run `npm run build:core`, `npm run verify:skills`,
`node --test scripts/verify-skill-prose.test.mjs`, `git diff --check`, then
one uninterrupted `npm run verify` at the final committed head. Derive counts
from results. Re-prove the mandatory section remains 1,877 bytes with SHA-256
`03796a0e22ae67a371b1ddb58bbccdf4f08b3d5d9442eb47f59a27c6e9e19b38`,
the diff remains exactly the declared six files with no `packages/**`, and all
teardowns use the shared retry helper.

Amend the existing single commit, push only with lease against exact remote
`8010881c4e48ffabe97aba674361980f8ab3b279`, wait for new exact-head checks and
automated review, then perform one delta review limited to F-001–F-008, changed
lines, direct contracts and tests. No thread is resolved before public durable
disposition and the passing delta attestation.


---

## Exact-head automated finding amendment — F-009

Automated Codex review at exact PR head
`22c3cfa239e87893cc6fc639d27746273e614754` identified one remaining major
contract contradiction: section 3 authorises bounded re-runs only after a proof
is explicitly classified `transient`, while section 9 still forbids every
automatic verification retry without naming that route.

### Coherent correction

- In `plugins/kanmer/skills/kanmer-auto/SKILL.md` section 9, retain the
  blanket ban for implementation, migration, test and build commands. Make the
  section-3 proof-classified `transient` verification route the sole explicit
  exception, and bind it to the recorded numeric limit and durable counter.
- In root `AGENTS.md` item 22, state the same sole-exception invariant so the
  canonical controller inventory cannot disagree with the skill.
- In `scripts/verify-skill-prose.mjs`, strengthen the retry/force contract and
  add a named assertion that requires both halves: no general command retry and
  exactly one bounded proof-classified verification exception.
- In `scripts/verify-skill-prose.test.mjs`, mutate away the exception and mutate
  it into an unclassified/unbounded retry. Each mutation must fail its own named
  check while an unrelated sibling remains green.

### Negative cases and commands

A failed verification without an authoritative `transient` proof remains a
hard no-retry. A proof-classified transient attempt with remaining recorded
budget may re-run once through section 3. An exhausted budget blocks with the
existing verbatim refusal. No second exception is introduced. Run the focused
skill validator and mutation suite, re-prove the mandatory-section hash and
six-file boundary, then run one complete `npm run verify` rail at the amended
exact head before review resumes.


---

## Root-cause replan — exact-head F-010 through F-012

Automated Codex review at exact head
`339be5c802197bdd3e96c7dcbda591c02f9fe972` settled with three additional
major findings:

- F-010 / `PRRT_kwDOT2PEds6dkP3F`: the classified-only route prevents the
  same-SHA evidence rerun that `kanmer-verify` requires before a proof can earn
  `transient`.
- F-011 / `PRRT_kwDOT2PEds6dkP3G`: an acyclic blocker intentionally stopped at
  an early target such as Review remains live on the board, so its dependent
  can stay queued forever.
- F-012 / `PRRT_kwDOT2PEds6dkP3I`: several independent AGENTS validator
  conjuncts still lack their own deletion/weakening mutation.

### One coherent correction

1. Use one budget and one durable `Transient` count for two explicitly
   authorised **fresh independent verifier** entries. The evidence-bootstrap
   entry is legal only when the prior proof is `INCONCLUSIVE`, explicitly names
   a missing same-job/same-SHA rerun, confirms the failing path is untouched by
   the diff, and records a concrete environmental mechanism hypothesis. The
   controller increments `Transient` before dispatch; it never reruns the
   command itself, reuses the same verifier, or self-classifies the result.
2. A later fresh verifier may enter after authoritative
   `failure_class: transient`; it also increments the same counter before
   dispatch and is subject to the same `transient_retry_limit`. An unclassified
   proof without that explicit evidence request, and every `implementation` or
   `plan` proof, never enters. This matches the parked default-2 decision: one
   count can establish the first classification and one remains for a genuinely
   flaky later check.
3. Resolve the requested target before dependency retention. The board's final
   stage is the only target that clears a live `blocks` edge. For a shallower
   target, keep the blocker as safe work to its requested stop, but give every
   direct and transitive downstream dependent a terminal `blocked` run
   disposition naming the blocker, requested target and final stage; dispatch
   none. Independent lanes finish before the run becomes blocked. Only a target
   capable of clearing all live internal blockers may use the existing serial
   retention rule.
4. Mirror both distinctions in root `AGENTS.md`. Complete the existing AGENTS
   mutation table for the outside-roster rule, safe internal retention, ordered
   cycle witness, partial-target closure, classifier-evidence boundary, and
   quiescent distinct schema-3 successor. Every row must fail the one AGENTS
   check while the corresponding skill-level assertion remains green.

### Files, negative cases and commands

Modify only the existing four prose/validator files; both schema templates stay
unchanged. Add focused cases for: first red -> one classifier evidence rerun ->
transient -> fresh counted verifier; unclassified evidence without the exact bootstrap request and every implementation/plan proof get no dispatch; both authorised fresh verifier entries consume the same lane counter; `A -> B` at up-to-Review
terminally blocks B after A reaches Review; the same chain at final closeout
retains and orders both; multi-hop downstream closure plus independent D; and
one mutation per guarded AGENTS clause. Preserve the six-file total diff,
mandatory-section bytes/hash, schema stamps, CORE-128 separation and all prior
negative cases. Run the validator and mutation suite, then one full clean
`npm run verify` rail only after the new committed head is stable.


## Exact-head root-cause replan — F-013/F-014

### Root cause

The evidence-bootstrap and launch-retry rules were expressed in terms of
physical dispatches instead of the canonical proof shape and one logical
verification attempt:

- `kanmer-verify` records an actual red command attempt as `FAIL`, while
  `failure_class: inconclusive` is the correct aggregate classification before
  the same-job rerun can distinguish a transient mechanism. Requiring only
  top-level `INCONCLUSIVE` excludes that valid proof.
- Section 9 permits one retry only when a verifier launch definitely failed
  before mutation. Incrementing before every physical dispatch double-charges
  the retry even though no additional verification process ran.

### Bounded correction

Only the existing six SKILL-038 files remain in scope.

1. In `plugins/kanmer/skills/kanmer-auto/SKILL.md`, allow the bootstrap proof's
   top-level result to be exactly `FAIL` or `INCONCLUSIVE`, keep
   `failure_class: inconclusive`, and require the explicit same-job/same-SHA
   request, retained failed attempt when one ran, untouched failing path,
   environmental mechanism hypothesis, and a fresh independent verifier.
   Continue refusing PASS, NOT_APPLICABLE, missing/other classes, self-
   classification, and same-worker reruns.
2. Define `Transient` as a durable reservation per logical verifier attempt:
   increment once and read back before the first dispatch; the one confirmed
   pre-mutation transport retry reuses that reservation and never increments,
   decrements, or resets it. Unknown launch status dispatches nothing, and the
   physical retry remains capped at one.
3. Mirror both invariants in root `AGENTS.md`.
4. Extend `scripts/verify-skill-prose.mjs` with exact anchors for both proof
   results, retained-attempt obligation, logical-attempt reservation/reuse, and
   no decrement/reset.
5. Extend `scripts/verify-skill-prose.test.mjs` with one-clause mutations and
   sibling assertions for every new guard. Preserve all assertions and
   `removeTreeWithRetrySync` teardown use.
6. Re-amend the one truthful SKILL-038 commit, run focused checks, then run one
   complete clean Windows `npm run verify` rail at the next immutable head.

### Negative cases

- `PASS`, `NOT_APPLICABLE`, missing result, or a class other than
  `inconclusive` cannot enter bootstrap.
- `FAIL` without a retained non-zero attempt or without the explicit
  same-job/same-SHA evidence request is refused.
- A confirmed pre-mutation transport retry cannot increment `Transient` a
  second time.
- Unknown launch status cannot reuse the reservation or dispatch a replacement.
- The reservation is never decremented or reset after a failed launch,
  classification, or resume.

### Commands

- `node scripts/verify-skill-prose.mjs`
- `node --test scripts/verify-skill-prose.test.mjs`
- `npm run test:scripts`
- `npm run verify:skills`
- `git diff --check origin/main...HEAD`
- one complete clean Windows `npm run verify`


## Exact-head retry-capacity correction F-015

The retry contract has exactly two **authorization paths**, not exactly two
total verifier attempts:

1. The evidence-bootstrap path may admit at most one evidence-establishing
   logical attempt for a ticket in a run.
2. The classified-transient path may admit another fresh independent logical
   attempt whenever the durable `Transient` count still has room beneath
   `transient_retry_limit`.

Every admitted logical attempt reserves one durable count before dispatch. The
single confirmed pre-mutation transport launch retry reuses that reservation;
unknown launch status remains non-dispatching. Raising
`transient_retry_limit` adds capacity only to the classified-transient path
and never creates a third authorization path.

### Files and symbols

- `plugins/kanmer/skills/kanmer-auto/SKILL.md`: correct the budget subsection
  and section 9 authorization language.
- `AGENTS.md`: mirror the two-path, configurable-capacity invariant.
- `scripts/verify-skill-prose.mjs`: pin both path count and capacity semantics.
- `scripts/verify-skill-prose.test.mjs`: add independent mutations for
  bootstrap-at-most-once, recurring classified attempts while budget remains,
  and raised-limit capacity without a third path.

### Negative cases and commands

A mutation that restores a literal two-attempt cap, permits repeated bootstrap,
prevents classified retries beneath a raised limit, or invents a third path must
fail the named check. Run the focused validator, mutation suite,
`npm run test:scripts`, `npm run verify:skills`, diff/hash checks, and one
clean complete Windows `npm run verify` rail at the amended exact head.
