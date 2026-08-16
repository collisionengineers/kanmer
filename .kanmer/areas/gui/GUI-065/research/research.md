# Research — GUI-065: update status on the welcome screen

## The question

With no project open the app shows nothing about an available update. Where does
the update state live, where is it rendered, what IPC/preload surface would the
welcome screen need to subscribe to it — and does that surface already exist?

Second question, asked by the pipeline rather than the user: can this fix be
evidenced without a human at the keyboard?

## Findings

### 1. The updater state is already app-global. Nothing is project-scoped.

`apps/gui/src/main/updater.ts` holds one module-level `state: UpdateStatusEvent`
(`:53`), pushed through one channel by `emit()` (`:60-67`) and readable at any
time via `updateState()` (`:70-72`). There is no project id anywhere in the
updater, the phase type, or the event.

`apps/gui/src/main/index.ts:861` wires the push as
`initUpdater((payload) => mainWindow?.webContents.send(CH.updateStatus, payload))` —
a single window, always the same one, no project condition. `:826` serves
`CH.getUpdateState`, `:827` `CH.mcpSessions`, `:828-837` `CH.installUpdate`
(refused unless the phase is `downloaded`).

**Source:** `main/updater.ts:44-72,84-140`, `main/index.ts:826-837,861`.

### 2. The preload surface the welcome screen needs already exists in full.

`apps/gui/src/preload/index.ts:104-111` exposes all four members with no project
argument:

- `getUpdateState()` → `CH.getUpdateState`
- `installUpdate()` → `CH.installUpdate`
- `mcpSessions()` → `CH.mcpSessions`
- `onUpdateStatus(cb)` → subscribe/unsubscribe on `CH.updateStatus`

Typed in `shared/ipc.ts:494-511`, channels at `:102-109`, payload types at
`:118-138`.

**Implication: this ticket needs no IPC work, no preload work, and no main-process
work. It is entirely a renderer-tree placement problem.** That is the single most
important finding for planning — the "welcome screen subscribes to the same
state" framing is already satisfied; there is only one subscriber and it is
`App.tsx`, which mounts on both branches.

### 3. The subscription and every piece of derived state already run on the welcome screen.

Everything in `App.tsx` above the early return executes regardless of whether a
project is open:

| What | Where | Runs on welcome? |
|---|---|---|
| `update`, `updateDismissed`, `pendingRestart` state | `App.tsx:150-153` | yes |
| `getUpdateState()` + `onUpdateStatus` subscription (comment: "No `root` dependency: updates are app-global, not project-scoped") | `App.tsx:452-458` | yes |
| `updateView = updateSurface(update, updateDismissed)` | `App.tsx:460` | yes |
| effect pushing update toasts into `toasts` | `App.tsx:478-486` | yes — the state updates, nothing renders it |
| `startInstall` (the single `installUpdate()` call site) | `App.tsx:500-509` | yes |
| `onRestartToUpdate` (probe + `restartWarning` gate) | `App.tsx:516-526` | yes |

The early return is `App.tsx:1034-1044`. Everything that *renders* is below it:

| Surface | Where |
|---|---|
| update banner (`Kanmer x.y.z is ready to install`, Restart now / Later) | `App.tsx:1131-1147` |
| toast stack `<div className="toast-stack">` | `App.tsx:1340-1356` |
| restart `ConfirmModal` ("Restart and update") | `App.tsx:1387-1398` |

So the check runs, the download completes, `updateView` becomes
`{kind:"banner"}`, toasts are appended to state — and none of it is on screen.
The state machine is correct; only three JSX blocks are in the wrong subtree.

(The ticket body cites `:1015`, `:1112`, `:1371`, `:452`. The file has grown
since; the numbers above are current as of the working tree at research time.)

### 4. Help ▸ Check for Updates… is not gated on a project, and never was.

