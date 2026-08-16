# Plan — SKILL-013: hard rules into prose, and `fix` gains `enter-review`

*The plan. Built from `research` and `files`, and from the two answers in
`scratch/operator-answers.md`, which are binding.*

## The two answers this plan is built on

- **Q1 — one PR.** The operator declined the split. Prose and the gate change
  ship together, so **the migration risk is this ticket's to handle**: the ADR is
  written here, existing boards are reached by resolve-time injection, the proof
  carries a measured four-profile table, and the in-flight `fix` case is stated
  explicitly.
- **Q2 — mechanism only.** The AGENTS block states that boundaries exist, that a
  move crosses at most one, and that gates constrain `move_item` — and points at
  `get_doc_gates` for the values. **The per-profile table at `agents-block.mjs:30`
  is deleted, not extended.**

## The rule that governs every prose edit

> **A rule may be stated in prose iff its truth-value is independent of board
> configuration.**

Derived in `research` finding 2. Every sentence this plan adds is checked
against it. Concretely: **structural invariants in, per-profile requirement
lists out.** `get_doc_gates` is the only authority on the latter.

## Chosen approach

### Part 1 — the gate change

`fix` gains `enter-review: ["post-implementation-report"]`, in **two** places,
because one alone is the SKILL-012 bug repeating:

1. `DEFAULT_PROFILES.fix` in `profiles.ts` — reaches **new boards only**.
2. A resolve-time injection in `board.ts` `resolveProfiles` — reaches **every
   existing board**, whose `board.yml` carries its own frozen `profiles:` block.

**Why injection and not a `board.yml` migration** (the alternative): migration
would rewrite the user's configuration file, and `resolveProfiles` is already the
seam where board config meets shipped defaults. It is the mechanism
`questions-resolved` used and the operator named it as the precedent. The cost is
the one `board.ts:60-62` already records — `board.yml` no longer lists every
effective requirement — which this ticket now also states in the AGENTS block, so
the cost is documented where agents will see it rather than only in a comment.

**The shape of the injection matters, and differs from `questions-resolved`'s.**
`resolveProfiles` currently injects **only into boundaries a profile already
declares** — that is ADR-0011's second limit, and it exists precisely so a
profile's gated-boundary count does not change. This injection **deliberately
adds a boundary `fix` does not declare**. That is the whole point, and it is
exactly what ADR-0011's second limit forbids doing *accidentally*. So:

- the two injections stay **separate functions with separate rules**, not one
  generalised mechanism — generalising is how the limit gets broken by the next
  person;
- the new one is **scoped to `fix` and to `enter-review` alone**, keyed off the
  profile id, and is a no-op when the board already declares an `enter-review`
  for `fix` (an operator who has customised it keeps their version);
- ordering: the `enter-review` boundary must be added **before**
  `questions-resolved` is injected, so the new boundary also inherits
  `questions-resolved` — otherwise `fix` gets a review gate that does not check
  questions, which is the gap `board.ts:76-78` records and the operator's
  decision partly closes.

