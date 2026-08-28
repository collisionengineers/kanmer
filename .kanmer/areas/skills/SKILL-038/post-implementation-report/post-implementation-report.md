# Post-implementation report — SKILL-038

*The report. Not the proof — this is the author's **claim**, written before merge; proof is **evidence**, gathered after.*

## Summary

`kanmer-auto` no longer contradicts itself about blocked tickets. Section 1
step 2 dropped every ticket carrying `blocked: true`, but that flag is computed
over the **whole board** (`computeBlockedIds`, `packages/core/src/links.ts:56-72`,
fed the entire board by `blockedSet()` at
`packages/mcp-server/src/index.ts:411-415`), so a dependent was dropped whether
or not its blocker was in the run — and it was dropped *before the roster
freeze*, which made section 2's `blocks`-edge ordering rule unreachable. The
step now judges the flag against the roster: it keeps a dependent whose every
live blocker is inside the roster being frozen, ordered behind those blockers,
and excludes — reporting the blocking ids — only a dependent blocked from
outside. Two folded-in defects also land: the check named for board **health**
now pins the clause it names (N-1), and `transient` verification re-runs are
bounded by a number recorded in the run record (F-005).

**No `packages/` change was needed.** The distinction is entirely reachable
from reads the controller already performs — `list_items`, `get_links`
(`blockedBy` is derived and returned) and `get_item` — so the CORE-132 lane's
tree is untouched.

Check 19 grows **31 → 38** assertions; `verify-skill-prose.test.mjs` grows
**28 → 33** tests. Every added or repaired clause has a mutation fixture, and
the anti-absorption sweep shows 9/9 mutations produce **exactly one** FAIL,
each its own named check.

## Changes

| File | Change | Why |
|---|---|---|
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | modified (§1 step 2, §3) | Step 2 drops archived tickets and captures only; a new block states that `blocked: true` is a board fact, tells the controller to resolve `blockedBy` via `get_links` and judge each blocker's liveness from that blocker's own item (`blockedBy` is **not** liveness-filtered), and gives the two outcomes as bullets. §3 gains `### The transient retry budget`. `## 4.` is byte-identical (1877 bytes, sha256 `03796a0e…`) and `## 1.`–`## 11.` are unchanged. |
| `plugins/kanmer/skills/kanmer-auto/assets/run-state-template.md` | modified | Records the budget FRD-034 already asks for: `transient_retry_limit: 2` in frontmatter, one Run-invariant line, and a `Transient` ledger column between `Attempt` and `Replan`. `\| Replan \|` and all eleven check-13 frontmatter fields survive. |
| `scripts/verify-skill-prose.mjs` | modified (check 19) | N-1 repair plus 7 new assertions: 4 `goalContract` entries (board-wide flag, in-roster retain, out-of-roster exclude, transient budget), `transient_retry_limit:` added to the template field loop, a `\| Transient \|` ledger check, and a `forbiddenGoalClaims` entry backed by four phrasings of the board-wide drop. |
| `scripts/verify-skill-prose.test.mjs` | modified | 5 new mutation tests (9 mutations + 4 forbidden phrasings), each asserting FAIL on its own named check **and** PASS on a named sibling. Separately: all 20 bare `rmSync(fixture, …)` teardowns converted to `removeTreeWithRetrySync` — see Risks. |

### The N-1 repair, precisely

The check named `kanmer-auto preflights identity, delivery target and board
health` pinned its board-health half with a bare `/get_status\.boardWorktree/`.
The push-the-board section satisfies that same pattern through
`get_status.boardWorktree.expectedBranch`, so the entire
`- **Board worktree.**` preflight bullet could be deleted with check 19 still
green. It now pins two anchors that occur only inside that bullet — its opening
sentence, and `never a lane, a rebase target, a cleanup target, or a working
directory` (§2's similar sentence omits the repeated article and the working
directory, so it cannot absorb either). The fixture deleting the bullet FAILs
this check and leaves `kanmer-auto pushes the board before it trusts a gate
result` PASSing.

### The F-005 bound, precisely

`transient` is the only routing outcome that returns a lane to the stage it came
from, so it is the only one that can loop. `kanmer-verify` still decides
*whether* a red run earns the class — its three evidence obligations are
untouched, and there is **no fifth `failure_class`**. What is new is *how
often*: `transient_retry_limit`, default 2 per ticket per run, counted in the
ledger. The skill says plainly that **no tool enforces it** — unlike
`REMEDIATION_BUDGET_EXHAUSTED`, this is the controller's own budget, which is
why it is recorded rather than remembered — and quotes the refusal verbatim so
a check can pin it and a reader can grep it. It resolves to stop predicate 15's
existing budget boundary, so `## 4.` needed no edit.

