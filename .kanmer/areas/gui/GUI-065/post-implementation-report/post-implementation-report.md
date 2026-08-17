# Post-implementation report — GUI-065

## Summary

With no project open the app showed nothing about an available update. The
updater was already app-global and already worked on the welcome screen — the
subscription, `updateView`, the toast effect, `startInstall` and
`onRestartToUpdate` all run above `App.tsx`'s `if (!root || !board)` early
return — but every surface that *renders* the result sat below it. So the check
ran, the download completed, and it all rendered into a subtree the welcome
screen never mounted. Help ▸ Check for Updates… produced absolute silence.

This PR adds **zero IPC, zero preload and zero main-process code**. The three
surfaces (banner, `.toast-stack`, restart `ConfirmModal`) are bound once as JSX
values above the early return and rendered from both branches; the welcome
branch gains a `<div className="app">` shell so the banner has the flex-column
ancestor it was designed for. The banner itself is extracted to a component so
it can be rendered headlessly.

Verified live: a real Electron run against a real local update feed, welcome
screen, no project open, produced this DOM —

```
UPDATE  {"status":{"phase":"downloaded","version":"9.9.9"},"source":"auto"}
SHELL   app
LAYOUT  {"banner":[0,0,1264,37],"welcome":[0,37,1264,719],
         "toastStack":[1043,699,205,42],"viewport":[1264,756],
         "scrollHeight":756,"overflows":false}
HTML    <div class="app">
          <div class="banner info"><span>Kanmer 9.9.9 is ready to install.</span>
            <div class="conflict-actions">
              <button class="primary xs">Restart now</button>
              <button class="ghost xs" title="Installs the next time you quit Kanmer.">Later</button>
            </div></div>
          <div class="welcome">…</div>
          <div class="toast-stack"><button class="toast">Kanmer 9.9.9 is downloading…</button></div>
        </div>
```

## Changes

| File | Change | Why |
|---|---|---|
| `apps/gui/src/renderer/src/App.tsx` | modified | `updateBanner`, `toastStack` and `restartConfirm` are bound as JSX values above the early return and rendered from both branches; the three inline blocks are gone from the project branch; the welcome branch is wrapped in `<div className="app">`. Values, not duplicated markup — that is what keeps **one** banner instance and therefore keeps `installUpdate()`'s single call site. The other four modals (`pendingNav` / `pendingProject` / `pendingTake` / `pendingDelete`) stay below the return; only `pendingRestart` moved. |
| `apps/gui/src/renderer/src/components/UpdateBanner.tsx` | added | The `.banner.info` markup, verbatim, as a component. Two reasons in order: one instance rendered from one value, and something a headless test can render. **No decision logic** — `updateSurface()` still decides; the component only draws. |
| `apps/gui/src/renderer/src/components/UpdateBanner.test.tsx` | added | The repo's first React-rendering test. Drives a real `downloaded` `UpdateStatusEvent` through the real `updateSurface()` and asserts the banner, its version text, both buttons and their callbacks; asserts nothing renders for `null`, for `dismissed`, and for `downloading`. The file states what it does **not** prove. |
| `apps/gui/src/renderer/src/styles.css` | modified | `.welcome` `height: 100%` → `flex: 1; min-height: 0`. It is now always a flex child of `.app`, which may also hold the banner; `height: 100%` would resolve against the whole container and push the banner's height off the bottom of `#root`. Commented in place. |
| `apps/gui/package.json`, `package-lock.json` | modified | `jsdom` + `@testing-library/react` devDeps (operator-authorized, open-questions Q2). Lockfile diff is **616 insertions, 0 deletions** — purely additive, no existing tree moved. |
| `docs/functional/frd/FRD-021-auto-update.md` | modified | R1 gains "on every screen, including with no project open", plus an `## Amended — GUI-065` section. Authorized modification — see Governing docs. |
| `AGENTS.md` | modified | Exactly two edits, both required, no others (`git diff AGENTS.md` = 3 insertions, 2 deletions). See below. |

### The two AGENTS.md edits

1. **§7, the testing convention (the condition the operator attached to Q2).**
   "`renderer/src/lib/` … are the **only** renderer code with vitest coverage"
   stops being true the moment this lands, so it is amended rather than left to
   rot: the component test is named as the deliberate exception, the rule that
   still holds is restated (*a component test is not a place to put logic*), and
   the mechanism is written down — jsdom per file via `// @vitest-environment
   jsdom` docblock, no vitest config file. This is a repo-wide convention
   change and is recorded as one, not slipped in.
2. **§7, a stale invariant.** "`CH.installUpdate` has exactly **two** renderer
   call sites" has been wrong since GUI-064 consolidated it to one — `App.tsx`'s
   own comment says so. Corrected, with a note that this is exactly why GUI-065
   lifted shared values rather than duplicating markup.

