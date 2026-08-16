# Plan — DOC-007: Rewrite the in-app manual as a real user guide

Written from `research` and `files`. All four operator questions in
`open-questions` are answered (see that document); the answers are folded in
here rather than assumed.

## Approach

**One ticket, one PR: the pipeline change and the ~17 authored chapters ship
together.** The operator declined the research's proposed DOC-007/DOC-007b
split, and that is the right call for one concrete reason — the new guard fails
the build the instant `FROM_FRD` is deleted with no prose to replace it, so a
split would have had to ship an intermediate 3-chapter manual. There is no
intermediate state worth having.

The pipeline needs almost no new machinery. `build-manual.mjs` already has a
pass-1 loop that reads hand-written markdown out of `docs/manual/`, and
`getting-started` / `troubleshooting` prove it works. Authoring is therefore
**adding files and extending one array** — pass 2 (`FROM_FRD` and `leadProse()`)
is deleted outright, pass 3 (shortcuts, generated from the binding table) is
kept exactly as it is because it genuinely cannot drift.

The one place real design is needed is the **guard**. The old `if (!body) throw`
at `:66` was unfireable: `leadProse()` trims the lead and *then* strips the H1
with `/^#\s+.*\n+/`, a regex needing a newline `trim()` has already removed, so
the H1 survives, `body` is truthy, and the guard tests a value the preceding
line guarantees is non-empty. Replacing it with "throw if the file is missing"
alone would be *weaker* than what we remove, so the replacement is a set of
five rules (below) that reject the shape of the bug, not just its symptom.

Alternatives rejected: (a) *load markdown at runtime* — the renderer CSP is
`default-src 'self'` and the packaged app ships no `/docs/`; (b) *keep FROM_FRD
for the chapters with fuller prose* — an FRD is normative for an implementer,
and length is not the problem (see `board-sync`, 1761 characters of requirement
ids and a "Not built" feature); (c) *add chapter grouping to the rail* — see
Decisions.

## Governing docs

