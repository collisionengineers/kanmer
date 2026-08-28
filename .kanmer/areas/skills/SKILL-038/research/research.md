# Research — SKILL-038: in-roster blocked dependents, a mis-pinned check, and an unbounded transient budget

*The research. Not the files document — this is what I **learned**, not what I will **touch**.*

## Question

Three questions, in the ticket's own order:

1. Can `kanmer-auto` distinguish a blocker **inside** its frozen roster from one
   **outside** it without any `packages/` change?
2. What exactly does check 19's "…and board **health**" clause pin today, and
   what would pin the named clause instead (N-1)?
3. Where does a numeric bound on `transient` verification re-runs belong, and
   what does "blocks with the exact refusal" mean when no server enforces it
   (F-005)?

## Findings

### The defect is exactly as the ticket describes, and it is board-wide

- `computeBlockedIds` (`packages/core/src/links.ts:61-72`, read at
  `origin/main` 70d23efd) marks a target blocked whenever **any** non-archived
  item declaring `blocks: [target]` is not at the last stage. The blocker's
  membership in anything is never consulted:

  ```ts
  for (const item of items) {
    if (item.archived) continue;
    for (const target of item.blocks ?? []) {
      if (item.status !== lastStageId) blocked.add(target);
    }
  }
  ```

- `blockedSet()` (`packages/mcp-server/src/index.ts:411-415`) hands it
  `store.listItems({ includeArchived: true })` — the whole board — and its own
  comment says so: *"Which item ids are currently blocked (live blocker, per the
  whole board)."* So `list_items`' `blocked: true` is a **board-wide** fact and
  carries no information about the run.
- The contradiction is real in the shipped prose. `kanmer-auto/SKILL.md` §1
  step 2 (at 70d23efd) reads "Drop archived or blocked tickets, and drop **quick
  captures** …", while §2 "Lane assignment" reads "a `blocks` edge orders the
  blocker before its dependent regardless of file disjointness". Step 2 runs
  **before** the freeze, so §2's ordering rule can never fire for a roster that
  contains both.
- Live confirmation on this board: `SKILL-036` carries `blocks: ["CORE-119"]`
  and is not at the last stage, so `get_item CORE-119` reports `blocked: true`
  today. This ticket (`SKILL-038`) now blocks `CORE-119` too.

### The controller already has every read it needs — no `packages/` change

- `get_links` returns a derived `blockedBy` array (`links.ts:44-51`,
  `getLinkGraph` at `links.ts:74-78`): every item whose `blocks[]` names this id.
  I confirmed the shape live — `get_links SKILL-038` returned
  `blocks: [CORE-119]`, `blockedBy: []`.
- **Important precision:** `buildLinkIndex`'s `blockedBy` is **not** filtered by
  liveness — it lists every declaring item, archived or Done included. Only
  `computeBlockedIds` applies the "not archived, not at the last stage" filter.
  So a controller that reads `blockedBy` must judge liveness itself, from each
  blocker's own `archived`/`status`, which it already has for roster members
  from `list_items` and can get for a non-member with one `get_item`.
- Therefore the whole fix is reachable from `list_items` + `get_links` +
  `get_item`, all read-only, all existing. **No `packages/core` or
  `packages/mcp-server` change is required**, which matters because the
  CORE-132 lane is editing both right now.

### N-1: what the "board health" clause actually pins

- Check 19's entry `"kanmer-auto preflights identity, delivery target and board
  health"` (`scripts/verify-skill-prose.mjs:617-624`) pins its board-health half
  with `/get_status\.boardWorktree/` alone.
- That pattern is satisfied elsewhere in the same file: the "Push the board
  before trusting a gate" section contains
  `get_status.boardWorktree.expectedBranch`, and check 19's *own* gate check
  asserts that string is present. So the preflight's entire
  `- **Board worktree.**` bullet can be deleted and check 19 stays green — the
  named guarantee is unenforced. I confirmed the string appears in both places
  by reading the skill at 70d23efd.
- A regex anchored on the bullet's own opening —
  `- **Board worktree.** \`get_status.boardWorktree\` must be healthy and on its board branch` —
  appears nowhere else in the tree, so it pins the clause the check is named
  for. Note the neighbouring §2 sentence "…is never a lane, rebase target, or
  cleanup target" is *similar* to the bullet's "never a lane, a rebase target, a
  cleanup target, or a working directory" but not identical, so a regex over
  that phrase alone would be a weaker, absorbable anchor.

### F-005: the transient budget, and what "the exact refusal" can mean here