### Deliberately not touched

`main/updater.ts`, `main/index.ts`, `preload/index.ts`, `shared/ipc.ts`,
`lib/update.ts`, `main/mcp-sessions.ts`, `Welcome.tsx`. The updater state is
app-global with no project scoping and the preload surface the welcome screen
needs already existed in full. `Welcome.tsx` needed no prop because the shell
does the job — it stays the 46-line presentational component it was.

## Governing docs

`refs: [docs/functional/frd/FRD-021-auto-update.md]` — **modified, with explicit
operator authorization recorded in `plan.md` § Governing docs.**

- **R1** said "an available update surfaces as a non-blocking banner/toast
  reusing the in-app toast stack" and never said *where*. It has zero mentions
  of the welcome screen, and neither do the updater research documents or
  GUI-017 — this was never a decision, it was an omission. R1 now reads
  "…**on every screen, including with no project open**", so the next reader
  cannot mistake the silence for intent. The behaviour was already a bug against
  R1's plain reading; the clause records that rather than changing the
  requirement.
- **R2 is untouched and still holds.** The restart gate still runs in the
  renderer, before the IPC call, through the same single `startInstall` call
  site. `restartWarning` needed no change: with no project open `editorDirty` is
  false and `selectedId` is null, so the warning reduces to the MCP-session
  clause, which is app-wide and correct.
- An `## Amended — GUI-065` section records the mechanism and flags two stale
  code references in the older "Verified against code" block (the banner's line
  number, and R2's "two call sites").
- **No new ADR.** No architectural decision is introduced. The testing-stack
  addition is a convention, and conventions live in AGENTS.md §7.
- **No manual ripple.** FRD-021 is not one of the FRDs compiled into the in-app
  manual, and `npm run check:manual` was run to confirm that rather than assume
  it — 19 chapters, up to date.

## Risks / follow-ups

- **The toast stack widened beyond the ticket's title, on purpose.** It carries
  dispatch toasts (no project ⇒ none are produced) and GUI-064's install-refusal
  toast as well as update toasts. All three are now visible on the welcome
  screen. Correct for the refusal — that is exactly where a user with no project
  open needs to see why an install was refused.
- **The recents list shifts by ~18px when the banner appears** (~30 s after
  launch), not the ~37px the ticket feared, and **down**, not up: `.welcome`
  starts below the banner, so its centred content re-centres in the shorter box.
  Measured, not estimated — see proof. Inherent to a top banner; accepted rather
  than engineered around.
- **The component test cannot prove the mounting.** That is the actual bug and it
  lives in the caller. The gap is closed by evidence, not by the test suite: a
  regression that moved the surfaces back below the early return would pass
  `npm test`. Stated in the test file, in `proof.md`, and here.
- **This host cannot photograph the Electron window.** Its compositor produces no
  frames for the app window — `Page.captureScreenshot` hangs, `Page.startScreencast`
  yields zero frames, and GDI `PrintWindow` returns the initial paint only, before
  and after a forced `MoveWindow` + `RedrawWindow`. Verified in all three
  directions, not assumed. The live Electron evidence is therefore DOM and layout
  rather than pixels, and the pixels come from headless Chromium over the same
  built bundle. Both halves are in `proof.md` with the boundary between them named.
- **No follow-up tickets filed.** The deferred `KANMER_FAKE_UPDATE` dev hook
  (open-questions) is weaker now than research expected: the repeatable guard is
  the component test, and the feed dance is the deliberately one-off part.

## Verification hand-off

On merged `main`, from the main checkout:

1. `npm test` — expect `check:manual` "up to date (19 chapters)", core 232,
   gui **261** (was 256: +4 from `UpdateBanner.test.tsx`, +1 elsewhere on main),
   `test:scripts` `fail 0`.
2. `npm run typecheck` — all four workspaces named and clean (the `.test.tsx` is
   inside `tsconfig.web.json`'s include, so it is type-checked).
3. `npm run build:ui` and `npm run build -w @kanmer/gui`.
4. `npm run check:manual` — confirms the FRD-021 edit caused no manual ripple.
5. **The visual pair.** Reproduce with the scratchpad harness described in
   `proof.md`: headless Chromium over `apps/gui/out/renderer`, `window.kanmer`
   stubbed, with the `downloaded` state — expect `shell: "app"`,
   `banner: [0,0,1264,37]`, `welcome: [0,37,1264,719]`, `overflows: false`; and
   with no update — expect `banner: null`, `welcome: [0,0,1264,756]`, i.e.
   pixel-identical to the pre-fix screen. The pre-fix bundle under the **same**
   `downloaded` state gives `shell: "welcome"`, `banner: null`,
   `toastStack: false` — that is the bug, reproduced.
6. Open the PNGs with `Read` and look at them. The board's `proof:visual` policy
   applies: describe what they show in words the numbers could not produce.
