# Open questions — GUI-065

## ⚠ OPERATOR ONLY — this one decides whether the ticket can close autonomously

- [ ] **Q1. What counts as proof for this fix?** `npm test` and `npm run typecheck`
      are **both green on the broken code today**, and `lib/update.test.ts` passes
      identically before and after — the bug is JSX placement, not decision logic,
      so no pure test in `lib/` can distinguish fixed from broken (research §7).
      There is no jsdom, no `@testing-library/react`, no vitest config and no React
      test anywhere in the repo. Pick one:

      **(a)** Add `jsdom` + `@testing-library/react` as devDeps and a vitest
      `environment: "jsdom"`, extract the update surface into a small component,
      and assert it renders the banner for a `downloaded` event. Real headless
      regression guard; the repo's **first** React test, i.e. a testing-stack
      precedent, and it still cannot prove `App.tsx` mounts it above the early
      return.

      **(b)** A source-shape vitest assertion — read `App.tsx`, assert the update
      JSX precedes `if (!root || !board)`. Free, catches the regression, but it is
      a text assertion about a file rather than about behaviour; the repo only has
      precedent for that in `scripts/*.mjs`, never in vitest.

      **(c)** Screenshot only. An agent *can* obtain it on this host — write the
      gitignored `apps/gui/dev-app-update.yml`, serve a local feed with a newer
      `latest.yml` and a sha512-matching dummy artefact, launch with
      `KANMER_DEV_UPDATE=1`, screenshot the welcome window — but it is a one-off
      artefact, nothing re-runs it, and a regression would be silent.

      **Recommendation: (a) + (c).** Without (a) or (b) this ticket **cannot
      honestly close autonomously**; proof.md would be a screenshot and an
      assertion that unrelated tests still pass. Say plainly which you accept.

- [ ] **Q2. May this PR add devDependencies to `apps/gui`?** Only relevant if Q1
      = (a). Two packages (`jsdom`, `@testing-library/react`) plus a vitest
      environment setting, and `AGENTS.md` §7's claim that `renderer/src/lib/` is
      "the **only** renderer code with vitest coverage" stops being true and must
      be amended in the same PR. That is a repo-wide convention change riding on a
      one-screen bug fix — it needs your yes, not the planner's.

## Parked (explicitly deferred)

- [x] **Does the welcome screen need new IPC or preload surface?** No.
      `preload/index.ts:104-111` already exposes `getUpdateState`,
      `onUpdateStatus`, `installUpdate` and `mcpSessions`, none of them
      project-scoped; `main/index.ts:861` pushes to the one window
      unconditionally. Answered in research §1-2. **This ticket adds zero IPC.**

- [x] **Does FRD-021 already specify welcome-screen visibility?** No — zero hits
      for "welcome", "no project", "project open". R1's plain reading covers it
      ("an available update surfaces as a non-blocking banner/toast"), so this is a
      bug, **and** the FRD owes a clarifying clause on R1 so the next reader cannot
      mistake the silence for intent. Nothing in `docs/plans/updater/` or GUI-017
      shows it was ever considered.

- [x] **Banner, or all three surfaces?** All three. Lifting only the banner leaves
      Help ▸ Check for Updates… silent (no `.toast-stack`) and leaves "Restart
      now" opening a `ConfirmModal` that never renders — strictly worse than the
      present bug.

- [ ] **Layout: shell wrapper, or make `.welcome` flex under one?** A planner
      call, not an operator one. Constraint is fixed and recorded: `#root` and
      `.welcome` are both `height:100%`, `.banner` is a full-bleed `.app` child.
      Recommendation: a thin shell wrapper that both branches share, with
      `.welcome { flex:1; min-height:0 }` under it — it keeps one banner instance
      and preserves the single `installUpdate` call site.

- [ ] **Is lifting the whole `.toast-stack` (not just update toasts) acceptable?**
      Recommendation: yes. It also carries dispatch toasts (no project ⇒ none) and
      GUI-064's install-refusal toast, which *should* be visible on the welcome
      screen. Note it in the PIR as an intended widening.

- [ ] **Should a dev hook be added to force an `UpdateStatusEvent`?** There is
      none today, which is why every manual check needs a whole local feed. A
      `KANMER_FAKE_UPDATE=<version>` branch in `initUpdater` would make the visual
      check one command and repeatable. Deferred: it is a product change to the
      main process, out of scope for a `fix`, and worth its own ticket if Q1 lands
      on (c).

- [ ] **`AGENTS.md` §7 says `CH.installUpdate` has "exactly **two** renderer call
      sites".** Stale since GUI-064 consolidated it to one (`App.tsx:489-499`).
      Not this ticket's job, but it is the paragraph an implementer reads before
      touching this code. Fold into the PR only if it is a one-line edit;
      otherwise its own chore ticket.