`refs`: `docs/functional/frd/FRD-024-in-app-manual.md` — **Modifies**, with
explicit operator authorization (the ticket body directs it: "Amend FRD-024 to
say the manual is hand-written; it currently permits the derivation").

| Clause | Disposition |
|---|---|
| **Overview** — "The content is *generated from the durable FRDs* — the documentation system documenting the product it governs." | **Withdrawn.** This is the premise the ticket exists to reject. Replaced with: the manual is written for the user, compiled in at build time, and only the shortcuts chapter is derived from source. |
| **R1** (access: Help + F1, sidebar, in-page search, themed) | **Met unchanged.** No viewer change in this ticket. |
| **R2** (chapter list) | **Modified.** The eleven-item list is replaced by the twenty-chapter list below, which supersets it. |
| **R3** (content pipeline: "generated at build time from the FRD set plus hand-written getting-started/troubleshooting") | **Modified — the substantive amendment.** Chapters are hand-written markdown under `docs/manual/`, compiled into a committed module; **only** the shortcuts chapter is generated, from the binding table. The build refuses a chapter that carries specification vocabulary or is too thin to be a chapter. |
| **R4** (contextual "?" entry points) | **Untouched.** GUI-074 (merged, `43dcedb`, PR #37) already amended R4 and referenced GUI-081 for the never-implemented gate-block clause. Not mine. |
| **R5** (versioned with the app, no network) | **Met unchanged**, and reinforced — more content, still zero network. |
| **Acceptance criteria** | 1 and 2 met unchanged; 3 belongs to R4/GUI-081 and is left alone; 4 unchanged. **One criterion added** for the new build guard. |

No new ADR: this is a content-source decision already inside FRD-024's scope,
not a new architectural one.

## Decisions (the questions the plan had to answer)

1. **Flat 20-entry rail, no grouping.** `ManualChapter` is `{id,title,body}`;
   a part field means changing the interface, the generator and `Manual.tsx`,
   which `files` puts out of scope and which is viewer work, not content work.
   A 20-item rail is long but the search box (`Manual.tsx:38-48`, which shows
   the matching *line*) is the real navigation at this size. Recorded as a
   deliberate acceptance, not an oversight; if it reads badly in the app,
   grouping is its own ticket.
2. **`troubleshooting` is unpinned from index 1.** Reading order puts it at 19,
   where a reference chapter belongs. `manual.test.ts:9` keeps the
   `getting-started`-at-0 pin — that one is load-bearing, because
   `Manual.tsx:29` opens `MANUAL_CHAPTERS[0]` when no chapter is named. The
   index-1 pin at `:10` becomes an existence assertion.
3. **`kanmer-*` skill names appear exactly once**, in the dispatch chapter, as
   "what your agent will say it is doing". A user driving Claude Code sees those
   strings in their agent's output and needs to recognise them; using them
   anywhere else imports contributor vocabulary into a user manual.
4. **Chapter ids: all twelve existing ids survive.** The eight new chapters take
   new ids. Nothing in the app deep-links into the manual any more (GUI-074
   removed `SETTINGS_HELP`; the Help menu sends `{type:"manual"}` with no
   chapter, `main/index.ts:322-325`), so ids are technically free — but
   `Manual.tsx:50` falls back to chapter 0 on an unknown id, i.e. a renamed id
   opens the *wrong* chapter silently, and GUI-081 will deep-link again. Keeping
   them stable costs nothing and removes the trap.
5. **`check:manual` is wired in two places**: the root `test` script (so every
   `npm test` catches a stale artifact) and, explicitly, the release
   verification gate in `release.mjs`. `npm test` is already in that gate, so
   the second is belt-and-braces — but the gate is the ship decision and should
   name what it checks. Today nothing invokes `check:manual` at all.

## The table of contents (20 chapters, reading order)

| # | id | Title | Source |
|---|---|---|---|
| 1 | `getting-started` | What Kanmer is | rewritten |
| 2 | `install` | Install and open a project | new |
| 3 | `connect` | Connect an agent | new |
| 4 | `first-ticket` | Your first ticket, end to end | new |
| 5 | `stages` | The six stages | new *(core)* |
| 6 | `profiles` | Profiles: what a ticket owes | new *(core)* |
| 7 | `gates` | Why can't I move this? | new *(core)* |
| 8 | `documents` | Ticket documents | new *(core)* |
| 9 | `references` | Reference files and scratch | new *(core)* |
| 10 | `proof` | Proof | new *(core)* |
| 11 | `groups` | Areas, epics and horizons | new |
| 12 | `backlog` | The backlog | new |
| 13 | `dispatch` | Dispatching agents | new |
| 14 | `board-sync` | Sharing a board over Git | new *(core)* — **not one word carried over** |
| 15 | `sync` | Staying in sync | new |
| 16 | `settings` | Settings, tab by tab | new |
| 17 | `shortcuts` | Keyboard shortcuts | **generated, unchanged** |
| 18 | `updates` | Keeping Kanmer up to date | new |
| 19 | `troubleshooting` | Troubleshooting | rewritten (two sections graduate to 7 and 9) |
| 20 | `glossary` | Glossary | new |

*(core)* marks the seven the operator named as the irreducible set. They are not
being treated as a fallback — all twenty ship — but they get written first so a
triage, if one were ever forced, would land on the right side.

## Steps

1. Worktree `.worktrees/doc-007` on `doc-007-manual-user-guide` off
   `origin/main` (which already carries GUI-074).
2. **Gather facts against shipped code, not against the FRDs.** The FRDs are
   specs and several describe things that were never built — FRD-020 R5 is
   marked "Not built" while the shipped troubleshooting chapter tells users to
   go and use it. Every factual claim in an authored chapter is checked against
   `packages/core/src`, `apps/gui/src`, and a live `get_doc_gates`.
3. **Rewrite `build-manual.mjs`.** Delete `FROM_FRD` (`:28-38`), its loop
   (`:62-72`) and `leadProse()` (`:40-47`). Extend the pass-1 list to all
   nineteen hand-written chapters in reading order. Keep pass 3 and `--check`
   and the committed-artifact contract untouched.
4. **Write the guard.** See "What the guard rejects" below.
5. **Author chapters 5, 6, 7, 8, 9, 10, 14** — the core.
6. **Author chapters 2, 3, 4, 11, 12, 13, 15, 16, 18, 20** — the rest.
7. **Rewrite `getting-started` and `troubleshooting`.** getting-started sheds
   the compressed stages/profiles/dispatch material now that those are
   chapters, and becomes an orientation chapter. troubleshooting loses "A move
   is refused" (→ ch 7) and "An attachment does not satisfy a gate" (→ ch 9),
   and gains entries for the failures a user actually hits.
8. **Update `manual.test.ts`:** relax the index-1 pin; raise the prose floor
   from 80; assert no `FRD-`/`ADR-`/`PRD-` token and no `docs/…` path in any
   title or body; assert the twenty ids. Re-read the file after rebase —
   GUI-070 is in flight and touches `:60`.
9. **Wire `check:manual`** into root `test` and the `release.mjs` gate.
10. **Amend FRD-024** — Overview, R2, R3, and one added acceptance criterion.
    R4 untouched.
11. `npm run build:manual`, **commit `chapters.generated.ts`**.
12. Rail: `npm test`, `npm run typecheck`, `npm run build:manual`,
    `npm run check:manual`. Rebase onto `origin/main`, re-read
    `manual.test.ts`, re-run the rail, then open the PR.

## What the guard rejects

Five rules, replacing one that could never fire. Rules (a), (d) and (e) apply to
every chapter; (b) and (c) apply to hand-written chapters.

- **(a) A missing chapter file** — throws naming the path. This is the one rule
  the old code had that was actually load-bearing (`:64`), kept at equal
  strength.
- **(b) A top-level `# ` heading anywhere in the body.** This is the precise
  shape the old bug produced: the chapter title is supplied by the generator and
  rendered by `Manual.tsx:95`, so an H1 in the body is either a duplicate title
  or a stub masquerading as a chapter. Rejecting it makes the old failure
  unrepresentable rather than merely unlikely.
- **(c) A prose floor of 400 characters** measured *after* stripping fenced code
  blocks, table rows, headings, and blockquote/list markers — so a chapter
  cannot pass on structure alone. Today's stubs are 82 characters; the existing
  test floor is 80, which every stub clears.
- **(d) An `FRD-`, `ADR-` or `PRD-` token in any title or body** — including the
  generated shortcuts chapter, which passes today and should keep passing.
- **(e) A `docs/…` repo path in any title or body.** Deliberately scoped to
  `docs/` and not "any path": `.kanmer/` and `.worktrees/kanmer` are things the
  user has on their own disk and appear legitimately in getting-started today. A
  naive no-paths rule would fail a chapter that is currently correct.

The shortcuts chapter is exempt from (b) and (c) because it is a table by
design. It is not unguarded: the generator already refuses when the binding
table parses to zero rows (`:79`), and `manual.test.ts:45-53` compares the
chapter's rows against `SHORTCUTS` in both directions, which is a stronger
guarantee than a character count.

Duplicate ids are also rejected in the generator, not only in the test.

## Verification

`proof.md` is produced from, on merged main:

- `npm test` — including the extended `manual.test.ts`, whose new assertions are
  themselves the regression guard the ticket's Verification section asks for.
- `npm run typecheck` across all workspaces.
- `npm run build:manual` then `git diff --exit-code` on
  `chapters.generated.ts` — proves the committed artifact is current.
- `npm run check:manual` — and evidence it is now *reached*: `npm test` output
  showing the check running.
- A negative test of the guard: temporarily stub a chapter down to its heading
  and show `build:manual` refusing it with a named reason. This is the evidence
  that matters most, because the thing being replaced was a guard that looked
  right and never fired.
- Chapter-body character counts, so "the shortest is well past 82 characters" is
  a number and not a claim.
- The manual read in the running app: each chapter answers its own title for
  someone who has never seen the repo.

## Risks / open questions

- **Factual drift between FRD and product.** The largest content risk, and the
  reason step 2 exists. `board-sync` is the proven case: FRD-020 R5 says branch
  rename is "Not built", the shipped troubleshooting chapter tells users to use
  it. Chapter 14 is written from behaviour verified in shipped code, and the
  troubleshooting entry is corrected or removed to match. Mitigation: every
  chapter's claims are checked against source; anything unverifiable is left
  out rather than guessed.
- **GUI-070 is in flight** and touches `manual.test.ts:60` and regenerates
  `chapters.generated.ts` (it removes the Backlog view and its chapter). Note
  that GUI-069 has already merged and renders Backlog as the board's first
  column, so chapter 12's content depends on which of those is the end state —
  resolved by reading the code post-rebase, not by trusting either ticket body.
  Mitigation: rebase immediately before the PR, re-read `manual.test.ts` rather
  than trusting line numbers, re-run the rail after.
- **A large committed generated diff** (~12 → 20 chapters, a few KB → tens of
  KB). Unavoidable and by design. Mitigation: the review reads `docs/manual/`,
  not `chapters.generated.ts`; the PR body says so.
- **README is stale in three user-visible ways** and will disagree with the
  correct manual. Parked deliberately; filed as its own ticket at closeout.
- **A 20-item flat rail may read badly.** Accepted deliberately (Decision 1);
  becomes a follow-up ticket if the in-app read says otherwise.