## Governing docs

**FRD-034 — Durable goal control and independent review** (`refs`): **Meets**.
Nothing modified, no new ADR.

- Behaviour, *"The controller orders dependencies"* — previously unreachable for
  the one case it describes. A dependent is now queued and ordered behind its
  in-roster blockers instead of dropped, so the sentence is true of the
  procedure rather than only of the prose.
- Behaviour, *"records project, authority, fixed initial roster **and retry
  budget**"* — the run record had no retry budget. `transient_retry_limit` is it.
- AC1, *"reaches a terminal disposition for every member"* — a dependent that is
  queued reaches a disposition; one silently dropped never does.
- AC5, *"Review and verification budgets stop repeated unchanged audits"* — the
  numeric bound discharges the verification half, which judgement alone could not.

## Risks / follow-ups

**1. A live breakage on `main`, fixed here rather than deferred.** CORE-128
(`d523a293`) removed the `rmSync` import from
`scripts/verify-skill-prose.test.mjs` while converting its ten teardowns;
SKILL-036 merged first with fifteen *new* bare `rmSync(fixture, …)` calls. At
`origin/main` those fifteen `finally` blocks reference an unimported identifier.
Reproduced against unmodified `origin/main` content in an isolated tree:
**13 pass / 15 fail, every failure `ReferenceError: rmSync is not defined`**.
All twenty bare calls now use `removeTreeWithRetrySync`, per AGENTS.md §8 gotcha
20(a). This was directed by the controller and is mechanical — one regex, no
behaviour change, no assertion touched. It is the only part of this diff outside
the ticket's three scope items, and a reviewer should weigh it as such.

**2. The base moved mid-implementation.** Planned from `70d23efd`; rebased
cleanly onto `d523a293` when CORE-128 merged. Every invariant was re-checked
after the rebase: `## 4.` still 1877 bytes / sha256 `03796a0e…`, `## 1.`–`## 11.`
still byte-identical.

**3. The default of 2 is an operator choice, parked with a recommendation.**
`open-questions` records it under `## Parked (explicitly deferred)` and the
recommendation is implemented as the default, so nothing blocks. Verbatim:
*"What number bounds `transient` re-runs per ticket per run? Recommendation:
`transient_retry_limit: 2`, recorded in the run record, raised explicitly by the
operator when a rail genuinely needs more."* Two is the smallest number that can
still satisfy the horizon's own flake-evidence rule, which already spends one
re-run proving the classification.

**4. Deliberately out of scope.** F-008 (the `current.md` pointer race) needs a
`packages/core` change and only bites under concurrent controllers; the ticket
excludes it. No follow-up ticket is filed for anything here, per HZN-008's scope
discipline.

**5. Residual, accepted.** The skill now tells the controller to make a
judgement (`blockedBy` liveness) that no tool computes for it. That is inherent
to a skills-side fix and is why the prose names the exact fields to read. A
server-side `blockedSet` scoped to a roster would be the alternative, and it
would land in the tree CORE-132 is editing.

## Verification hand-off

At the exact merge SHA, in a disposable detached worktree:

1. `npm ci` then `npm run build:core` — **required**, because
   `verify-skill-prose.test.mjs` imports `removeTreeWithRetrySync` from
   `../packages/core/dist/index.js` (CORE-128's design, not this change).
   `verify:skills` alone needs neither.
2. `node scripts/verify-skill-prose.mjs` — expect exit **0**, `ALL CHECKS
   PASSED`, and **38** assertion lines under `=== 19.`.
3. `node --test scripts/verify-skill-prose.test.mjs` — expect **33 pass, 0
   fail**.
4. Structural: extract `## 4. Mandatory stop predicates` and confirm **1877**
   bytes / sha256
   `03796a0e22ae67a371b1ddb58bbccdf4f08b3d5d9442eb47f59a27c6e9e19b38`; confirm
   `grep "^## "` on `kanmer-auto/SKILL.md` is unchanged from `d523a293`.
5. `npm run verify` — expect exit **0**. It was green here end to end, including
   `plugin:check` (`plugin-sync OK — 40 tools match, bundle bytes match, 12
   skill frontmatters parse`), so `EXPECTED_SKILLS` is still 12.
6. Anti-absorption is the claim most worth re-testing: delete each added clause
   in turn and confirm the FAIL set is **exactly one** check, its own. The nine
   mutations and their expected single failures are listed in
   `scratch/execute.md`.

Nothing is UI-visible; no screenshots apply.