**`collapsesPipeline` counts gated boundaries**, so this changes which
multi-stage `fix` moves are legal. Every one is **re-measured**, not reasoned
about (operator's instruction). See "How proof is produced".

**In-flight `fix` tickets.** Stated here and in the ADR and the release notes: a
`fix` sitting in `implementing` with no `post-implementation-report` **cannot
move to `review` or beyond** the moment the new boundary appears. It is not
stranded — the escape is to write the report, which is one `set_ticket_doc` call,
and the refusal names it. It is strictly narrower than ADR-0011's
`questions-resolved` hazard, which could block a ticket in *Preparing*. A `fix`
in `implementing` that has *already merged its PR* is the awkward case: it must
still write the report before Done. That is the intended behaviour — the
operator's words are "a fix that opened a PR should not merge unreviewed" — but
it is a real cost and the release notes must say so.

### Part 2 — the prose

**The AGENTS block** (`agents-block.mjs` + `kanmer-setup/SKILL.md`, byte-identical
or `verify:agents-block` fails):

- **DELETE** the per-profile clause at `:30`. R1 violation, omits `fix` (the
  default profile), omits `questions-resolved`, and this ticket's own gate change
  would make it wrong again.
- **ADD** `questions-resolved` and the literal `## Parked (explicitly deferred)`
  heading — a gate no tool reports the parse rule for.
- **ADD** that gates constrain `move_item` and nothing else; `gh pr merge` is
  outside the engine.
- **ADD** that `board.yml`'s `profiles:` block is not the effective requirement
  set — as a clause on the existing `get_doc_gates` bullet, not a new bullet.
- **ADD** that creation is ungated.

Net effect: **~~the block gets shorter~~ — WRONG, see "Correction to Part 2" at
the end of this document.** Measured, it gets longer (+273 bytes). The size is
measured in proof, not asserted; SKILL-014's binding precedent is that the
block's size is a cost every repo pays.

**The three-copy problem**, now a live bug: `apps/gui/src/main/agentsBlock.ts:11-24`
holds a **stale v2** body (seven stages, `impact.md`, the deleted `-import`
skill), and `connect.ts:18` imports it. During this run Connect overwrote this
repo's own `AGENTS.md` with it. **Fixed here**, because this ticket owns deciding
what the canonical body is: `agentsBlock.ts` stops declaring its own body and
re-exports the canonical one. Two of three copies stop being independent.

*Mechanism:* `scripts/agents-block.mjs` is ESM and dependency-free, and
electron-vite bundles the Electron main, so `agentsBlock.ts` can import
`BLOCK_BODY` from it directly across the workspace boundary rather than
duplicating it. If that import proves unbuildable in the Electron main config,
the fallback is a generated-and-checked constant with a rail assertion — but the
import is tried first, because a check that a copy matches is what already
failed here. **`verify:agents-block` gains a check on this copy either way**, so
the third copy can never silently drift again. CORE-023 keeps detection.

**Per-skill prose.** Two invariants, added where they bite, in the wording the
roster already uses (`kanmer-auto:38` for one-gated-boundary, `kanmer-setup:20-22`
for the board worktree) — a third phrasing is a third thing to go stale:

- *board worktree is not yours* → **closeout** (highest blast radius: `worktree
  remove`, `prune`, `branch -d/-D`, `push --delete`, `rm -rf`, and an 11-row
  edge-case table with no `.worktrees/kanmer` row — that row is added),
  **verify** (its step 2 is the roster's only checkout-of-main), **execute**,
  **auto**, **review**, **research**, **tickets**, **groom**.
- *one gated boundary* → **groom**, **review**, **research**, **tickets**,
  **execute**.
- **Fix `kanmer-plan:11-12`** — "a `chore` asks for a plan and nothing else" is
  measurably false three ways. Replace with a `get_doc_gates` pointer.
- Leave `kanmer-auto:38-41` and `kanmer-review:59-75` alone — the files document
  names both as models.

### Part 3 — the check, committed this time

`scripts/verify-skill-prose.mjs`, wired as `npm run verify:skills`. It is
**SKILL-014's seven checks ported, not a new check invented** — the operator was
explicit. Check 7 is widened at its two measured holes:

1. drop the boundary-name precondition (so `kanmer-setup:156` becomes a
   candidate at all);
2. widen the verb list beyond `needs|requires|owes` to the verbs real prose uses:
   `asks for`, `may reach`, `skips`, `may finish`, `owes`, `only`.

**The illustrative carve-out, settled here** (it was an open question and it
decides how many files the sweep touches): a per-profile mention is **permitted**
iff it names **one** profile as an example **and** the same line or its
neighbours name `get_doc_gates`. A **list** of profiles-to-requirements is
forbidden. That is mechanizable — count distinct profile names on the line,
require `get_doc_gates` within N lines — and it is what the surviving prose
already does by accident. It is also the rule that makes the AGENTS block's
deleted table a violation and `kanmer-research:14-15` not one.

Check 6 asserts exactly 12 skills. SKILL-018 did not change the count; **verified
by `ls`, not assumed**.

Also: `verify-agents-block.mjs` tightens `skill.includes(BLOCK_BODY)` to equality
of the fenced region, and gains a check that the repo's own `AGENTS.md` carries
the current body — nothing asserts that today, and the Connect regression is what
happens when nothing does.

### Part 4 — the governing docs

- **ADR-0013 (new)** — `fix` gains `enter-review`. The operator's decision, its
  mechanism, the four-profile measurement, and the in-flight `fix` consequence.
- **ADR-0011 amended** — the two limits its own implementation has, which live
  only in `board.ts:64-81`: never gate `leave-backlog`; never add a boundary a
  profile did not declare (and the note that ADR-0013 does exactly that,
  deliberately and narrowly, which is why the limit is stated rather than
  assumed). `board.ts` then cites the ADR instead of being the only home.

## Governing docs

`refs`: FRD-023, FRD-013, ADR-0009, ADR-0011 — plus **ADR-0013, new here**.

| Doc | How this plan meets it |
|---|---|
| **FRD-023 R1** (skills derive, never restate) | Improves it. One per-profile requirement list is **deleted** from the tier-3 surface; the widened check makes the class detectable for the first time. Every added sentence is a structural invariant — configuration-independent by the rule above |
| **FRD-023 R3** (skills change by a handful of lines) | Each skill gains one or two sentences in the roster's existing wording. No skill is rewritten. `kanmer-auto` and `kanmer-review`'s model paragraphs are untouched |
| **FRD-023 R5** (a rail check for skill prose) | `verify:skills`, committed and wired — the thing SKILL-014 could not claim |
| **FRD-013** (setup is reconciliation) | The block is what reconciliation writes into someone else's repo; this makes its content correct and its third copy non-independent |
| **ADR-0009** (skills are not the contract) | Respected exactly: tier 3 carries mechanism, the tool carries values. Q2's answer *is* ADR-0009 applied |
| **ADR-0011** | **Amended here**, with explicit authorization — the ticket body asks for it by name. The amendment adds limits the implementation already has; it reverses nothing |
| **ADR-0013** | **Written here.** A profile change needs its own ADR — the ticket body, the operator's note and `kanmer-plan` step 3 all say so |

## How proof is produced

1. **The four-profile before/after table, measured.** A script that constructs a
   ticket with every document present and asks the real gate engine — the same
   shape SKILL-012 used — for **every** multi-stage move on all four profiles,
   run once before the change and once after, on the **same** harness. Both
   halves in `proof`. The `fix` row must show `implementing → done` flipping
   ALLOWED → REFUSED and must show which other `fix` moves changed, because the
   operator's instruction is that every one is re-measured.
2. **Existing-board reach demonstrated**, not asserted: `get_doc_gates` against a
   real `fix` ticket on this repo's own board — whose `board.yml` predates the
   change — showing `enter-review` present. That is the SKILL-012 lesson.
3. **AGENTS block before/after**, with a byte count, and `git diff AGENTS.md`
   showing only the intended change.
4. **`verify:skills` output in full** — it is the evidence, there being no test
   that asserts prose.
5. The rail: `npm test`, `npm run typecheck`, `npm run plugin:check`,
   `npm run verify:agents-block`, `npm run smoke:protocol`.

## Risks

| Risk | Mitigation |
|---|---|
| **The gate change strands in-flight `fix` tickets** | Measured on this repo's real board before merge. The escape (write the report) is named in the ADR, the release notes and the move refusal itself. **If any in-flight ticket cannot be cleanly resolved, stop and report — the prose half is not worth breaking the board** |
| **The injection breaks a `fix` move nobody thought about** | Every multi-stage `fix` move is enumerated and measured, not sampled |
| **Generalising the two injections breaks ADR-0011's limit later** | They stay separate functions with separate documented rules, and the limit is promoted from a code comment into the ADR |
| **The two `BLOCK_BODY` copies drift** | `verify:agents-block` check 26, tightened from substring to equality |
| **The third copy drifts again** | It stops being a copy. Plus a rail check |
| **A check tuned until it passes is worthless** | The widened check 7 has a **known expected result before it is run**: 6 sites, 5 illustrative, 1 (`kanmer-plan:11-12`) wrong. If it reports anything else, the check is wrong or the tree changed — either way, investigate rather than adjust |
| **`plugin:check` cannot run in a worktree** | Run it at the main checkout (MCP-010's recipe), per the files document |
| **`kanmerGit.test.ts` flakes under load** | Known, GUI-085, four agents confirmed pre-existing. Rerun alone with `--testTimeout=30000` |
| **A new rail step taxes every PR** | `verify:skills` is pure file reads, no build, sub-second |

## Out of scope

Unchanged from `files`: no skill voice rewrites, no `kanmer-review/assets/pr-*.md`
(SKILL-015), no `.claude/skills/` pruning (CORE-023), no CI lint beyond this
script (CORE-025), no `chore`/`spike` behaviour change (operator said keep), no
making `collapsesPipeline` smarter.

## Correction to Part 2 — the block gets longer, not shorter

**Made during implementation; the plan was wrong here.** Part 2 originally
predicted "the block gets **shorter**, because the deleted
sentence is longer than the clauses that replace it". **Measured, it gets
longer: 2209 → 2482 bytes, +273 bytes / +47 words**, 18 → 20 lines.

The prediction was never plausible: the section itself lists **one** deletion and
**four** additions. The deleted per-profile sentence is ~130 bytes; the four
rules cost ~400 even after tightening every one of them.

The pre-registered fallback — from `open-questions` — was "if the count comes out
net-longer, the `board.yml` clause is the line to drop". **Not taken, and the
reason is recorded rather than the rule being quietly ignored:** that clause is
the one `research` finding 3 identifies as *the strongest single reason to call
`get_doc_gates`*, and dropping it would still leave the block ~150 bytes longer.
It would trade the most valuable added line for a size target that this ticket's
own scope made unreachable. What the fallback correctly protects against is
padding; the response to it here is that all four additions were **tightened**
and re-measured (a first draft cost +339), not that the size rule was waived.

Stated plainly for `proof`: **this ticket makes the block longer, and that is the
cost of the four rules it exists to add.** SKILL-014's precedent that the block's
size is a cost every repo pays still stands — it is a reason to keep the
additions terse, not a reason a rule-adding ticket cannot add rules.
