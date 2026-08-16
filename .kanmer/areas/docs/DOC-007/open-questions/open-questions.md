# Open questions

## ⚠ Operator decisions — these need a human, now, not at planning time

- [ ] **DOC-007 and GUI-074 both amend FRD-024, in the same release, in opposite
      directions on the same file. Who wins, and who edits it?**
      DOC-007 must withdraw **R3** ("chapters … generated at build time from the
      FRD set") and the Overview premise ("the documentation system documenting
      the product it governs"). GUI-074 removes the Settings `?`, which is
      exactly what **R4** mandates ("a '?' affordance on Settings tabs and on
      gate-block messages deep-links to the relevant chapter") — but GUI-074's
      body never mentions amending the FRD at all. Both tickets carry
      `docs/functional/frd/FRD-024-in-app-manual.md` as their governing ref.
      Options: (a) one ticket owns the whole FRD-024 rewrite (R2, R3, R4) and the
      other refs it read-only; (b) each amends only its own requirement and
      accepts a merge conflict; (c) a third ticket rewrites FRD-024 first.
      **I am not resolving this — it is two tickets disagreeing about a governing
      document.**

- [ ] **Merge order: does GUI-074 land before or after DOC-007?**
      It changes the work. The new table of contents introduces new chapter ids
      (`gates`, `settings`, `updates`, `glossary`) and re-scopes `references`.
      `SETTINGS_HELP` (`Settings.tsx:52-59`) hard-codes five ids — if DOC-007
      lands first, those deep links open the manual at the *wrong* chapter
      (`Manual.tsx:50` falls back to chapter 0 for an unknown id, so it fails
      silently rather than visibly). If GUI-074 lands first, the map is gone and
      DOC-007 is unconstrained. Both tickets also edit `manual.test.ts`.
      **Recommendation: GUI-074 first.** Needs a decision, not an assumption.

- [ ] **Split this ticket into pipeline and content?**
      Research recommends yes, with the seam already drawn: DOC-007 keeps the
      code (drop `FROM_FRD`, fix the guard, assert in `manual.test.ts`, wire
      `check:manual`, amend FRD-024) and a new **DOC-007b** authors the ~17
      chapters. Two different jobs, two different review criteria. If split,
      they must be **sequenced, not parallel** — the new guard fails the build
      the instant `FROM_FRD` is deleted with no prose to replace it. So: does
      the code half ship *with* the chapters, or ship first and delete the nine
      FRD-derived chapters outright, leaving a temporarily 3-chapter manual?
      **Approve the split and pick the sequencing.**

- [ ] **Is the proposed 20-chapter table of contents right, and is it the right
      size?** The list in `research` §4 is the main output of this ticket and
      everything downstream is authored against it. Twenty chapters against
      twelve today. If that is too much for a first pass, the irreducible core
      is chapters 5 (stages), 6 (profiles), 7 (gates), 8 (documents), 9
      (reference/scratch), 10 (proof) and 14 (board sync) — the seven places
      where the manual is currently either empty or actively misleading.

## Questions the plan must answer

- [ ] **Twenty flat entries in the chapter rail — acceptable, or does the viewer
      need grouping?** `Manual.tsx:78-89` renders one button per chapter with no
      grouping, and `ManualChapter` is `{ id, title, body }` with no field for a
      part. The six-part structure in the TOC has no representation in the data
      model. Either accept a long flat rail, or add an optional part/group field
      to the generator, the interface and the rail — which is a third piece of
      work and should be its own ticket if chosen.

- [ ] **What exactly must the new guard reject, and how strictly?**
      Ticket names two rules: a prose floor after stripping headings, and no
      `FRD-`/`ADR-`/`PRD-` token. Unresolved edges: (a) what floor — 82 chars is
      today's failure and the existing test's floor is 80, so it must be
      hundreds, not tens; (b) does the token ban apply to the *generated*
      shortcuts chapter too (it would pass either way today); (c) does the
      `docs/…` path ban catch `.kanmer/` paths, which are legitimately
      user-visible and appear in the shipped getting-started chapter — a naive
      "no repo paths" rule would fail a chapter that is currently correct.

- [ ] **Where should `check:manual` be wired so a stale artifact cannot ship?**
      Nothing in the repo invokes it today — not `release.mjs`, not `npm test`,
      not any verify script (grep finds only `package.json:29`). Candidates:
      the release verification gate, a `pretest`, or the GUI typecheck script.
      Pick one; "run it by hand" is what got us here.

- [ ] **Does `troubleshooting` stay pinned at chapter index 1?**
      `manual.test.ts:9-10` asserts `getting-started` at 0 and `troubleshooting`
      at 1. The proposed reading order puts troubleshooting near the end, where
      a reference chapter belongs. Relax the assertion to "getting-started is
      first" and drop the index-1 pin, or deliberately keep troubleshooting
      second?

- [ ] **How much of the `kanmer-*` skill vocabulary belongs in a user manual?**
      A user driving Claude Code through the plugin sees skill names in their
      agent's output (`kanmer-research`, `kanmer-execute`, …). Naming them in
      the dispatch chapter helps a user recognise what their agent is doing;
      naming them everywhere imports contributor vocabulary. Proposal: name them
      once, in chapter 13, as "what your agent will say it is doing" — confirm.

## Parked (explicitly deferred)

- **README.md is stale in three user-visible ways** and disagrees with the
  product: the stage list at `:78` (`Todo → Planning → …` vs the real
  `Backlog → Preparing → …`), the claim that stages and priorities are editable
  in Settings at `:82-83` and `:155` (FRD-007 fixes stages; FRD-008 removed
  priority), and the document names at `:39-43` (`impact.md` is now the `files`
  document, and documents are folders). Out of scope here — deliberately not
  folded in — but it should become its own ticket, because README is what a user
  reads *before* they can open the manual.
- **Restoring contextual help entry points** (a legible per-tab or per-gate-error
  link into the manual) once the chapters are worth landing on. GUI-074's own
  body says this belongs after DOC-007; leaving it parked here so it is not
  lost.
