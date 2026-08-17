# Plan — GUI-065: show update status on the welcome screen

Written FROM `research` and `files`. Research's line numbers are stale (GUI-070
removed the Backlog view, GUI-071 `5cab894` reshaped `App.tsx`); the numbers
below were re-located against the working tree at `3e9ee2c`.

## Approach

The bug is pure JSX placement — the updater is app-global, the subscription and
every derived value already run on the welcome screen, and **this ticket adds
zero IPC, zero preload and zero main-process code**. So: bind the three update
surfaces to local variables *above* the `if (!root || !board)` early return
(`App.tsx:1035-1045`), and render **the same variables** from both branches.
That keeps exactly one instance of each surface, which is what preserves the
documented single-`installUpdate()`-call-site invariant (`App.tsx:479-500`);
duplicating the banner markup into the welcome branch would break it.

The welcome branch gains a `<div className="app">` shell so the banner is a
flex-column sibling of `<Welcome/>` — the same ancestor chain the banner was
designed for (`styles.css` `.app { height:100%; display:flex;
flex-direction:column }`). `Welcome.tsx` therefore needs **no new prop** and
stays the 46-line presentational component it is; the alternative (a `banner`
slot prop) was rejected because the shell achieves the same with less API. The
one CSS change is `.welcome`: `height: 100%` → `flex: 1; min-height: 0`, because
`height:100%` inside a flex column that also holds a banner overflows `#root`.
`.toast-stack` and `.modal-backdrop` are `position: fixed`, so they move for
free.

Proof (operator-decided, both branches of Q1): a **component test** — the update
banner is extracted into `components/UpdateBanner.tsx` so a headless test can
render it, driven from a real `downloaded` `UpdateStatusEvent` through the real
`updateSurface()` — **and** a **screenshot** of the actual Electron app on the
welcome screen with a local dev update feed. Neither alone is sufficient and
`proof.md` will say so in those words.

## Governing docs

`refs: [docs/functional/frd/FRD-021-auto-update.md]`

- **Modifies — authorized.** FRD-021 **R1** today reads "an available update
  surfaces as a non-blocking banner/toast reusing the in-app toast stack". It is
  silent on the welcome screen (zero hits for welcome / no project / project
  open), so the current behaviour is a bug against R1's plain reading *and* the
  FRD cannot tell the next reader whether the silence was intended. R1 gains a
  clause: **"…on every screen, including with no project open."** The "Verified
  against code" line for R1 gains this ticket's reference. This is a
  clarification of existing intent, not a new requirement.
  FRD-021 is **not** compiled into the in-app manual
  (`scripts/build-manual.mjs` lists FRD-001/002/003/004/006/007/010/011/020), so
  no `npm run build:manual`; `npm run check:manual` is still run to verify that
  rather than assume it.
- **No new ADR.** No architectural decision is introduced — the testing-stack
  addition is a convention change, recorded in AGENTS.md §7 (below), not a
  design decision worth an ADR.

### AGENTS.md — two edits, both required, no others

1. **§7 — the testing-convention amendment (operator-authorized as part of Q2).**
   "`renderer/src/lib/` … are the **only** renderer code with vitest coverage"
   becomes false the moment this PR lands. It is amended to name the component
   test as the deliberate exception and to state the rule that still holds
   (logic goes in `lib/`; component tests exist only to prove *rendering*).
   This is a repo-wide convention change and is recorded as one.
2. **§7 — the stale invariant.** "`CH.installUpdate` has exactly **two**
   renderer call sites" has been wrong since GUI-064 consolidated it to one
   (`App.tsx:479-500`, whose own comment says so). One-line correction, taken
   here because it is the paragraph an implementer reads before touching this
   code.

**Nothing else in AGENTS.md is touched.** `git diff AGENTS.md` is inspected
before the commit.

## Steps

1. **Worktree.** `.worktrees/gui-065`, branch `gui-065-welcome-update-status`,
   off `origin/main`. `take_ticket`.
2. **Extract `components/UpdateBanner.tsx`.** Props `{ view: UpdateSurface;
   onRestart: () => void; onDismiss: () => void }`; renders the existing
   `.banner.info` markup verbatim when `view.kind === "banner"`, else `null`.
   No behaviour change, no new logic — the decision stays in
   `lib/update.ts:updateSurface`, which the component does not call.
3. **`App.tsx` — bind the three surfaces above the early return.** After
   `onRestartToUpdate` (currently `:507-517`), define `updateBanner`,
   `toastStack` and `restartConfirm` as JSX values. Delete the three inline
   blocks from the project branch (`:1126-1142`, `:1310-1326`, `:1357-1368`) and
   render the variables in the same positions. `pendingNav` / `pendingProject` /
   `pendingTake` / `pendingDelete` modals stay where they are — only
   `pendingRestart` moves.
