# Open questions — GUI-065

## Answered by the operator

- [x] **Q1. What counts as proof for this fix? → (a) + (c).** The operator chose
      the real headless guard over the free source-shape assertion, plus the
      screenshot. So: add `jsdom` + `@testing-library/react`, extract the update
      surface into a small component, assert it renders the banner for a
      `downloaded` event — **and** take a screenshot of the real Electron app on
      the welcome screen driven by a local dev update feed.

      The operator was explicit about the limit research identified and it is
      carried into `plan.md` and will be carried into `proof.md`: a component
      test **still cannot prove `App.tsx` mounts the update surface above the
      early return**. `proof.md` says so plainly. The screenshot is what closes
      that gap, and it is a one-off artefact — nothing re-runs it, so a
      regression in the mounting would be silent. Option (b), the source-shape
      vitest assertion, was **not** taken.

- [x] **Q2. May this PR add devDependencies? → Yes.** Two packages (`jsdom`,
      `@testing-library/react`) plus a vitest jsdom environment. The operator
      attached a condition, which is now a plan step and a checklist box:
      **`AGENTS.md` §7's claim that "`renderer/src/lib/` is the only renderer
      code with vitest coverage" must be amended in the same PR** — this is a
      repo-wide convention change and it is recorded as one, not slipped in.

      Planner note on *how* jsdom is turned on: per-file, with a
      `// @vitest-environment jsdom` docblock, rather than as a global
      `test.environment` setting. `apps/gui` has 21 existing test files covering
      pure and main-process modules; running all of them under jsdom is a change
      to tests this ticket has no business touching. This is a mechanism choice
      inside an answered question, not a new question. If vitest cannot
      transform `.tsx` without a config file, a minimal `apps/gui/vitest.config.ts`
      is added instead — decided empirically during execute, not guessed.

## Answered by the planner

- [x] **Layout: shell wrapper, or make `.welcome` flex under one?** Shell
      wrapper, as research recommended. The welcome branch is wrapped in
      `<div className="app">`, which is the exact ancestor chain `.banner` was
      designed for, and `.welcome` changes from `height: 100%` to
      `flex: 1; min-height: 0`. This keeps **one** instance of each surface —
      which is what preserves the single-`installUpdate()`-call-site invariant —
      and needs **no new prop on `Welcome.tsx`**, which stays presentational.

      Consequence, accepted rather than engineered around: with a banner above a
      vertically centred `.welcome`, the centred content moves **up** by about
      half the banner height when the banner appears. The ticket's original
      worry was the recents list being pushed **down** under a hovering cursor;
      the shell makes it a smaller upward shift instead. Stated in the PIR.

- [x] **Is lifting the whole `.toast-stack` (not just update toasts)
      acceptable?** Yes. It also carries dispatch toasts (no project ⇒ none are
      produced) and GUI-064's install-refusal toast, which *should* be visible on
      the welcome screen. Recorded in the PIR as an intended widening beyond the
      ticket's title.

- [x] **`AGENTS.md` §7 says `CH.installUpdate` has "exactly two renderer call
      sites".** Stale since GUI-064 consolidated it to one (`App.tsx:479-500`,
      whose own comment says so). Folded into this PR: it is a one-line edit and
      it is the paragraph an implementer reads before touching this code —
      exactly the condition the question set for folding it in. It is the second
      of the **only two** AGENTS.md edits this PR makes; `git diff AGENTS.md` is
      inspected before committing.

## Parked (explicitly deferred)

- [x] **Does the welcome screen need new IPC or preload surface?** No.
      `preload/index.ts:104-111` already exposes `getUpdateState`,
      `onUpdateStatus`, `installUpdate` and `mcpSessions`, none of them
      project-scoped; `main/index.ts:861` pushes to the one window
      unconditionally. Answered in research §1-2. **This ticket adds zero IPC.**

- [x] **Does FRD-021 already specify welcome-screen visibility?** No — zero hits
      for "welcome", "no project", "project open". R1's plain reading covers it,
      so this is a bug **and** the FRD owes a clarifying clause on R1 so the next
      reader cannot mistake the silence for intent. The clause is a plan step.
      FRD-021 is not compiled into the in-app manual, so no `build:manual`
      ripple — `check:manual` is run to verify that rather than assume it.

- [x] **Banner, or all three surfaces?** All three. Lifting only the banner
      leaves Help ▸ Check for Updates… silent (no `.toast-stack`) and leaves
      "Restart now" opening a `ConfirmModal` that never renders — strictly worse
      than the present bug.

- [x] **Should a dev hook be added to force an `UpdateStatusEvent`?** Deferred,
      as before. A `KANMER_FAKE_UPDATE=<version>` branch in `initUpdater` would
      make the visual check one command and repeatable, but it is a product
      change to the main process and out of scope for a `fix`. Q1 landed on
      (a)+(c) rather than (c) alone, so the case for it is weaker than research
      anticipated: the repeatable guard is now the component test, and the
      screenshot is the deliberately one-off part. Worth its own ticket if the
      local-feed dance is ever needed a third time.
