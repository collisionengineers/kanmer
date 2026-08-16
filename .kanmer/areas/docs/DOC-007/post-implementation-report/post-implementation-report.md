# Post-implementation report — DOC-007

*The report. Not the proof — this is the author's claim, written before merge;
proof is evidence, gathered after.*

## What shipped

The in-app manual is now **19 chapters of prose written for a user**, replacing
12 of which only 3 were fit to ship. The shortest authored chapter is **2462
characters**; the stubs it replaces were **82**.

| # | id | Title |
|---|---|---|
| 1 | `getting-started` | What Kanmer is |
| 2 | `install` | Install and open a project |
| 3 | `connect` | Connect an agent |
| 4 | `first-ticket` | Your first ticket, end to end |
| 5 | `stages` | The six stages |
| 6 | `profiles` | Profiles: what a ticket owes |
| 7 | `gates` | Why can't I move this? |
| 8 | `documents` | Ticket documents |
| 9 | `references` | Reference files and scratch |
| 10 | `proof` | Proof |
| 11 | `groups` | Areas, epics and horizons |
| 12 | `dispatch` | Dispatching agents |
| 13 | `board-sync` | Sharing a board over Git |
| 14 | `sync` | Staying in sync |
| 15 | `settings` | Settings, tab by tab |
| 16 | `shortcuts` | Keyboard shortcuts *(generated, unchanged)* |
| 17 | `updates` | Keeping Kanmer up to date |
| 18 | `troubleshooting` | Troubleshooting |
| 19 | `glossary` | Glossary |

All twelve pre-existing ids survive. `references` widened to cover scratch,
`getting-started` and `troubleshooting` were rewritten.

## Scope change: 19 chapters, not 20 — say so out loud

The plan called for 20, including a `backlog` chapter. **GUI-070 merged while
this ticket was in flight and withdrew the separate Backlog view entirely** —
the tab, the `BacklogTable` component, multi-select, bulk move/archive/add-to-
group, and the manual chapter generated from FRD-011. It also withdrew FRD-011.

So the `backlog` chapter was written, then deleted. Backlog is now a stage like
any other and the `stages` chapter covers it, including why the list view was
withdrawn. Shipping a chapter describing a table view that no longer exists
would be precisely the defect this ticket exists to remove.

**This is not the ticket being quietly narrowed.** The chapter's subject was
deleted from the product by another ticket four hours into this one. Everything
the operator scoped — the pipeline rewrite, the authored chapters, the FRD-024
R3 amendment, `manual.test.ts`, and the `check:manual` wiring — shipped.

Two other chapters were corrected for the same reason: `groups` (bulk
"Add to group…" was the only group-assignment UI and went with the table — the
chapter now says plainly that groups are agent-created and that this is a gap)
and `stages`.

## Files changed

| File | Change |
|---|---|
| `docs/manual/*.md` | **16 new**, 2 rewritten. The bulk of the work. |
| `scripts/build-manual.mjs` | `FROM_FRD`, its loop and `leadProse()` deleted; one chapter list; six guard rules; duplicate-id check. |
| `apps/gui/src/renderer/src/manual/chapters.generated.ts` | Regenerated and committed. Reviewers should read `docs/manual/`, not this. |
| `apps/gui/src/renderer/src/manual/manual.test.ts` | Index-1 pin relaxed to an existence check; floor 80 → 1500; exact id list; spec-token, docs-path, requirement-line and body-H1 assertions. |
| `docs/functional/frd/FRD-024-in-app-manual.md` | Overview premise withdrawn; R2 chapter list; R3 rewritten + R3a (guard) + R3b (wiring); one acceptance criterion added. **R4 untouched.** |
| `package.json` | `check:manual` prefixed to `test`. |
| `scripts/release.mjs` | `check:manual` as a named step in the verification gate. |

## What the new guard rejects

The guard it replaces (`if (!body) throw`) could never fire: `leadProse()`
trimmed the lead and *then* stripped the H1 with `/^#\s+.*\n+/`, a regex needing
a newline `trim()` had already removed. The heading survived, `body` was truthy,
and the check tested a value the preceding line guaranteed non-empty.

Six rules replace it. **Each was verified to fire** (transcript in `proof`):

1. **A missing chapter file** — names the path. The one rule the old code had
   that was load-bearing, kept at equal strength.
2. **A top-level `# ` heading in an authored body** — the exact shape the bug
   produced. Reproducing the original stub verbatim now fails the build.
