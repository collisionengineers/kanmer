# Files — GUI-065

All paths repo-relative to `C:\Users\PC\Documents\GitHub\kanmer`.

## Files the change touches

| Path | What changes | Risk |
|---|---|---|
| `apps/gui/src/renderer/src/App.tsx` | The three update surfaces move above the `if (!root || !board)` early return (`:1034-1044`) so both branches render them: the banner (`:1131-1147`), the `.toast-stack` (`:1340-1356`), the `pendingRestart` `ConfirmModal` (`:1387-1398`). Likely a shared wrapper/fragment rather than duplicated markup. | **High.** 65 KB single-component file; the early return sits in the middle of the render body. Duplicating the banner would create a second `onRestartToUpdate`→`startInstall` path and break the documented "exactly ONE call site" invariant at `:489-499` (AGENTS.md §7). Moving the toast stack out of `.app` is safe (fixed positioning) but it also carries non-update toasts (dispatch results, `startInstall` refusals) — they must not double-render. |
| `apps/gui/src/renderer/src/components/Welcome.tsx` | Gains a slot for the banner (a `children`/`banner` prop, or an outer shell around it). 46 lines, purely presentational today. | Low, if it stays presentational. Passing `update`/`onRestart` handlers into it instead of a rendered node would spread updater logic into a component that has none. |
| `apps/gui/src/renderer/src/styles.css` | `.welcome` (`:101-109`) is `height:100%` + `align-items:center`; `.banner`/`.banner.info` (`:168-188`) is a full-bleed block built for `.app`'s flex column (`:121-125`). One of the two must give — a shell wrapper, or `.welcome { flex:1; min-height:0 }` under one. | **Medium.** `#root` is `height:100%` (`:35-40`), so a banner as a plain sibling above a `height:100%` `.welcome` overflows the viewport. Getting this wrong is a visible scroll bar or a squashed welcome screen. Also the ticket's own concern: a banner appearing ~30 s after launch must not shove the recents list (`.recents` `:551-556`) under a hovering cursor. |
| `docs/functional/frd/FRD-021-auto-update.md` | R1 gains a clause scoping the surface to every screen including "no project open" (today it is silent — zero hits for welcome / no project / project open). | Low. **Not** one of the FRDs embedded in the in-app manual (`scripts/build-manual.mjs:29-37`), so no `npm run build:manual` and no `check:manual` failure. |
| `apps/gui/src/renderer/src/lib/update.test.ts` **or** a new component test | Only if the evidence decision (open-questions Q1) lands on a component test. Would be the repo's first React-rendering test. | **Medium/decision.** Requires new devDeps (`jsdom`, `@testing-library/react`) and a vitest `environment: "jsdom"` — a precedent for the whole repo, not a local choice. |
| `apps/gui/package.json` | Only under the same condition: `jsdom` + `@testing-library/react` devDeps. | Low mechanically, but it is a repo-wide testing-stack commitment. |

## Deliberately NOT touched

| Path | Why not |
|---|---|
| `apps/gui/src/main/updater.ts` | The state is already app-global (`:53`, `:60-72`) with no project scoping. Nothing to change. |
| `apps/gui/src/main/index.ts` | `:826-837` (getUpdateState / mcpSessions / installUpdate) and `:861` (push to `mainWindow`) are already unconditional; Help ▸ Check for Updates… (`:327-331`) is already ungated. |
| `apps/gui/src/preload/index.ts` | `:104-111` already exposes all four members with no project argument. **The IPC/preload surface the welcome screen needs exists in full — this ticket adds none.** |
| `apps/gui/src/shared/ipc.ts` | Channels `:102-109` and types `:118-138` are complete and carry no project id. |
| `apps/gui/src/renderer/src/lib/update.ts` | `updateSurface` / `restartWarning` are correct and screen-agnostic. The bug is JSX placement, not decision logic. Changing them would be treating a symptom that does not exist. |
| `apps/gui/src/main/mcp-sessions.ts` | The restart gate is app-wide by design and already correct with no project open (`selectedId` null, `editorDirty` false → the warning reduces to the MCP clause). |
| GUI-064's install-refusal path | Orthogonal. The refusal toast already flows through the same `.toast-stack` this ticket lifts, so it is *fixed by* the move, not modified. |

## Ripple effects

- **The single-call-site invariant.** `App.tsx:489-499` documents that
  `window.kanmer.installUpdate()` has exactly one call site, deliberately, because
  GUI-064 gave it a return value two places would have to handle identically. Any
  fix that copies the banner into the welcome branch violates this. `AGENTS.md`
  §7 still says "exactly **two** renderer call sites" — stale prose from before
  GUI-064; an implementer reading it will be misled.
- **Toasts are shared.** `.toast-stack` renders dispatch-status toasts
  (`App.tsx:441-448`) and install-refusal toasts (`:505-508`) as well as update
  toasts. Lifting it means those also become visible on the welcome screen —
  correct for refusals, harmless for dispatch (no project ⇒ no dispatches), but it
  is a behaviour change beyond the ticket's title and should be stated in the PIR.
- **Modals.** `pendingNav` / `pendingProject` / `pendingTake` / `pendingDelete`
  `ConfirmModal`s stay below the early return. Only `pendingRestart` moves.
  Splitting the modal block is the easiest place to move the wrong one.
- **Tests.** `apps/gui/src/renderer/src/lib/update.test.ts` will keep passing
  either way; it does not and cannot cover this. `npm test` +
  `npm run typecheck` are both **green on the broken code today** — so neither is
  evidence for this ticket. See research §7 and Q1.
- **Docs.** FRD-021 gains a line (no manual rebuild). If a testing stack is
  added, `AGENTS.md` §7's claim that `renderer/src/lib/` is "the **only** renderer
  code with vitest coverage" becomes false and must be amended in the same PR.
- **Build artefacts.** None. No new dependency for the fix itself; `electron-vite`
  externalization rules (`electron-updater` only, main build) are untouched.

## Context files — read these before writing a line

| Path | What it tells you |
|---|---|
| `apps/gui/src/renderer/src/App.tsx:452-526` | The whole updater wiring block: the no-`root` subscription with its comment saying updates are app-global, `updateView`, the toast effect, `startInstall` with the ONE-CALL-SITE invariant, and `onRestartToUpdate` with the probe-before-IPC rule. Everything here already runs on the welcome screen. |
| `apps/gui/src/renderer/src/lib/update.ts` | Why the gate lives in the renderer and why `restartWarning` must run before the IPC call. Do not move it. |
| `apps/gui/src/main/updater.ts:13-26,84-140,199-249` | Why `quitAndInstall()` cannot be guarded after the fact; the schedule; `KANMER_DEV_UPDATE=1` (`:89-92`) is the documented opt-in for driving a local feed in dev — the only way to see this bug or its fix by eye. |
| `apps/gui/src/renderer/src/styles.css:35-40,101-125,168-188,551-556,1068-1076` | The exact layout constraint: `#root`/`.welcome` at `height:100%`, `.banner` as a full-bleed `.app` child, `.recents` below, `.toast-stack` fixed. This is where the layout risk is decided. |
| `AGENTS.md` §7 (updater bullets) and §8 gotcha 10 | The invariants: no third `installUpdate` call site, no `quitAndInstall()` outside `installUpdateNow()`, `electron-updater` externalized in the main build only. Note the "two call sites" line is stale. |
| `docs/functional/frd/FRD-021-auto-update.md` | R1/R2 and the two "Verified against code" sections. R1 is the requirement this bug violates, and the section that needs the new clause. |
