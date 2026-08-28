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