`main/index.ts:327-331` — `enabled: isUpdaterEnabled()`, `click: () =>
checkForUpdatesNow("manual")`. It calls straight into the updater in main; it
does not route through the renderer's menu handling at all. So on the welcome
screen the manual check genuinely runs, and its result (`phase:"none"` →
"Kanmer x is up to date", or `phase:"error"`) is turned into a toast in state by
`App.tsx:478-486` and then dropped on the floor for want of a `.toast-stack`.
This is the sharpest form of the bug: the user clicks a menu item and gets
absolute silence.

### 5. Layout: the toasts and the modal are free; the banner is not.

- `.toast-stack` is `position: fixed; right:16px; bottom:16px; z-index:60`
  (`styles.css:1068-1076`) — it does not depend on being inside `.app`. Moving it
  above the early return, or duplicating it, is visually free.
- `.modal-backdrop` is `position: fixed; inset: 0; z-index: 20`
  (`styles.css:720-727`) — same, the restart confirm renders correctly anywhere.
- `.banner` is the problem. It is a full-bleed block: `padding: 6px 12px;
  border-bottom: 1px solid` (`styles.css:168-172`, `.banner.info` `:181-188`),
  designed as a direct child of `.app { height:100%; display:flex;
  flex-direction:column }` (`:121-125`). `.welcome` is `height:100%;
  display:flex; flex-direction:column; align-items:center; justify-content:center`
  (`styles.css:101-109`). Two consequences:
  1. Dropped *inside* `.welcome`, `align-items:center` shrink-wraps the banner to
     its content and centres it — it stops looking like a banner.
  2. Placed as a *sibling above* `.welcome`, the `height:100%` on `.welcome`
     plus the banner's height overflows `#root` (also `height:100%`,
     `styles.css:35-40`).

  So a welcome-path banner needs a small CSS change — a shell wrapper, or
  `.welcome` becoming `flex:1; min-height:0` under one. The ticket's own note
  ("somewhere sane to put a banner without shifting the recents list under the
  cursor") is the same concern: the banner appearing 30 s after launch will push
  the recents list down under a hovering cursor unless it is placed where that
  does not happen.

`Welcome.tsx` is a 46-line pure presentational component
(`components/Welcome.tsx`) with props `recentProjects / onPick / onOpen / error /
opening`. It has no update awareness and no obvious slot; adding one is a
one-prop change.

### 6. FRD-021 does not mention the welcome screen. It needs a line.

`docs/functional/frd/FRD-021-auto-update.md` — searched for "welcome", "no
project", "project open": zero hits. R1 says an available update "surfaces as a
non-blocking banner/toast reusing the in-app toast stack" and R2 gates restart on
unsaved work and live MCP sessions. Neither statement scopes itself to a project
being open, and neither excludes the welcome screen.

**Verdict: this is a bug against the plain reading of R1, but the FRD is silent
on the case, so the FRD also owes a clarifying line** — e.g. R1 extended with
"…on every screen, including with no project open". Without it, the next reader
cannot tell whether welcome-screen silence was intentional. Nothing in the prior
updater research (`docs/plans/updater/`) or GUI-017's documents mentions the
welcome screen either — it was never considered, not deliberately deferred.

FRD-021 is **not** one of the FRDs embedded in the in-app manual
(`scripts/build-manual.mjs:29-37` lists FRD-001/002/003/004/006/007/010/011/020),
so editing it does not require `npm run build:manual` and will not trip
`npm run check:manual`.

### 7. How this can be evidenced without a human — the honest answer

**There is no existing headless path that can distinguish the fixed app from the
broken one.**

- `updateSurface` and `restartWarning` in `renderer/src/lib/update.ts` are pure
  and already covered by `lib/update.test.ts` (17 assertions). **Those tests pass
  identically on the broken code** — the bug is not in the decision, it is in
  where the JSX sits. A new pure test in `lib/` therefore proves nothing about
  this ticket. Claiming otherwise would be a fake proof.
- There is **no component-test infrastructure at all**: `apps/gui/package.json`
  has no `jsdom`, no `@testing-library/react`, and there is no `vitest.config.ts`
  (vitest runs off `electron.vite.config.ts` defaults, node environment). All 21
  test files in `apps/gui/src` test pure modules or main-process modules. No test
  in the repo renders React.
- There is no Playwright/Spectron/electron driver, so nothing can drive the built
  app.
- `npm run dist:check` (`scripts/check-updater-package.mjs`) checks the *package*
  can self-update; it says nothing about renderer placement.

That leaves three candidate proofs, in descending honesty:

1. **Component test (real, costs new devDeps).** Add `jsdom` +
   `@testing-library/react`, set `test.environment: "jsdom"`, extract the update
   surface into a small component (banner + Later/Restart buttons) that both
   branches render, and assert it renders the banner for a `downloaded` event and
   nothing for `idle`. This is a genuine headless regression guard for "the
   welcome screen can show the banner". Its residual gap: it proves the component
   works, not that `App.tsx` mounts it above the early return — unless the fix is
   shaped so the welcome branch renders that component through a tested path.
   This would be the repo's first React test, i.e. two new devDeps and a vitest
   config: a real, if small, precedent decision.
2. **Source-shape assertion (cheap, brittle, weak).** A vitest test that reads
   `App.tsx` and asserts the update-surface JSX appears before the
   `if (!root || !board)` return. It genuinely catches the regression and costs
   nothing, but it is a text assertion about a file, not about behaviour; the repo
   has precedent for source-text checks only in `scripts/*.mjs`
   (`verify-agents-block.mjs`, `check-plugin-sync.mjs`), never in vitest.
3. **Screenshot (complete, and an agent can actually take it).** Write
   `apps/gui/dev-app-update.yml` (gitignored, `.gitignore:25`; it does not exist
   in this checkout), serve a local feed with a newer `latest.yml` whose sha512
   matches a dummy artefact, launch with `KANMER_DEV_UPDATE=1` (`updater.ts:89-92`
   is the documented opt-in for exactly this), wait for `downloaded`, screenshot
   the welcome window. `autoDownload` is on so it will fetch the blob. This is
   feasible for an agent on this Windows host, but it is a manual-run artefact,
   not a test — nothing re-runs it in CI.

**Bottom line for autonomous closure:** with only `npm test` + `npm run
typecheck` as evidence, this ticket **cannot honestly close** — both pass on the
broken code. It can close autonomously only if (1) is taken (new devDeps,
accepted by the operator) or if a screenshot from (3) is accepted as proof. The
cheapest *repeatable* thing that also makes the screenshot path trivial is a
main-process dev hook that forces a `downloaded` phase (there is none today);
that is a product change and is raised in open-questions.

## What this implies for the ticket

- Zero main/preload/IPC work. The change is renderer JSX placement plus a small
  CSS accommodation and a one-prop change to `Welcome.tsx`.
- All three surfaces must move, not just the banner: the banner, the
  `.toast-stack`, and the `pendingRestart` `ConfirmModal`. Moving only the banner
  leaves Help ▸ Check for Updates… silent (finding 4) and leaves "Restart now" on
  the welcome screen opening a modal that never renders — a worse bug than the
  one being fixed.
- The `restartWarning` gate needs no change: `editorDirty.current` is false and
  `selectedId` is null with no project open, so the warning reduces to the MCP
  session clause, which is app-wide and correct. The single-call-site invariant on
  `installUpdate()` (`App.tsx:489-499`) must survive the move — do not duplicate
  the banner markup into both branches.
- FRD-021 needs a clarifying line on R1 (finding 6). No manual rebuild needed.
- `AGENTS.md` §7 currently says "`CH.installUpdate` has exactly **two** renderer
  call sites" — stale since GUI-064 consolidated it to one (`App.tsx:489`). Not
  this ticket's job, but the same paragraph is the one an implementer will read
  before touching this code.
