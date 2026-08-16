# Open questions

All four operator decisions are answered. The plan is written around the
answers, not around the recommendations.

## ⚠ Operator decisions — answered

- [x] **DOC-007 and GUI-074 both amend FRD-024 — who wins?**
      **Moot: GUI-074 has merged** (`43dcedb`, PR #37). It amended **R4 only**,
      recording that the Settings `?` was removed and referencing GUI-081 for
      R4's never-implemented gate-block clause. **DOC-007 owns R3** (plus the
      Overview premise and R2's chapter list) and does not touch R4. Verified in
      the merged file: R4 now reads "(A matching '?' on Settings tabs was
      removed — GUI-074 … see GUI-081, which will implement it or formally
      withdraw this clause.)" Work is rebased onto merged main. No conflict.

- [x] **Merge order: GUI-074 before or after DOC-007?**
      **GUI-074 first — done.** As a consequence `SETTINGS_HELP` no longer
      exists in `Settings.tsx`, and `manual.test.ts`'s hand-copied
      `deep-link targets` block is already deleted. Nothing in the app now
      deep-links into the manual: the Help menu sends `{type:"manual"}` with no
      chapter (`main/index.ts:322-325`), and F1 is handled at `App.tsx:916-918`.
      Chapter ids are therefore unconstrained — but see the decision below.

- [x] **Split into pipeline and content?** **No — one ticket, one PR, all of
      it.** The operator chose the single-PR option: the pipeline rewrite, the
      ~17 authored chapters, the FRD-024 R3 amendment and `manual.test.ts`. No
      DOC-007b, no intermediate three-chapter manual, no sequencing to get
      wrong. This also removes the split's own hazard — the new guard fails the
      build the instant `FROM_FRD` goes away with no prose behind it.

- [x] **Is the 20-chapter table of contents right?** **Yes** — accepted
      implicitly by accepting the whole thing in one ticket. Research §4 stands
      and is reproduced as a table in `plan`. The operator confirmed the
      irreducible core, if triage were ever forced: chapters **5 (stages), 6
      (profiles), 7 (gates), 8 (documents), 9 (reference/scratch), 10 (proof)
      and 14 (board sync)**. All twenty ship; the seven are authored first so a
      forced cut would land on the right side.

## Questions the plan must answer — answered

- [x] **Twenty flat entries in the rail, or grouping?** **Flat, deliberately.**
      `ManualChapter` is `{id,title,body}`; a part field means changing the
      interface, the generator and `Manual.tsx` — viewer work that `files` puts
      out of scope. The search box is the real navigation at this size, and it
      already shows the matching *line*, not just the title
      (`Manual.tsx:38-48`). If a 20-item rail reads badly in the running app,
      grouping becomes its own ticket rather than being smuggled in here.

- [x] **What must the new guard reject, and how strictly?** Five rules, in
      `plan` § "What the guard rejects". Resolving the three edges named here:
      **(a) the floor is 400 characters** of prose after stripping code fences,
      table rows, headings and list/quote markers — today's stubs are 82 and the
      existing test floor is 80, so the floor had to be hundreds, not tens;
      **(b) the `FRD-`/`ADR-`/`PRD-` token ban applies to every chapter
      including generated shortcuts**, which passes today and should keep
      passing; **(c) the path ban is scoped to `docs/…` specifically, not "repo
      paths"** — `.kanmer/` and `.worktrees/kanmer` are things on the user's own
      disk and appear legitimately in the shipped getting-started chapter, so a
      naive rule would fail a chapter that is currently correct. A sixth rule
      not in the original list: **reject a top-level `# ` heading in a
      hand-written body**, because that is the exact shape the old bug produced
      and rejecting it makes the failure unrepresentable rather than unlikely.

- [x] **Where is `check:manual` wired?** **Two places.** The root `test` script,
      so every `npm test` catches a stale artifact; and explicitly in the
      `release.mjs` verification gate, which is the ship decision and should
      name what it checks. `npm test` is already inside that gate, so the second
      is belt-and-braces — cheap (a dependency-free node script) and the gate
      reads as a list of what shipping requires. Today nothing invokes it at
      all: grep finds only its own definition at `package.json:29`.

- [x] **Does `troubleshooting` stay pinned at index 1?** **No — unpinned.**
      Reading order puts it at 19, where a reference chapter belongs. The
      `getting-started`-at-0 pin **stays**, because it is load-bearing:
      `Manual.tsx:29` opens `MANUAL_CHAPTERS[0]` when no chapter is named. The
      index-1 assertion at `manual.test.ts:10` becomes an existence assertion.

- [x] **How much `kanmer-*` skill vocabulary belongs in a user manual?** **Very
      little — named exactly once**, in the dispatch chapter, framed as "what
      your agent will say it is doing". A user driving Claude Code through the
      plugin sees those strings in their agent's output and needs to recognise
      them; using them anywhere else imports contributor vocabulary into a user
      manual. Confirmed as proposed.

- [x] **Chapter ids** (added during planning). **All twelve existing ids
      survive**; the eight new chapters take new ids (`install`, `connect`,
      `first-ticket`, `gates`, `sync`, `settings`, `updates`, `glossary`), and
      `references` keeps its id while widening to cover scratch. Nothing
      deep-links into the manual today, so this is free — but `Manual.tsx:50`
      falls back to chapter 0 on an unknown id, meaning a renamed id opens the
      **wrong chapter silently**, and GUI-081 will deep-link again. Stability
      costs nothing and removes the trap.

## Parked (explicitly deferred)

- **README.md is stale in three user-visible ways** and will disagree with the
  corrected manual: the stage list at `:78` (`Todo → Planning → …` against the
  real `Backlog → Preparing → …`), the claim that stages and priorities are
  editable in Settings at `:82-83` and `:155` (FRD-007 fixes the stages; FRD-008
  removed priority), and the document names at `:39-43` (`impact.md` is now the
  `files` document, and documents are folders). **Deliberately not folded in** —
  the operator parked it as its own ticket, to be filed at DOC-007's closeout.
  README is what a user reads *before* they can open the manual, so it matters,
  but it is a different file with a different audience and its own review.
- **Restoring contextual help entry points** — a legible per-gate-error link
  into the manual, now that the chapters are worth landing on. This is GUI-081,
  already referenced from FRD-024 R4 by GUI-074. Not this ticket.
- **Chapter grouping in the rail** — only if the flat 20-item rail reads badly
  in the running app. Its own ticket if so.