3. **Under 400 characters of prose**, measured after stripping fenced code,
   table rows, headings and list/quote markers — so a chapter cannot pass on
   structure. Stubs were 82; the old test floor was 80.
4. **An `FRD-`/`ADR-`/`PRD-` token** in any title or body, generated chapter
   included.
5. **A requirement line** (`- R1.`, `AC2.`) in any title or body. Added beyond
   the plan: the worst chapter was not a stub but 1761 characters of requirement
   list, so length was never the measure.
6. **A `docs/…` path** in any title or body — scoped to `docs/` deliberately.
   `.kanmer/` and `.worktrees/kanmer` are on the user's own disk and appear
   legitimately in getting-started; verified that a chapter using them passes.

Rules 2 and 3 exempt the generated shortcuts chapter, which is a table by
design. It is not unguarded: the generator refuses a zero-row binding table, and
`manual.test.ts` compares its rows against `SHORTCUTS` in both directions.

## Where `check:manual` is now wired

Previously **nothing** invoked it — grep found only its own definition.

- **`package.json` `test`** — first step, so every `npm test` catches a stale
  artifact. Confirmed reached: the run prints `manual: up to date (19 chapters)`
  before the core suite.
- **`scripts/release.mjs` GATE** — a named step. `npm test` is already in that
  gate, so this is belt-and-braces, but the gate is the ship decision and should
  say what shipping requires.

## Governing docs

`docs/functional/frd/FRD-024-in-app-manual.md` — **Modifies**, as the ticket
body directs.

- **Overview** — the "generated from the durable FRDs" premise is withdrawn,
  with the reason recorded.
- **R2** — eleven chapters replaced by the nineteen above, plus an explicit note
  that the absence of a backlog chapter is deliberate.
- **R3** — rewritten: hand-written, compiled in, only shortcuts generated. New
  **R3a** states exactly what the build rejects; **R3b** states that `--check`
  must be reached by something.
- **R4** — **untouched.** GUI-074 (merged, `43dcedb`, PR #37) already amended it
  and referenced GUI-081 for the never-implemented gate-block clause.
- **R1, R5** — met unchanged.
- **Acceptance criterion 5 added** for the guard, recording the old guard's
  precise failure so it cannot be reintroduced as a "simplification".

## Facts corrected against shipped code

Chapters were written from source, not from the FRDs, and four FRD claims turned
out to be stale. Each would have put a bug in the manual:

1. **Board branch rename IS built.** FRD-020 R5 says "Not built". The control
   exists, renames in place, pushes the new name before deleting the old, and
   reconciles closed projects on next open. The shipped troubleshooting chapter
   was right and the FRD was wrong.
2. **Desktop notifications default ON** and live in Settings → Appearance.
3. **Dispatch never creates a worktree** — it spawns at the repo root; the
   execute task's prompt tells the agent to make one.
4. **Backlog** — as above.

Also deliberately not claimed, because they are not built: multiple documents
per type in the editor, group creation from the GUI, in-app rollback, and a
"skip this version" for updates.

## A defect found and not fixed here

`friendlyGateError` (`App.tsx`) is **dead code**. It early-returns unless the
message contains `"document gate(s) unmet"`, a phrase that exists nowhere in the
repo. So the raw agent-facing refusal — including the literal words
`set_ticket_doc` and `get_doc_gates` — reaches the human error banner.

The `gates` chapter is written to be **honest about this**: it quotes what the
user actually sees and translates it, rather than describing friendlier copy
that does not exist. Fixing the code is its own ticket, filed at closeout.

## Risks and follow-ups

- **A large committed generated diff.** By design. Review `docs/manual/`.
- **The rail is 19 flat entries.** Accepted deliberately; `ManualChapter` has no
  part field and adding one is viewer work. Grouping becomes its own ticket if
  the in-app read says so.
- **README is stale in three user-visible ways** and now disagrees with a
  correct manual. Parked by the operator; filed at closeout.
- **`MANUAL_CHAPTER_IDS`** remains exported and unused. Left for GUI-081.

## What `kanmer-verify` should run on merged main

1. `npm test` — and confirm the output shows `check:manual` running first.
2. `npm run typecheck`.
3. `npm run build:manual` then `git diff --exit-code` on the generated file.
4. Re-run the negative test: stub a chapter to its heading, confirm the build
   refuses it by name, restore.
5. Print each chapter's body length; confirm the shortest authored one is in the
   thousands.
6. Open the manual in the running app and read several chapters.
