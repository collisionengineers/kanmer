# Research — SKILL-013: which hard rules belong in prose, and where they are missing

*The research. Not the files document — this is what I **learned**, not what I will **touch**.*

## Question

The ticket asks to carry "hard rules" into AGENTS.md and skill prose. FRD-023 R1
says skills must **derive** rules (call `get_doc_gates`) and never restate them.
Those two read as a contradiction. So:

1. Which class of rule is legitimate to state in prose, and which must never be?
2. Which of the twelve skills under-states a rule from the legitimate class?
3. What is the AGENTS.md managed block missing?

## The operator decision that binds this ticket

Recorded in `scratch/notes.md`, 2026-08-16, and quoted in full because it is
binding and it changes scope:

> `chore` → Done in one jump: **keep.** `spike`: **keep.** `fix`: **change** —
> a fix that opened a PR should not merge unreviewed. `feature`: unchanged.

The three consequences the operator attached, restated so they are not lost:

1. Giving `fix` an `enter-review` is a **profile change and needs its own ADR**.
2. It must reach existing boards — "editing `DEFAULT_PROFILES` alone reaches
   **new boards only**, because every board written by setup or migration
   carries its own `profiles:` block. The resolve-time injection in `board.ts`
   is the working precedent."
3. "**`collapsesPipeline` counts gated boundaries.** Giving `fix` an
   `enter-review` takes it from 2 gated boundaries to 3, which is the intended
   effect on implementing → done — but every other multi-stage `fix` move must
   be re-measured, not assumed."

And the instruction on evidence: "Measure the before and after on all four
profiles and put the table in `proof`, the way SKILL-012 did. An assertion here
is worth nothing."

This ticket therefore has **two** halves: the prose/AGENTS-block half it is
named for, and a profile change with its own ADR. See `open-questions` — whether
they ship together is the one thing I could not settle from the code.

## Findings

### 1. The rule SKILL-014 already shipped, found and quoted

