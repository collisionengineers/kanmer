# Review — GUI-065 (PR #61)

**I am both the author and the reviewer of this change. This is not an
independent review and should not be read as one.** What follows is a
self-check against the diff, the report and the governing doc, done with the
review skill's checklist rather than from memory.

Reviewed at `17581bf` on `gui-065-welcome-update-status`, against `origin/main`
at `d1ef063`.

## Changes — what the diff actually does, in my own words

- **`App.tsx`** — three JSX values (`updateBanner`, `toastStack`,
  `restartConfirm`) are introduced immediately before the `if (!root || !board)`
  return, and the three inline blocks that previously lived at `:1126-1142`,
  `:1310-1326` and `:1357-1368` are replaced by references to them. The welcome
  branch is wrapped in `<div className="app">` and renders the same three. Net
  effect on the project branch: **pure substitution** — the replaced markup is
  byte-identical to what the values expand to (the banner via the new
  component). Net effect on the welcome branch: it gains a shell and three
  surfaces it never had.
- **`UpdateBanner.tsx`** — new. The `.banner.info` markup lifted verbatim
  behind `{ view, onRestart, onDismiss }`. `if (view.kind !== "banner") return
  null;` and nothing else. No `updateSurface()` call, no state, no effects.
- **`UpdateBanner.test.tsx`** — new; four cases (downloaded / dismissed / null /
  downloading), all driven through the real `updateSurface()`.
- **`styles.css`** — one rule, three lines: `.welcome` loses `height: 100%` and
  gains `flex: 1; min-height: 0`, with a comment.
- **`package.json` / `package-lock.json`** — two devDeps; lockfile +616/−0.
- **`FRD-021`** — R1 clause + an `## Amended — GUI-065` section.
- **`AGENTS.md`** — +3/−2, two bullets.

## Comments

**C1 — non-blocking. `@kanmer/ui` re-exports `Welcome`, and its height
behaviour outside a flex parent changes.** `packages/ui/src/index.ts:31`
re-exports this exact component with this exact stylesheet as the design system.
`flex: 1` is inert outside a flex container, so a `@kanmer/ui` consumer
rendering `<Welcome/>` in a plain block now gets shrink-to-content instead of
fill-height. Inside the GUI this cannot happen — `Welcome` has exactly one call
site and it is inside `.app`. The alternatives are all worse: `height: 100%`
alongside `flex: 1` reintroduces the overflow this ticket exists to avoid, and
`min-height: 100%` does the same. **Disposition: won't-do-because** — a
design-system preview harness is expected to give a full-screen component a
sized parent, and trading the app's correctness for the preview's convenience is
the wrong way round. Recorded here so it is not a surprise.

**C2 — non-blocking. `UpdateBanner` is not re-exported from `@kanmer/ui`.**
Most renderer components are (`packages/ui/src/index.ts:13-31`), though not all
— `GroupView` is not either, so the list is not exhaustive and this is not a
broken invariant. Adding it would also want a `docs/components` entry.
**Disposition: won't-do-because** — unplanned extras belong in their own ticket,
not smuggled into a fix. It is one line whenever the design system next gets
attention.

**C3 — non-blocking. The toast stack's click handler now runs on a screen with
no project.** `onClick` does `if (t.id) { setView("ticket"); trySelect(t.id); }`.
Checked every producer: update toasts (`:474`) and install-refusal toasts
(`:497`) both pass `id: null`; the only toasts carrying an id are dispatch
(`:436`) and agent-change, neither of which can be produced without a project
open. So the `t.id` branch is unreachable on the welcome screen and the toast
just dismisses itself. **Disposition: verified, no change.**

**C4 — non-blocking, already corrected in the documents.** `plan.md` predicted
the centred welcome content would shift **up** by about half a banner height.
The measurement says **down**, by ~18px: `.welcome` now begins at y=37 and
re-centres inside the shorter box. Half the banner height rather than the full
37px the ticket feared, but in the direction the ticket feared.
**Disposition: fixed-in-PR** — corrected in the checklist progress notes and in
the report's risk list rather than left as a wrong prediction in the plan.

**C5 — blocking if it were true; checked and it is not. The single-call-site
invariant.** `grep` for `installUpdate(` in `renderer/` returns exactly one
call, in `startInstall` (`App.tsx:493`). Duplicating the banner markup into the
welcome branch was the obvious wrong fix and would have created a second
`onRestartToUpdate → startInstall` path; the shared-value shape is what avoids
it. AGENTS.md §7 now says one rather than two, which it has been since GUI-064.
**Disposition: verified, no change.**

**C6 — non-blocking. The `.toast-stack` widening is beyond the ticket title.**
Lifting the whole stack makes dispatch and install-refusal toasts visible on the
welcome screen. Intended (research and open-questions both recommend it, and it
is the *only* way Help ▸ Check for Updates… stops being silent), and stated in
the PIR as an intended widening. **Disposition: verified, stated.**

## Report against diff

Every file in the diff appears in the report's Changes table with a rationale
that matches what the code does, and nothing is in the diff that the table does
not mention. The report's headline claim — "zero IPC, zero preload, zero
main-process code" — holds: `git diff --stat` touches nothing under `main/`,
`preload/` or `shared/`.

## Governing docs

`plan.md` § Governing docs declares FRD-021 **modified with authorization**, and
the operator's authorization is recorded verbatim in `open-questions`. The diff
matches the declaration: R1 gains exactly the clause the plan names, plus an
amendment section in the same style as the existing `## Amended — GUI-064` and
`## Amended — GUI-066` sections. No requirement was weakened; R2 is untouched
and the restart gate still runs in the renderer before the IPC call. No ADR was
claimed and none is needed. `npm run check:manual` was run rather than assumed —
19 chapters, up to date — confirming FRD-021 is not compiled into the manual.

The `files` document's ripple list was followed: single-call-site invariant
(C5), shared toasts (C6), modals (only `pendingRestart` moved — the other four
are untouched in the diff), tests, docs, build artefacts (none).

The AGENTS.md edit is exactly the two the operator required and no more —
verified by reading `git diff AGENTS.md` in full, +3/−2.

## Verdict

**Pass.** Checked: the full diff; the report against the diff; the plan's
Governing-docs section against the FRD change and the recorded authorization;
the single-`installUpdate()`-call-site invariant by grep; every toast producer
for C3; `@kanmer/ui`'s re-export surface for C1/C2; and the rail (`npm test` 19
chapters / 232 / 261 / fail 0, `npm run typecheck` all four workspaces,
`build:ui`, `build -w @kanmer/gui`).

The evidence I weighed hardest is the one thing the test suite cannot give: the
pre-fix bundle under the **same** `downloaded` state renders `shell: "welcome"`,
`banner: null`, `toastStack: false`, and this PR's bundle renders
`shell: "app"`, `banner: [0,0,1264,37]`, `toastStack: true`, with the no-update
case byte-for-byte the pre-fix geometry. That is the bug reproduced and removed
under one variable. It remains a one-off artefact, not a guard — said so in the
test file, the report and `proof.md`.

Merging and moving to Verifying under the standing delegation.