4. **`App.tsx` — the welcome branch renders the same three.** Wrap in
   `<div className="app">`: `{updateBanner}`, `<Welcome …/>` unchanged,
   `{toastStack}`, `{restartConfirm}`.
5. **`styles.css` — `.welcome`.** `height: 100%` → `flex: 1; min-height: 0`, with
   a comment saying why (it is now always a flex child of `.app`, which may also
   hold the update banner).
6. **Test infrastructure.** Add `jsdom` and `@testing-library/react` to
   `apps/gui` devDependencies. The jsdom environment is turned on **per file**
   with a `// @vitest-environment jsdom` docblock rather than globally: `apps/gui`
   has 21 existing test files covering pure and main-process modules, and running
   all of them under jsdom is a change to tests this ticket has no business
   touching. If vitest cannot transform `.tsx` without a config, a minimal
   `apps/gui/vitest.config.ts` is added instead — decided empirically, not
   guessed.
7. **`components/UpdateBanner.test.tsx`.** Build a real
   `UpdateStatusEvent { phase: "downloaded", version: "9.9.9" }`, run it through
   `updateSurface(ev, false)`, render, assert the banner text and both buttons
   are in the document and that the callbacks fire. Assert `updateSurface(null,
   false)` and the `dismissed` case render nothing. State in a file comment what
   the test does **not** prove.
8. **FRD-021** — the R1 clause (Governing docs above).
9. **AGENTS.md** — the two edits, and only those two.
10. **Rail:** `npm test`, `npm run typecheck`, `npm run build:ui`,
    `npm run check:manual`, plus `npm run build -w @kanmer/gui`.
11. **Screenshot.** Write the gitignored `apps/gui/dev-app-update.yml`, serve a
    local feed (`latest.yml` + sha512-matching dummy artefact — a dummy, never a
    real installer), launch `KANMER_DEV_UPDATE=1 npx electron . --user-data-dir=
    <fresh>` with **no project open**, wait for `[updater] downloaded`, capture
    the renderer. Capture via the Electron remote-debugging port
    (`Page.captureScreenshot` over CDP) so the running binary is **unpatched** —
    no temporary source change is allowed to be part of what the screenshot
    shows. Reap every spawned PID: `child.kill()` does not reap Electron helpers
    and a stray `electron.exe` blocks `git worktree remove` at closeout.
12. **PIR, PR, review, merge, verify on merged main, proof, closeout.**

## Verification

`proof.md`, written on merged `main`, carries three things and is explicit about
the boundary between them:

- **The rail** — `npm test` / `npm run typecheck` / `npm run build:ui` /
  `npm run check:manual`. These are a **regression guard, not evidence for this
  ticket**: they are green on the broken code today and research says so
  (`research §7`).
- **The component test** — a genuine headless guard that a `downloaded` event
  renders the banner with working Restart/Later affordances. **What it does not
  prove:** that `App.tsx` mounts that component above the early return. No
  component test can; the mounting is the actual bug.
- **The screenshot** — the real Electron app, welcome screen, no project open,
  a `downloaded` update from a local feed, with the banner visible. This is the
  only artefact that closes the gap the component test leaves. It is a one-off:
  nothing re-runs it, and a regression would be silent. The board's
  `proof:visual` policy applies — the PNG is opened with the `Read` tool, looked
  at, and described in words that could not be written from the numbers.

## Risks / open questions

- **Layout regression on the welcome screen.** `.welcome`'s `height: 100%` →
  `flex: 1; min-height: 0` is a live change to a screen with no test.
  *Mitigation:* the screenshot is taken on the welcome screen, so the layout is
  inspected by eye as part of proof; a second screenshot with no update pending
  confirms the unchanged case.
- **The banner shifts the recents list.** With the banner above a centred
  `.welcome`, the centred content moves up by about half the banner height when
  the banner appears ~30 s in. This is inherent to a top banner and is smaller
  than the ticket's worry (which assumed the banner *pushing content down*).
  Accepted and stated in the PIR rather than engineered around.
- **`.toast-stack` widening.** Lifting the whole stack makes dispatch and
  install-refusal toasts visible on the welcome screen too. Intended (research
  and open-questions both recommend it) — a widening beyond the ticket title,
  stated in the PIR.
- **New devDeps.** Operator-authorized (Q2). Two packages, `apps/gui` only, and
  the AGENTS.md §7 convention amendment ships in the same PR.
- **`kanmerGit.test.ts` flakes under load** (pre-existing, GUI-085, six agents
  confirmed). *Mitigation:* rerun alone with `--testTimeout=30000` and move on.
- **Stray `electron.exe`.** `child.kill()` does not reap helper processes and a
  survivor blocks `git worktree remove`. *Mitigation:* enumerate and kill by PID
  tree after the screenshot, and verify none remain before closeout.