- FRD-034 Behaviour already requires the run to record a **"retry budget"**
  ("creates or resumes a durable run that records project, authority, fixed
  initial roster and retry budget"), and AC5 requires budgets that "stop
  repeated unchanged audits". The run record does not record one today:
  `run-state-template.md` frontmatter has `lane_limit` and `stop_reason` and no
  retry counter, and its ledger has `Attempt` and `Replan` columns and no
  transient counter.
- `kanmer-verify/SKILL.md` bounds `transient` only by judgement — *"`transient`
  is a conclusion you earn, never one you assert"* plus three evidence
  obligations — and its routing table says `transient` "stays in Verifying …
  rerun the failed check". Nothing counts the re-runs.
- `kanmer-auto/SKILL.md` §3 routes the same class ("`transient` reruns in
  Verifying") and §9 forbids automatic retry of failed verification commands but
  says nothing about how many controller-dispatched re-runs a `transient`
  classification may buy.
- There is **no server refusal code** for this, unlike
  `REMEDIATION_BUDGET_EXHAUSTED`, which `move_item` genuinely returns. So
  "blocks with the exact refusal" here has to mean a refusal **this skill
  defines and the controller must quote verbatim**, not a tool error — and the
  prose must say that plainly, or a later reader will look for a server code
  that does not exist. Adding a server code would be a `packages/` change and is
  out of scope.
- The bound belongs to the **controller**, not the verifier: the ticket requires
  it "recorded in the run record", and the run record is `kanmer-auto`'s
  (`automation/runs/<run-id>.md`). The verifier does not own a per-run counter.
  Existing stop predicate 15 ("an operator target, time, budget, or cancellation
  boundary") already covers the resulting stop, so no new predicate is needed —
  which is fortunate, because `## 4. Mandatory stop predicates` must stay
  byte-identical.

### The standard the enforcement must meet

- Check 19 today has **31** assertions: 14 `goalContract` entries, 5
  `scopeResolution` scopes, the freeze check, the schema-2 check, 4 run-state
  template fields, the Selection-contract/replan check, 2 template schema
  stamps, the current-run pointer check, and 2 `forbiddenGoalClaims`.
- `scripts/verify-skill-prose.test.mjs` has **28** tests. The SKILL-036
  remediation established the pattern I must follow: `goalFixture()` copies the
  real skills tree to a temp dir, `edit()` asserts its anchor exists before
  replacing, and `expectFail`/`expectPass` assert on `FAIL  <name>` /
  `PASS  <name>` lines — so anti-absorption is testable directly.
- `check()` prints `PASS  <name>` / `FAIL  <name>` with two spaces
  (`verify-skill-prose.mjs:34-37`), which is what those helpers match.
- `verify:skills` is `node scripts/verify-skill-prose.mjs` (package.json:29) and
  needs no build or install — it only reads `plugins/kanmer/skills`,
  `AGENTS.md`, `packages/core/src/profiles.ts` and `docs/manual/greenfield.md`.

### Constraints that shape the edit

- `## 4. Mandatory stop predicates` is 1877 bytes, sha256
  `03796a0e22ae67a371b1ddb58bbccdf4f08b3d5d9442eb47f59a27c6e9e19b38` (verified
  locally at 70d23efd). Sections `## 1.`–`## 11.` must keep their numbering.
- Check 19's `forbiddenGoalClaims` regexes use `[^.]*` spans, so any new prose
  containing "budget", "spent"/"exhausted" and "replan" without an intervening
  period would trip them. New wording must be written around that.
- Check 14 pins several `[\s\S]*`-spanning sequences over §3/§5/§6/§8/§9;
  inserting a new subsection between them is safe, reordering is not.
- `EXPECTED_SKILLS` is 12 and the `failure_class` set is exactly four — neither
  changes here.

## Implications

- **Skills-only fix, confirmed.** The distinction the ticket asks for is a
  controller decision made from reads it already performs. Nothing in
  `packages/` is touched, so the CORE-132 lane is not contended.
- **Step 2 must stop treating `blocked: true` as a verdict.** The correct rule:
  read the flag, then resolve each blocker through `get_links.blockedBy`, judge
  each blocker's liveness from its own `archived`/`status`, and split on
  membership of the roster being frozen. In-roster ⇒ retain as queued work
  ordered by §2; out-of-roster ⇒ exclude with the blocking ids reported.
- **Each clause needs its own named check.** Three separate facts are being
  claimed (the flag is board-wide; in-roster dependents are retained and
  ordered; out-of-roster blockers still exclude), and folding them into one
  assertion would reproduce exactly the absorption failure that returned
  SKILL-036 `needs-changes`. A fourth, negative, check should catch any
  reinstatement of the "Drop archived or blocked tickets" wording.
- **N-1 is a regex repair plus a mutation**, not new prose: the clause already
  exists, only its pin is wrong.
- **F-005 is new prose in `kanmer-auto`, a new run-record field, and a new
  ledger column**, with the refusal text stated verbatim in the skill so a
  check can pin it.

## Open questions

None blocking — see `open-questions` for the one parked operator choice (the
default value of the transient bound) and its implemented default.
