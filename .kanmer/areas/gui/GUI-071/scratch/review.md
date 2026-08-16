## Review — PR #53, 2026-08-16

**I am both the author and the reviewer of this change. This is a self-review
and should not be read as an independent one.** Recorded so the verdict carries
the weight it actually has.

Reviewed: `gh pr diff 53` (4 files, +322/−30), `plan`, `post-implementation-report`,
`open-questions`, `files`, and `docs/functional/frd/FRD-019-gui-shell.md` (the
ticket's only `ref`). Gates self-checked with `get_doc_gates` before moving.

### Changes — in the reviewer's words

- **`lib/views.ts` (new).** A `Record<View, ViewSpec>` where each view declares
  its label, a `(items) => Item[]` for what it renders, and a `counted` flag.
  `VIEW_IDS` is `Object.keys(VIEWS)`; `viewItemsFor` delegates to the spec;
  `viewCount` returns `null` for an uncounted view; `viewCounts` maps all three
  in one pass. `import type` only from `@kanmer/core`. Roughly half the file is
  comment explaining why the three facts are keyed together — matches
  `lib/board.ts`'s house style, and the explanation is the part that stops this
  being undone.
- **`lib/views.test.ts` (new, 13 tests).** Fixtures cover stages, Done,
  non-ticket items and archived items of both kinds. The criterion is asserted
  in a loop over `VIEW_IDS` against three different boards (empty, mixed,
  all-archived), so it is a property over the view table rather than three
  hand-written cases.
- **`App.tsx` (+27/−29).** Local `View`/`VIEW_LABELS` deleted; five call sites
  now read `lib/views.ts`. Net line count is down despite added comments.
- **`FRD-019` (+36/−1).** R5a/R5b/R5c, an acceptance clause, a verified-against-code
  bullet.

### Comments

1. **[non-blocking] `ViewSpec.items` is approximate for Standup.** The field
   documents itself as "the items this view is built from", but the `Standup`
   component is handed the raw `items` array and reduces it itself in
   `lib/standup.ts`. Standup's spec returns the live-tickets set, which is what
   `allViewItems` evaluated to for that view before this change.
   **Disposition: won't-do, deliberately.** Standup has no badge and renders no
   list, so `allViewItems`/`viewItems` are inert while it is showing — both
   before and after. Making the spec "truer" by returning raw `items` would
   change `allViewItems` for a view where nothing reads it: a behaviour change
   bought with nothing. Preserving today's behaviour exactly is worth more than
   notional purity on a fix ticket. The comment in `views.ts` says all of this
   at the declaration, so the next reader is not left to rediscover it.

2. **[non-blocking] `viewCounts` computes all three views' sets on every board
   change**, where only the active view's set is needed elsewhere. Three array
   passes over ~152 items inside a `useMemo` keyed on `items` — immaterial, and
   the alternative (lazily counting only the rendered tabs) reintroduces
   per-render work in the JSX, which is what this ticket removed.
   **Disposition: won't-do.**

3. **[non-blocking] Zero renders differently in the two places.** A tab badge
   shows `0`; `Board.tsx:142-144` renders `""` for an empty column
   (`.length || ""`). Both are pre-existing conventions and the tab badge's is
   unchanged by this diff. `Board.tsx` is GUI-069's file and out of scope here.
   **Disposition: won't-do; noted, not filed** — it is a cosmetic inconsistency,
   not a defect, and filing it would be noise.

4. **[blocking, fixed in PR] R5b's example numbers were ungrounded.** The FRD
   illustrated the badge/column difference with "131 … 6", carried over from the
   operator's decision text, where they refer to a board state nobody can check.
   A permanent governing doc should not cite an unverifiable example, least of
   all in the paragraph whose whole job is to stop a future reader mistaking the
   difference for a bug. **Fixed in `7af5d94`**: replaced with the pair actually
   observed while verifying this change — 152 in the badge against 2 across the
   columns, on a 152-ticket board — and labelled as observed.

5. **[non-blocking] The diff can be misread as a pure refactor**, because no
   printed number changes. **Disposition: fixed in PR** — the PR body's second
   paragraph and the report's summary both lead with it, explaining that
   GUI-070 removed the last visible symptom and left the missing branch, so the
   badges are currently correct by coincidence rather than construction.

### Checks

- **Report against diff — holds.** All four files listed with honest
  rationales; the line-count claim (−28/+27 for `App.tsx`) matches the PR's
  +27/−29 within the whitespace of the count method. The report volunteers two
  corrections to its own research (F4 was resolved by GUI-070 rather than here;
  F6's "archived groups" names something that is not an `Item`), which is the
  behaviour a reviewer wants to see and would otherwise have had to find.
- **Governing docs — holds.** The plan's Governing-docs section claimed
  "Meets R5" plus an authorized modification adding badge semantics. The diff
  does exactly that: R5's view list is untouched, R5a/R5b/R5c are additive. The
  authorization is quoted verbatim in `scratch/operator-answers.md`, which names
  documenting the difference as one of two required deliverables. No ADR was
  claimed and none was needed — no architectural decision is introduced.
- **`files`' ripple list — every item followed up.** Empty states: checked,
  unchanged, and the reason they need no change is stated rather than assumed.
  FilterBar facets: the flagged narrowing does not arise, and why is recorded.
  Ctrl+1…9: moved to `VIEW_IDS` and verified at runtime out of order. Live
  updates: `useMemo` keyed on `items` only. Tests/build: no new deps. Docs:
  FRD-019 done, FRD-011 correctly left to GUI-069/070.
- **Scope — clean.** No `backlog` case. No DOM test environment. `Board.tsx`,
  `lib/standup.ts`, `shared/stages.ts` untouched. `git diff AGENTS.md` empty
  (checked before both commits — Connect writes a stale v2 block into this repo
  and it must not ride along). No `out/`, `dist/` or sandbox artifacts staged.
- **Rail — green**, with the one known `kanmerGit.test.ts` flake investigated
  rather than waved past: 7/7 alone at `--testTimeout=30000`, `src/main/`
  untouched by this diff, pre-existing and separately ticketed.
- **Runtime — the claim is observations, not inference.** Badge 152 equals the
  columns' sum 19+6+4+2+0+121; under a search the badge holds at 152 while the
  columns fall to 2. That is R5a and R5b demonstrated in the same screenshot.

### Verdict

**Pass.** One blocking point raised and fixed in the PR (`7af5d94`); three
non-blocking points dispositioned as won't-do with reasons. Merging and moving
to Verifying.
