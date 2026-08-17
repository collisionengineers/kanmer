# Proof — SKILL-013

Verified on **merged `main` at `8d9d8f9`** (PR #56, squash-merged), in the main
checkout, 2026-08-17. Every command below was run there, after `git pull`.

## 1. The four-profile before/after table — measured, both halves

The operator's instruction was that every multi-stage `fix` move be **re-measured,
not assumed**, and that an assertion here is worth nothing. So: one harness, run
against `origin/main` before the change and against merged `main` after. Every
forward multi-stage move, all four profiles, **every document present** — which
leaves `collapsesPipeline` as the only thing that can refuse.

`PRINT_MATRIX=1 npx vitest run src/profile-matrix.test.ts` in `packages/core`.

### BEFORE (`origin/main` @ `efdc9f3`)

```
move                         feature  fix      chore    spike
backlog -> preparing         ALLOWED  ALLOWED  ALLOWED  ALLOWED
backlog -> implementing      REFUSED  ALLOWED  ALLOWED  ALLOWED
backlog -> review            REFUSED  ALLOWED  ALLOWED  ALLOWED
backlog -> verifying         REFUSED  ALLOWED  ALLOWED  ALLOWED
backlog -> done              REFUSED  REFUSED  REFUSED  ALLOWED
preparing -> implementing    ALLOWED  ALLOWED  ALLOWED  ALLOWED
preparing -> review          REFUSED  ALLOWED  ALLOWED  ALLOWED
preparing -> verifying       REFUSED  ALLOWED  ALLOWED  ALLOWED
preparing -> done            REFUSED  REFUSED  REFUSED  ALLOWED
implementing -> review       ALLOWED  ALLOWED  ALLOWED  ALLOWED
implementing -> verifying    ALLOWED  ALLOWED  ALLOWED  ALLOWED
implementing -> done         REFUSED  ALLOWED  ALLOWED  ALLOWED
review -> verifying          ALLOWED  ALLOWED  ALLOWED  ALLOWED
review -> done               ALLOWED  ALLOWED  ALLOWED  ALLOWED
verifying -> done            ALLOWED  ALLOWED  ALLOWED  ALLOWED
```

### AFTER (merged `main` @ `8d9d8f9`) — reproduced at verify, not copied forward

```
move                         feature  fix      chore    spike
backlog -> preparing         ALLOWED  ALLOWED  ALLOWED  ALLOWED
backlog -> implementing      REFUSED  ALLOWED  ALLOWED  ALLOWED
backlog -> review            REFUSED  REFUSED  ALLOWED  ALLOWED   *
backlog -> verifying         REFUSED  REFUSED  ALLOWED  ALLOWED   *
backlog -> done              REFUSED  REFUSED  REFUSED  ALLOWED
preparing -> implementing    ALLOWED  ALLOWED  ALLOWED  ALLOWED
preparing -> review          REFUSED  REFUSED  ALLOWED  ALLOWED   *
preparing -> verifying       REFUSED  REFUSED  ALLOWED  ALLOWED   *
preparing -> done            REFUSED  REFUSED  REFUSED  ALLOWED
implementing -> review       ALLOWED  ALLOWED  ALLOWED  ALLOWED
implementing -> verifying    ALLOWED  ALLOWED  ALLOWED  ALLOWED
implementing -> done         REFUSED  REFUSED  ALLOWED  ALLOWED   *
review -> verifying          ALLOWED  ALLOWED  ALLOWED  ALLOWED
review -> done               ALLOWED  ALLOWED  ALLOWED  ALLOWED
verifying -> done            ALLOWED  ALLOWED  ALLOWED  ALLOWED
```

**Exactly five cells changed, every one of them `fix`.** `feature`, `chore` and
`spike` are byte-identical between the two runs — the operator's "keep" is
measured rather than assumed.

- The intended cell is `implementing → done`.
- The other four are the same mechanism from further back: any `fix` move that
  *skips over* Review now crosses two gated boundaries instead of one.
- **Both FRD-002 acceptance cases survive**: `spike backlog → done` ALLOWED,
  `chore backlog → implementing` ALLOWED. Asserted by name in the test, so a
  future regression names itself.
- **A `fix` walked one stage at a time is unaffected end to end** —
  `backlog → implementing`, `implementing → review`, `review → verifying`,
  `review → done`, `verifying → done` all still ALLOWED.

The harness is committed (`packages/core/src/profile-matrix.test.ts`, with a
snapshot), so reproducing this costs one test run rather than rebuilding the
instrument.

## 2. Existing boards are actually reached — the SKILL-012 lesson

Editing `DEFAULT_PROFILES` alone reaches new boards only. Run against **this
repo's own `board.yml`**, which predates the change and was not modified by it:

```
board.yml profiles.fix AS WRITTEN ON DISK
{ "leave-preparing": ["files","plan"], "enter-done": ["proof"] }

resolveProfiles().fix — what the gates actually use
{ "leave-preparing": ["files","plan","questions-resolved"],
  "enter-done":      ["proof","questions-resolved"],
  "enter-review":    ["post-implementation-report","questions-resolved"] }

chore: {"leave-preparing":["plan","questions-resolved"],"enter-done":["proof","questions-resolved"]}
spike: {"enter-done":["research","questions-resolved"]}
```

The boundary appears though the file says nothing about it; `chore` and `spike`
are untouched; and the new boundary **inherited `questions-resolved`**, which is
the ordering the implementation depends on.

**A caveat that belongs in proof rather than being quietly omitted:** calling
`get_doc_gates` through *this session's* MCP server does **not** yet show
`enter-review`, because that server was spawned before the merge and holds its
own bundle. That is documented behaviour (release notes 0.3.0: "restart it after
updating. It holds the version it started with"), not a failure of the change —
but it does mean the tool-level demonstration is deferred to the next server
start, and the evidence above is from the merged code directly.

## 3. The AGENTS block

```
canonical == writer export : true
repo AGENTS.md carries it  : true
setup SKILL.md carries it  : true
body bytes                 : 2482
```

**Size, measured, and against my own prediction.** 2209 → **2482 bytes** (+273,
+47 words), 18 → 20 lines. **My plan predicted it would get shorter. It did not,
and the prediction was never plausible** — the change is one deletion and four
additions. A first draft cost +339; every addition was tightened and re-measured
to +273. The pre-registered fallback (drop the `board.yml` clause) was considered
and **declined**, because that clause is the strongest single reason to call
`get_doc_gates` and dropping it would still have left the block longer. Recorded
as a cost, not smoothed over: **this ticket makes the block bigger in every repo
that installs Kanmer.**

What it lost: the per-profile requirement table — an R1 violation that omitted
`fix` (the default profile) and `questions-resolved` entirely.

What it gained: `questions-resolved` and the literal `## Parked (explicitly
deferred)`; gates constrain `move_item` and nothing else; creation is ungated;
`board.yml`'s `profiles:` is not the effective set.

`git diff AGENTS.md` across the merge shows exactly two added bullets and one
replaced bullet, nothing else.

## 4. The Connect regression, fixed and verified in the built artifact

The bug: `apps/gui/src/main/agentsBlock.ts` held a stale **v2** body — seven
stages, `impact.md`, a deleted skill — and `connect.ts` imports it, so Connect
wrote that over the current block in every repo it touched. It did so to this
repository during this run.

Verified on the **built** Electron main, not just the source:

```
canonical body in apps/gui/out/main/index.js : 1 occurrence
stale v2 body in apps/gui/out/main/index.js  : 0 occurrences
```

The body now exists once, in `scripts/agents-block-body.mjs`. Two of the three
copies stopped being copies; the third (`kanmer-setup/SKILL.md`, prose that
cannot import) is asserted **by equality** rather than `includes()`.

## 5. `verify:skills` — validated against a tree that fails it

A check that only passes on the tree it was written for proves nothing, so the
evidence is the **pair** of runs, not the green one.

| tree | check 7 (no per-profile lists) | check 8 (invariants present) |
|---|---|---|
| `origin/main`, unfixed | **FAIL — 8 found** | board worktree **1/6**, one-boundary **2/7** |
| merged `main` | **PASS — 0 found** | **6/6** and **7/7** |

The 8 include the two SKILL-014's version could not see: the AGENTS block's own
per-profile table (its check only inspected lines naming a *boundary*, and that
line named none) and `kanmer-plan`'s "a `chore` asks for a plan and nothing else"
(its verb list was `needs|requires|owes`).

Check 8's before-numbers are the defect this ticket was filed about, measured:
"the board worktree is not yours" was in **1 of 12** skills and in **none** of the
four that run git.

Full run on merged main: `ALL CHECKS PASSED`, 8 checks, roster confirmed at 12 by
`ls` rather than assumed.

## 6. The rail, on merged main

| Check | Result |
|---|---|
| `npm test` | **exit 0** — core 240, GUI 258, scripts 41 |
| `npm run typecheck` | **exit 0** — `@kanmer/core`, `@kanmer/mcp-server`, `@kanmer/ui`, `@kanmer/gui` all named |
| **`npm run plugin:check`** | **PASS** — "29 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.2" |
| `npm run verify:agents-block` | **28/28** (was 26; +3, one tightened) |
| `npm run verify:skills` | **ALL CHECKS PASSED** |
| `npm run smoke:protocol` | **26/26** |
| `node packages/mcp-server/src/smoke.mjs` | **142/142** |
| `npm run check:manual` | PASS |
| `npm run build -w @kanmer/gui` | builds |

**`plugin:check` is the one that mattered here.** It could not run pre-merge —
MCP-007's guard refuses any linked worktree — so the committed bundle was built
in the worktree using MCP-010's recipe and its provenance evidenced by hand (513
embedded `../../node_modules`, zero `../../../../node_modules`, and the bundle
containing both this change and CORE-023's code). Its passing here, on the main
checkout with a fresh build, is the independent confirmation that the hand
evidence was right — this is precisely the assertion SKILL-011 shipped without.

## 7. In-flight tickets: nothing stranded

The operator's stop condition was that the gate change must not strand in-flight
tickets. Audited before merge:

| Ticket | Profile | Stage | Effect |
|---|---|---|---|
| GUI-073 | `fix` | implementing, checklist 0/14, no report | Needs a report before Review. Not stranded — work had not started, and `kanmer-execute` writes that report as a normal step. It merged independently as #55 during this ticket |
| MCP-011 | `fix` | verifying, report present | Unaffected — `verifying → done` does not cross `enter-review` |
| CORE-023 | `feature` | review | Unaffected |

The stop-and-report condition did not fire.

## What this run does NOT prove

- **The gate through the MCP tool surface.** Demonstrated through the merged
  code (§2) but not through `get_doc_gates`, because this session's server holds
  a pre-merge bundle. The next server start is the confirmation; the bundle it
  will load is the one `plugin:check` just verified.
- **That the AGENTS block reaches a repo on an older Kanmer.** The ticket's
  Verification box asks for setup run against such a repo end-to-end. What is
  proven is that the block is correct, that all three writers now emit the same
  bytes, and that `verify-agents-block` exercises insert/refresh/idempotence in a
  sandbox — not a real third-party repo upgrade.
- **That the prose is well written.** The mechanical property is enforced by a
  committed check validated against a failing tree. Whether the sentences read
  well is not something this run measures, and I wrote them.
- **`kanmerGit.test.ts` under load.** It timed out once on a concurrent run
  (GUI-085, pre-existing, four agents have confirmed it); green in isolation with
  `--testTimeout=30000` and green in every full run since. Not investigated here.

## Defects found during verify, filed rather than fixed

- **[[CORE-029]]** — `AGENTS.md` §4 still documents v2's **seven stages** and
  configurable gates, in the repo's hand-written prose *outside* the managed
  block. Found by a proof assertion scanning for v2 markers. Both SKILL-014's and
  this ticket's checks scope to `plugins/kanmer/skills/`, so neither ever looked
  at it — pointing check 2 at `AGENTS.md` is a one-line fix and is in the ticket.
- **[[CORE-028]]** — `origin/main` carries **two** ADR-0013s. The commit that
  renumbered a duplicate ADR-0012 and CORE-023 picked the same number in the same
  window. This ADR took **0014** rather than adding a third. Includes the
  three-line rail check that would have caught it, which could not ship here
  because it would have been red on arrival.
- **[[MCP-018]]** — `plugin:check`'s worktree guard tests the path rather than
  module resolution, and its stated premise is false for a worktree prepared with
  `npm install`. Second ticket to hit it.