The sibling ticket's verification script is **not committed** — SKILL-014's own
`proof` says so ("the verification script lives in a scratchpad and is not
committed"). It survives at
`C:\Users\PC\AppData\Local\Temp\claude\C--Users-PC-Documents-GitHub-kanmer\33647913-f142-4e23-a6f7-d5729b9ba896\scratchpad\verify-skill-014.mjs`.
Its check 7 is the derive-vs-restate discriminator, in its own words
(lines 113–125):

```js
// A gate rule is a per-PROFILE requirement list. Boundary names alone are not:
// structural invariants and the ADR-0011 parse rule are legitimate.
const boundaryHits = hits(/leave-backlog|leave-preparing|enter-review|enter-done/);
const profileRule = boundaryHits.filter((h) =>
  /(feature|chore|spike|fix)\b[^.]*\b(needs|requires|owes)\b/i.test(h.text),
);
```

**Reuse this rule rather than inventing one.** It is the shipped, merged answer
(`fc52cba`), and SKILL-014's proof records it passing 5 boundary mentions / 0
requirement lists, improved from 8 before the change.

### 2. The principle behind it, stated so it generalises

Check 7 encodes a distinction it does not name. The naming matters, because this
ticket is about to add prose and needs a test it can apply to a sentence:

> **A rule may be stated in prose iff its truth-value is independent of board
> configuration.**

- **Structural invariants** — properties of the *engine*. True on every board no
  matter how anyone edits `profiles:`. `collapsesPipeline` counts gated
  boundaries whatever they are; `GATE_EXEMPT_DIRS` is a frozen constant; the six
  stages are fixed (ADR-0002); `## Parked (explicitly deferred)` is a literal the
  parser matches. Legitimate — and for several of them prose is the *only* place
  they can live, because no tool reports them (table in finding 4).
- **Configuration-dependent facts** — which requirements a profile carries,
  which boundaries it declares. These are read out of `board.yml` at runtime.
  `get_doc_gates` exists to answer exactly these, and prose must not.

### 3. The proof that per-profile lists cannot be restated is in this repo's own board.yml

The strongest evidence is not an argument, it is a file.
`.worktrees/kanmer/.kanmer/data/board.yml:30-57` carries a `profiles:` block —
and `questions-resolved` **appears nowhere in it**:

```yaml
profiles:
  feature:
    leave-preparing: [research, files, plan, checklist]
    enter-review:    [post-implementation-report]
    enter-done:      [proof]
```

Yet `get_doc_gates SKILL-013` reports `questions-resolved` at all three
boundaries. The difference is `resolveProfiles` in `packages/core/src/board.ts:85-106`,
which injects it at **read time**. Its own comment states the trade-off
(`board.ts:60-62`):

> "`board.yml` no longer lists every effective requirement."

So the canonical configuration file on disk is *already* a stale restatement of
the effective requirements, corrected only by the resolver. If `board.yml`
cannot be trusted as a statement of what a profile requires, prose in a skill —
which is an install-time copy, on-demand, and permission-gated (ADR-0009) —
certainly cannot. This is the argument for R1 that FRD-023 asserts and never
demonstrates.

### 4. Which invariants a tool actually reports — and which only prose can carry

This is the table that decides what the AGENTS block owes. Measured from a live
`get_doc_gates` call with and without an `id`.

| Structural invariant | Reported by a tool? |
|---|---|
| The legal doc types | **Yes** — `get_doc_gates().docTypes` |
| `reference/` `scratch/` `assets/` never gate | **Yes** — `get_doc_gates().gateExemptFolders` |
| The six stages and their meanings | **Yes** — `get_doc_gates().stages`, `list_board` |
| A move crosses at most one gated boundary | **Only in `move_item`'s description** (tier 2). `get_doc_gates(id).reachable` implies it; nothing states it |
| Stages are *fixed* — a board cannot change them | Only `add_column`'s description |
| `questions-resolved` counts unticked `- [ ]` above `## Parked (explicitly deferred)` | **No.** The literal heading string is reported by nothing |
| Proof is written on merged `main`, not the branch | **No** |
| The board worktree `.worktrees/kanmer` / board branch is not yours to switch or push | **No** |
| `gh pr merge` is outside the gate engine; gates constrain `move_item` and nothing else | **No** |
| Creation into any stage is ungated | **No** |
| `board.yml`'s `profiles:` block is not the effective requirement set | **No** — lives only in a comment in `board.ts` |

The bottom six rows are the "hard rules" this ticket exists to carry. Every one
of them is a rule **no tool reports**, which is precisely why stating them is
not a violation of R1 — R1 forbids restating what a tool answers.

### 5. The AGENTS block is inside the skills tree, so R1 governs it

`BLOCK_BODY` exists in exactly two places, kept byte-identical by hand:

- `scripts/agents-block.mjs:21-38` (the literal)
- `plugins/kanmer/skills/kanmer-setup/SKILL.md:146-165` (the fenced copy)

`scripts/verify-agents-block.mjs:145-154` asserts they match. Because the second
copy lives **under `plugins/kanmer/skills/`**, anything written into the AGENTS
block is automatically also skill prose. The block is not exempt from R1; it is
subject to R1 through the duplication. That is worth recording as a finding in
its own right, and it is the reason the next finding is a defect rather than a
nitpick.

Two weaknesses in the byte-equality check, both real:

- It is `skill.includes(BLOCK_BODY)` — a **substring** test, not equality of the
  fenced region. Extra text inside the fence passes.
- Nothing asserts that the repo's own `AGENTS.md` carries the current body. The
  script only compares the two *sources*. It happens to be current today
  (checked), by hand.

### 6. The block violates R1 — and the violation is already stale

`kanmer-setup/SKILL.md:156` / `agents-block.mjs:30`:

> "A `feature` owes research, files, plan, checklist, a report and proof; a
> `chore` owes a plan and proof; a `spike` may owe only research."

This is a per-profile requirement list — the exact thing R1 forbids — sitting in
the tier-3 surface that ADR-0009 says is "always in context". Four problems,
in ascending order of seriousness:

1. **`fix` is missing.** `defaultProfile: fix` (`board.yml:58`,
   `DEFAULT_PROFILE_ID` in `profiles.ts:157`). The block's only per-profile list
   omits the profile most tickets actually get.
2. **`questions-resolved` is missing from every entry.** SKILL-012 shipped it at
   three boundaries on all four profiles. The block predates it and was never
   updated — which is the ticket's own Why, demonstrated on the ticket's own
   subject matter.
3. **It escapes SKILL-014's check 7 entirely.** Check 7 only inspects lines that
   name a boundary (`leave-backlog|leave-preparing|enter-review|enter-done`).
   Line 156 names no boundary, so it is never even a candidate. The most
   complete per-profile requirement table in the tree is invisible to the check
   built to find per-profile requirement tables.
4. **It ships to every repo.** It is the one surface reconciliation writes into
   someone else's codebase.

### 7. Check 7 has a second hole: the verb list

`profileRule` matches `needs|requires|owes`. Real prose in the roster uses other
verbs. Every per-profile statement now in the skills tree, and whether check 7
can see it:

| Site | Text | Seen by check 7? |
|---|---|---|
| `kanmer-setup/SKILL.md:156` | "a `feature` **owes** research, files, plan…" | **No** — no boundary on the line |
| `kanmer-auto/SKILL.md:35-36` | "a `spike` may **reach Done on research alone**; a `chore` **skips** Backlog→Preparing" | **No** — verb not matched |
| `kanmer-plan/SKILL.md:11-12` | "a `chore` **asks for** a plan and nothing else; a `spike` may **ask for** no plan" | **No** — verb not matched |
| `kanmer-research/SKILL.md:14-15` | "a `spike` may **need** only research, a `chore` only a plan" | **No** — no boundary on the line |
| `kanmer-tickets/SKILL.md:106` | "a `spike` may **finish at** research" | **No** |
| `kanmer-tickets/assets/ticket-template.md:11` | "a two-line fix filed as a `feature` **owes** six documents" | **No** |

Six sites, zero caught. Check 7 reports "0 requirement lists" and is telling the
truth about what it measures; what it measures is narrower than R1.

**One of the six is now measurably wrong.** `kanmer-plan/SKILL.md:11-12` —
"a `chore` asks for a plan and nothing else". Against `get_doc_gates`, `chore`
carries `leave-preparing: [plan, questions-resolved]` and
`enter-done: [proof, questions-resolved]`. "Nothing else" is false three ways.
This is the same failure mode as `kanmer-review:48`, which SKILL-014 corrected:
a restated rule does not stay true.

The other five are *illustrative* — each sits immediately beside "ask
`get_doc_gates`" and exists to motivate the call rather than replace it. That is
a defensible category, but it needs stating as a rule rather than being an
accident, because it is what distinguishes them from site 1.

### 8. Per-skill gap list — which hard rule each of the twelve under-states

Measured by grep across `plugins/kanmer/skills/**/*.md`, then read in context.
Ordered by consequence.

| Skill | The hard rule it under-states | Why it bites here |
|---|---|---|
| **kanmer-closeout** | The board worktree is not yours | Runs `git worktree remove`, `git worktree prune`, `git branch -d/-D`, `git push origin --delete`, and (edge-case table row 11) `rm -rf` of a leftover directory. Its 11-row edge-case table has **no row** for `.worktrees/kanmer`. Highest blast radius in the roster |
| **kanmer-verify** | The board worktree is not yours | Step 2 is literally "**Check out merged `main`** (not the feature branch) and pull". In a GUI-set-up repo the board sits in a worktree on the board branch; a bare checkout is the operation the invariant forbids. The only skill that instructs a checkout of main, and it is 32 lines with no worktree caveat at all |
| **kanmer-execute** | The board worktree is not yours | Runs `git worktree add .worktrees/<id>`, `cd .worktrees/<id>`, `git push -u origin`. Names `.worktrees/` five times and never distinguishes the board's. Also silent on one-gated-boundary despite `move_item` at step 4 |
| **kanmer-auto** | The board worktree is not yours | Drives execute + closeout in ~3 parallel lanes, each doing git surgery. Correctly states one-gated-boundary (`:38-41`) — the best statement of it in the roster |
| **kanmer-groom** | A move crosses at most one gated boundary | Its whole job includes bulk-repairing "off-board statuses" via `move_item`. The rule that will refuse those repairs is the one rule it does not state |
| **kanmer-review** | A move crosses at most one gated boundary | Does `move_item verifying`. Otherwise the **strongest** hard-rule prose in the roster: `:59-75` states merge-is-outside-the-engine, "gates constrain `move_item` and nothing else", and `enter-done` holding universally — SKILL-014's correction. Use it as the model |
| **kanmer-research** | A move crosses at most one gated boundary | Does `move_item preparing`. States documents-are-folders (`:47-50`), gate-exempt dirs (`:50`), and the `questions-resolved` parse rule with the `## Parked` heading (`:52-56`) — three invariants, well done |
| **kanmer-tickets** | A move crosses at most one gated boundary | It is the router and holds the tool reference. `references/tool-reference.md:30` carries the rule in the `move_item` row; `SKILL.md` itself does not. States archive-don't-delete properly (`:69-72`) |
| **kanmer-plan** | — (states one-gated-boundary at `:55`, `## Parked` at `:53`) | Its gap is the **wrong** per-profile claim at `:11-12`, not a missing invariant |
| **kanmer-setup** | — (the only skill stating the board-worktree rule, at `:20-22` and in the block at `:150-153`) | Its gap is the per-profile table at `:156` |
| **kanmer-docs** | none of consequence | Moves nothing; correctly uses the no-id `get_doc_gates` for the board model, and `assets/doc-structure.md:28` defers per-profile detail |
| **kanmer-report** | none of consequence | Read-only by design. Minor: flags "doc-gate debt" (`:45`) without pointing at the no-id `get_doc_gates` |

**The two invariants with the worst coverage:**

- *"A move crosses at most one gated boundary"* — stated in **3 of 12** skills
  (auto `:38`, plan `:55`, setup's block `:157`) plus `tool-reference.md:30`.
  Nine skills do not state it, including four that call `move_item`.
- *"The board worktree/branch is not yours to switch or push"* — stated in
  **1 of 12** (kanmer-setup), and absent from all four skills that actually run
  git: execute, review, verify, closeout.

### 9. What the AGENTS.md managed block is missing

Against `agents-block.mjs:21-38` as it stands today (and the repo's own
`AGENTS.md`, which currently carries it verbatim):

**Present and correct** — the board-worktree rule (opening paragraph, the
block's best line), one-gated-boundary, documents-are-folders + group
`context.md`, ticket worktree/branch convention, `append_scratch` never gated,
proof on merged `main`, archive-don't-delete, the skill route, and the
"each skill ends by naming what comes next" line SKILL-014 added.

**Missing:**

1. **`questions-resolved`, entirely.** The block contains no mention of open
   questions, the one-`- [ ]`-per-question convention, or the literal
   `## Parked (explicitly deferred)` heading. This is the ticket's stated Why —
   a real gate that no existing repo's AGENTS.md mentions — and the heading
   string is one of the invariants **no tool reports** (finding 4). It fires at
   three boundaries on every profile including `spike`.
2. **Gates constrain `move_item` and nothing else.** The correction SKILL-014
   made in `kanmer-review` never reached tier 3: `gh pr merge` is outside the
   gate engine, so a ticket with an unticked question has a perfectly mergeable
   PR on every profile. The block says "proof is written after the merge"
   without saying the merge is unguarded.
3. **`board.yml`'s `profiles:` block is not the effective requirement set.**
   Finding 3. An agent that reads `board.yml` to answer "what does this profile
   need" gets a stale answer, and `board.ts:60-62` is the only place that says
   so. This is the strongest single reason to call `get_doc_gates`, and the
   block currently gives the instruction without the reason.
4. **The per-profile list at line 30 must go**, not be extended (findings 6–7).
   Replacing it with "call `get_doc_gates <id>` — the profile table in
   `board.yml` is not the effective one" is shorter *and* more correct.
5. **Creation into any stage is ungated.** Relevant to backfill and to groom;
   stated nowhere.
6. **The Review-skipping consequence** the ticket body measures — that on
   `chore` and `spike` (and today `fix`) a ticket can go implementing → done —
   is a direct corollary of the one-gated-boundary rule already in the block, and
   after the operator's decision it changes for `fix`. Whether it belongs in the
   block is in `open-questions`; it is arguably configuration-dependent.

### 10. ADR-0011 does not state the two limits its implementation found

Confirmed by reading it: ADR-0011's Consequences section has six bullets and
neither limit is among them. Both live only in the `resolveProfiles` doc comment
at `packages/core/src/board.ts:64-81`, which states them well:

- "**Never `leave-backlog`.** Questions are raised *during* research…"
- "**Only boundaries the profile already declares.** … `collapsesPipeline`
  counts gated boundaries: giving `spike` a gated `leave-preparing` and
  `enter-review` would turn its Backlog → Done jump from one gated boundary into
  three and refuse it, breaking the acceptance case FRD-002 exists to protect."

That comment also records a consequence the ticket does not mention and the ADR
should: "`fix` and `chore` declare no `enter-review`, so a question raised during
implementation is caught at `enter-done` rather than at review." The operator's
decision to give `fix` an `enter-review` **partly closes that gap**, and the ADR
amendment and the profile change are therefore the same edit.

### 11. A live demonstration of the install-staleness problem, worth one line

`.claude/skills/` is byte-identical to `plugins/kanmer/skills/` today (`diff -rq`)
**except** it carries an extra `run-kanmer/` directory that does not exist in
source. The installer only ever adds; it never prunes. Exactly the defect
[[CORE-023]] owns, still visible on this machine.

## Implications

- **The tension dissolves once "hard rule" is defined.** It means *structural
  invariant* — a property of the engine, true on every board — not *requirement
  list*. This ticket adds the former and should **delete** the one instance of
  the latter that ships in the AGENTS block. Net effect on R1: it improves,
  exactly as SKILL-014's did.
- **Reuse SKILL-014's check 7, but fix its two holes** (drop the boundary-name
  precondition; widen the verb list to at least `owes|needs|requires|asks for|
  skips|may reach|may finish|only`). Both holes are demonstrated above with live
  hits, so the widened check has a known expected result: 6 sites, of which
  5 are illustrative-and-adjacent-to-`get_doc_gates` and 1 (`kanmer-plan:11-12`)
  is wrong and must be corrected. Whether the check should permit the
  illustrative class is a scope decision, in `open-questions`.
- **The script must be committed this time.** SKILL-014's proof lists "the
  verification script is not committed" as a known weakness, and this ticket
  cannot claim to carry rules into prose using a check that lives in a
  scratchpad. `scripts/verify-agents-block.mjs` is the shape and the precedent.
- **The block edit is a two-file edit, always.** `agents-block.mjs:21-38` and
  `kanmer-setup/SKILL.md:146-165`, byte-identical or `verify:agents-block`
  fails. The block is *inside* the skills tree, so a per-profile list added
  there is a per-profile list added to a skill.
- **The block should get shorter, not longer.** It ships into every repo. The
  proposed edit is roughly net-neutral: −1 long per-profile sentence, +1 short
  open-questions line, +1 clause on the merge, +1 clause on `board.yml`.
- **This ticket has two halves and they are coupled.** The prose half is
  read-only-ish and safe. The `fix`-gains-`enter-review` half is a profile change
  needing its own ADR, resolve-time injection (the `resolveProfiles` precedent),
  and a measured four-profile before/after table in `proof`. Whether they ship in
  one PR is the first open question.

## Open questions

Recorded in `open-questions`. **Two need the operator** and are flagged there.
