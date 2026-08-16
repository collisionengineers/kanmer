# Files — SKILL-013

*The files document. Not the research — this is the **surface area** of the change, not the findings behind it.*

Surveyed BEFORE planning. Two tables, and the second is the one that earns its
keep.

## Where the change lands

Risk is **H/M/L**: H = breaks the release rail or ships wrong rules to every
repo; M = a wrong edit is caught by a check or a reader; L = prose only.

### The AGENTS block — two files, byte-identical or the rail fails

| Path | What changes | Risk |
|---|---|---|
| `scripts/agents-block.mjs` | `BLOCK_BODY` (lines 21–38): **delete** the per-profile requirement clause at line 30; **add** the `questions-resolved` + `## Parked` rule; **add** that `gh pr merge` is outside the gate engine; **add** that `board.yml`'s `profiles:` block is not the effective requirement set | **H** — ships into every repo that installs Kanmer, and this literal *is* the tier-3 contract (ADR-0009) |
| `plugins/kanmer/skills/kanmer-setup/SKILL.md` | The fenced copy at lines 146–165. **Byte-identical** to the above or `verify:agents-block` check 26 fails. Note lines 20–22 also state the board-worktree rule outside the fence — leave that | **H** — same bytes, and it is *inside* the skills tree, so R1 governs it |
| `AGENTS.md` (repo root) | Regenerate by running `node scripts/agents-block.mjs .` so this repo carries what it documents (SKILL-014's precedent) | **L** — mechanical, but nothing asserts it, so it is easy to forget |

### The verification script — new, and this time committed

| Path | What changes | Risk |
|---|---|---|
| `scripts/verify-skill-prose.mjs` *(new; name TBD in plan)* | Port `verify-skill-014.mjs`'s seven checks, then fix check 7's two holes: drop the boundary-name precondition, widen the verb list. Add a check that `AGENTS.md` carries the current `BLOCK_BODY` | **M** — a check tuned until it passes is worthless; SKILL-014 hit this twice and recorded both |
| `package.json` | A `verify:skills` script entry | **L** |
| `scripts/release.mjs` (lines ~149–160) | Add it to the rail beside `verify:agents-block`, per FRD-023 R5 | **M** — a new rail step that fails on an unrelated PR is a tax on everyone |
| `scripts/verify-agents-block.mjs` | Optional: tighten line 153 from `skill.includes(BLOCK_BODY)` (substring) to equality of the fenced region | **L** |

### Skill prose — the per-skill gaps

| Path | What changes | Risk |
|---|---|---|
| `plugins/kanmer/skills/kanmer-closeout/SKILL.md` | Add the board-worktree invariant. It runs `git worktree remove`, `prune`, `branch -d/-D`, `push --delete`, and `rm -rf` on a leftover dir, with an 11-row edge-case table that never mentions `.worktrees/kanmer` | **H** — highest blast radius in the roster; a wrong `worktree remove` destroys the board's checkout |
| `plugins/kanmer/skills/kanmer-verify/SKILL.md` | Same invariant. Step 2 is "check out merged `main` and pull" — the only checkout-of-main instruction in the roster, in the shortest skill (32 lines) with no worktree caveat | **H** — a bare `git checkout main` is exactly what the invariant forbids |
| `plugins/kanmer/skills/kanmer-execute/SKILL.md` | Same invariant, plus one-gated-boundary at step 4's `move_item`. Names `.worktrees/` five times without distinguishing the board's | **M** |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | Board-worktree invariant (drives execute + closeout in parallel lanes). Its one-gated-boundary statement at `:38-41` is the best in the roster — **do not touch it** | **M** |
| `plugins/kanmer/skills/kanmer-groom/SKILL.md` | One-gated-boundary. It bulk-repairs "off-board statuses" via `move_item`, and that is the rule that will refuse them | **M** |
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | One-gated-boundary at its `move_item verifying`. Its `:59-75` block is the model for this whole ticket — **quote it, do not rewrite it** | **M** |
| `plugins/kanmer/skills/kanmer-research/SKILL.md` | One-gated-boundary at its `move_item preparing`. Already states three invariants well (`:47-56`) | **L** |
| `plugins/kanmer/skills/kanmer-tickets/SKILL.md` | One-gated-boundary — it is the router, and the rule currently lives only in its `tool-reference.md`. Fix the per-profile claim at `:106` per the illustrative rule the plan settles | **M** |
| `plugins/kanmer/skills/kanmer-plan/SKILL.md` | **Correct `:11-12`** — "a `chore` asks for a plan and nothing else" is false (chore also owes `proof` and `questions-resolved`×2). Same defect class as `kanmer-review:48`, which SKILL-014 fixed. Keep `:55` | **M** — a measurably wrong sentence |
| `plugins/kanmer/skills/kanmer-tickets/assets/ticket-template.md` | Per-profile claim at `:11` — decide with the other five | **L** |
| `plugins/kanmer/skills/kanmer-docs/SKILL.md`, `kanmer-report/SKILL.md` | **No change expected.** Recorded so "twelve skills" is measured, not assumed | **L** |

### The governing docs

| Path | What changes | Risk |
|---|---|---|
| `docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md` | Add the two limits from `board.ts:64-81` to Consequences (never `leave-backlog`; never add a boundary a profile did not declare, because `collapsesPipeline` counts gated boundaries). Also fold in the `fix`/`chore`-have-no-`enter-review` consequence the comment records | **M** |
| `docs/architecture/adr/ADR-00XX-<fix-gains-enter-review>.md` *(new)* | The operator's decision. Required by the ticket body and by the scratch note | **H** — changes what every existing board demands of every `fix` |
| `docs/functional/frd/FRD-023-agent-skills-system.md` | Its "Verified against code — Phase 0.2" section says "R1 is **not yet true**" and "the grep **fails today**". Both are stale since `fc52cba` | **L** |

### The profile change (operator-decided second half)

| Path | What changes | Risk |
|---|---|---|
| `packages/core/src/profiles.ts` | `DEFAULT_PROFILES.fix` gains `enter-review: ["post-implementation-report"]` (shape TBD in plan) | **H** — reaches **new boards only**; alone it is the SKILL-012 bug repeating |
| `packages/core/src/board.ts` | The reach-existing-boards half, in `resolveProfiles` (lines 85–106) — the working precedent the operator named. Also: cite ADR-0011 from the doc comment instead of being the only place the limits exist (ticket Verification box) | **H** — changes legal moves on every existing board; `collapsesPipeline` counts what this function returns |
| `apps/gui/src/renderer/src/lib/profileDraft.ts` | ADR-0011's Consequences flag it: pseudo-types are duplicated here for the Settings profile editor, "or Settings rejects a profile core accepts". Check whether a new default boundary needs anything | **M** — a known, documented trap |

## Context files

What an implementer must **read** to avoid a trap.

| Path | What it tells the implementer |
|---|---|
| `C:\Users\PC\AppData\Local\Temp\claude\C--Users-PC-Documents-GitHub-kanmer\33647913-f142-4e23-a6f7-d5729b9ba896\scratchpad\verify-skill-014.mjs` | **The rule to reuse, not reinvent.** Check 7 (lines 113–125) is the shipped derive-vs-restate discriminator. Uncommitted — copy it into `scripts/` before it is garbage-collected |
| `.kanmer/areas/skills/SKILL-013/scratch/notes.md` | The **binding** operator decision on Review-skipping, and the three consequences attached to it. Read before planning anything |
| `.kanmer/areas/skills/SKILL-014/proof/proof.md` | The evidence standard for this ticket: per-skill measured output, "what this run does NOT prove", and a defect the ticket introduced recorded prominently. Also names the root cause to avoid — a diagram written from `profiles.ts` instead of from `ls` of a real folder |
| `.kanmer/areas/skills/SKILL-014/open-questions/open-questions.md` | Two decisions already made and **binding by precedent**: "every skill names its successor" is not literal (service skills name their callers), and the AGENTS block gets a route, not a table, because "the block ships into every repo, so its size is a cost everyone pays" |
| `packages/core/src/board.ts:46-106` | `resolveProfiles`. The injection precedent, the two ADR-0011 limits in full, and the line that makes the whole R1 argument: "`board.yml` no longer lists every effective requirement" |
| `.worktrees/kanmer/.kanmer/data/board.yml:30-57` | **The proof, on disk.** This repo's own `profiles:` block with no `questions-resolved` in it, while `get_doc_gates` reports it at three boundaries |
| `packages/core/src/gates.ts:70-96, 211-233` | `collapsesPipeline` (a bare `crossed.length > 1`) and `firstBlocking`. The boundary-counting mechanism the operator says must be re-measured, not assumed |
| `packages/core/src/profiles.ts:15-31, 130-157` | `DOC_TYPES`, `GATE_EXEMPT_DIRS`, `DEFAULT_PROFILES`, `DEFAULT_PROFILE_ID = "fix"`. The last one is why the AGENTS block omitting `fix` matters |
| `scripts/verify-agents-block.mjs:145-154` | The byte-equality check, and its weakness: `skill.includes(BLOCK_BODY)` is a substring test |
| `plugins/kanmer/skills/kanmer-review/SKILL.md:59-75` | **The model paragraph.** How to state a hard rule while deferring the configuration-dependent part to `get_doc_gates`, in prose that has already survived a review |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md:38-41` | The model statement of one-gated-boundary. Reuse the wording rather than inventing a third phrasing |
| `docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md` | The four-tier hierarchy. Tier 3 (AGENTS block) is why the block's per-profile list is worse than the same sentence in a skill |

## Ripple effects

- **The two `BLOCK_BODY` copies move together or the rail fails.** `verify:agents-block` check 26. This is the ticket's single most likely cause of a red build.
- **`AGENTS.md` at the repo root must be regenerated** after any block edit. Nothing asserts it today — that is a candidate check for the new script.
- **`.claude/skills/` does not update itself.** Gitignored, install-only, and it currently carries an orphan `run-kanmer/` directory absent from source — the installer never prunes ([[CORE-023]]). Skill edits here are invisible to the running agent until re-synced.
- **`plugin:check` cannot run in a ticket worktree.** `check-plugin-sync.mjs:26` reads `tool-reference.md` and a worktree has no `node_modules` or `dist/`. If the plan touches that file, the assertion must run on merged `main` — SKILL-014 hit exactly this.
- **A new rail step taxes every future PR.** FRD-023 R5 wants it; it must be fast and must not false-positive.
- **The profile change ripples widest:** `collapsesPipeline` counts gated boundaries, so `fix` going 2 → 3 changes which multi-stage `fix` moves are legal. Every one must be **re-measured** (operator's instruction), not reasoned about. Core tests, GUI tests and `smoke:protocol` all touch gate behaviour.
- **In-flight `fix` tickets can strand on upgrade** — the same hazard ADR-0011's Consequences records for `questions-resolved` ("the release notes must say so and name the escape").
- **Release notes** need the profile change called out; existing boards inherit it.
- **`docs/manual/`** — `check:manual` asserts 12 chapters are up to date; a stage/profile behaviour change may touch it.

## Out of scope

- **Rewriting any skill's voice.** FRD-023 R3 and SKILL-014's stated test: a reference skill should change by a handful of lines, or the shape was invented rather than extracted.
- **The four `kanmer-review/assets/pr-*.md` templates.** Already owned by [[SKILL-015]].
- **Pruning `.claude/skills/`.** [[CORE-023]] owns the missing prune; the orphan `run-kanmer/` is evidence for it, not work here.
- **A lint asserting skill vocabulary against `profiles.ts` in CI beyond this ticket's own script.** [[CORE-025]] is the open investigation; SKILL-014 parked it there.
- **Changing `chore` or `spike` behaviour.** The operator said keep, explicitly.
- **Making `collapsesPipeline` smarter.** It is deliberately a boundary count that "has nothing to be wrong about" (ADR-0011 Context). Not this ticket's fight.
