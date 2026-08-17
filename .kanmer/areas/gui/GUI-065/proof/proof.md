# Proof — GUI-065

Gathered on **merged `main` at `6dbb284`** ("fix(gui): show update status on the
welcome screen (GUI-065) (#61)"), not on the feature branch. PR
[#61](https://github.com/collisionengineers/kanmer/pull/61), squash-merged
2026-08-17T00:31:46Z. Branch commit `17581bf`.

## Read this first — what is and is not established

The operator settled the evidence question as **(a) + (c)**: a real headless
component test *and* a screenshot. Both are here, and the boundary between them
matters more than either.

- **The rail (`npm test`, `npm run typecheck`, `build:ui`, `check:manual`) is a
  regression guard, not evidence for this ticket.** All of it was green on the
  broken code. `lib/update.test.ts` — 17 assertions over `updateSurface` and
  `restartWarning` — passes identically before and after, because the bug was
  never in the decision. Anyone who reads the green rail as proof of this fix
  has misread it.
- **The component test proves the banner, not the mounting.**
  `UpdateBanner.test.tsx` takes a real `UpdateStatusEvent` with
  `phase: "downloaded"`, runs it through the real `updateSurface()`, renders the
  real component under jsdom, and asserts the version text, both buttons and
  both callbacks — plus that nothing renders for `null`, for `dismissed`, and
  for `downloading`. **It cannot prove that `App.tsx` mounts that component
  above the `if (!root || !board)` early return**, and the mounting *is* the
  bug. It lives in the caller; no component test can see it. If someone moves
  the three surfaces back below the early return tomorrow, these four tests
  still pass. That is stated in the test file itself, not only here.
- **The visual evidence is what closes that gap, and it is a one-off.** Nothing
  re-runs it. A regression in the mounting would be silent in CI — there is no
  CI — and silent in `npm test`.

## Evidence

### 1. The rail, on merged `main` at `6dbb284`

```
$ npm run check:manual
manual: up to date (19 chapters)

$ npm test
  check:manual   manual: up to date (19 chapters)
  @kanmer/core   Test Files 11 passed (11)   Tests 249 passed (249)
  @kanmer/gui    Test Files 24 passed (24)   Tests 276 passed (276)
                 ✓ src/renderer/src/components/UpdateBanner.test.tsx (4 tests) 208ms
  test:scripts   ℹ pass 46   ℹ fail 0

$ npm run typecheck
  > @kanmer/core@0.1.0 typecheck        clean
  > @kanmer/mcp-server@0.1.0 typecheck  clean
  > @kanmer/ui@0.2.0 typecheck          clean
  > @kanmer/gui@0.3.2 typecheck         clean      (all four named)

$ npm run build:ui                 → ok
$ npm run build -w @kanmer/gui     → ✓ built in 1.45s
```

`kanmerGit.test.ts` did not flake on either run (pre-existing GUI-085; no rerun
was needed).

`check:manual` was run rather than assumed: FRD-021 is not one of the FRDs
compiled into the in-app manual, and 19 chapters stayed up to date across the
FRD edit.

### 2. Live Electron, real update feed, no project open — merged `main`

`apps/gui/dev-app-update.yml` (gitignored) pointing at a local generic feed
serving a `latest.yml` for 9.9.9 and a sha512-matching **dummy 3 MiB artefact**
— never a real installer; nothing in this loop can install anything. Launched
`KANMER_DEV_UPDATE=1 npx electron . --user-data-dir=<fresh>` with a fresh
userData, so no recent project and no auto-open. The updater ran its real cycle:

```
[updater] dev update config in use (KANMER_DEV_UPDATE) — apps/gui/dev-app-update.yml
[updater] Checking for update
[updater] Found version 9.9.9 (url: Kanmer-Setup-9.9.9.exe)
[updater] New version 9.9.9 has been downloaded
```

Renderer state at that moment (`proof/live-electron-merged-main.txt`):

```
UPDATE  {"status":{"phase":"downloaded","version":"9.9.9"},"source":"auto"}
SHELL   app
LAYOUT  {"banner":[0,0,1264,37],"welcome":[0,37,1264,718],
         "toastStack":[1043,698,205,42],"viewport":[1264,755],
         "scrollHeight":755,"overflows":false}
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

All three surfaces present on the welcome screen, from a genuine `downloaded`
event over the real IPC. `banner` + `welcome` = 37 + 718 = 755 = the viewport,
and `overflows: false` — the layout hazard the research flagged (a `height:100%`
`.welcome` under a banner overflowing `#root`) is closed, measured rather than
eyeballed.

**In-project, same build, same feed** (`proof/live-electron-in-project.txt`):
banner at `[0, 86, 1264, 37]` — below the tab strip and topbar, exactly where it
has always been — `overflows: false`, board rendered with 160 items. In-project
behaviour is unchanged.

### 3. Why the screenshots are headless, not photographs of that window

**This host cannot photograph the Electron window.** Its compositor produces no
frames for it. Established in all three directions rather than assumed:

| Attempt | Result |
|---|---|
| CDP `Page.captureScreenshot` | no response in 20 s, twice |
| CDP `Page.startScreencast` | one stale frame, then **zero** — a diagnostic that set the banner's background to `#ff0000` never appeared in any frame |
| GDI `PrintWindow` (`PW_RENDERFULLCONTENT`) | returned the **initial** paint; after a real `MoveWindow` + `RedrawWindow` it returned a blank client area |

The renderer was provably alive throughout — `Runtime.evaluate` returned the live
DOM and live `getBoundingClientRect()` values the whole time, which is where §2's
numbers come from. So the pixels are taken the way GUI-072 took its: headless
Chromium loading the **real built renderer bundle** (`apps/gui/out/renderer`,
built from merged `main` — the real `App.tsx`, the real `styles.css`), with
`window.kanmer` stubbed because there is no Electron main behind it.

That stub is the honest limit of these images: **they do not exercise the IPC.**
§2 does. Together the two halves cover the whole path; neither does alone.

### 4. The pair, under one variable

The same headless harness, the same viewport (1264×756 at `deviceScaleFactor: 2`),
the same stubbed `downloaded` state — only the bundle changes:

| Bundle | Update state | `shell` | `banner` rect | `toastStack` | Image |
|---|---|---|---|---|---|
| pre-fix (`origin/main` `d1ef063`) | `downloaded` | `welcome` | `null` | `false` | `proof/before-welcome-downloaded.png` |
| merged `main` `6dbb284` | `downloaded` | `app` | `[0,0,1264,37]` | `true` | `proof/after-welcome-downloaded.png` |
| merged `main` `6dbb284` | none | `app` | `null` | `true` | `proof/after-welcome-no-update.png` |

Row 1 is the bug reproduced: an update fully downloaded, and the welcome screen
does not have a `.app` shell, a banner, or even a toast stack to put a message
in. Row 3 is the regression control.

**`after-welcome-no-update.png` and `before-welcome-downloaded.png` are the same
file** — sha256 `AE59B01E96E78560…` for both. That single fact carries the whole
argument in two directions at once: before the fix, a downloaded update made
**literally zero** difference to the welcome screen's pixels; after the fix, with
no update pending, the welcome screen is **byte-for-byte** what it always was, so
the `.welcome` CSS change costs nothing when there is nothing to show.

## What the images actually show

*(Opened with the `Read` tool and looked at, per the board's `proof:visual`
policy. Written from having looked.)*

**`before-welcome-downloaded.png` — the bug.** A completely ordinary Kanmer
welcome screen. "Kanmer" in heavy white type sits dead-centre of the window, the
one-line explanation under it, the blue "Open project folder…" pill under that,
and below a gap the small grey "RECENT" label with two dark rounded rows naming
the two project paths in a monospace face. The top edge of the window is bare —
the dark background runs straight to it with nothing in the way. What makes this
image damning is not what is in it but what the app *knew* while it was taken:
the updater had a fully downloaded 9.9.9 sitting in its cache. Somebody looking
at this screen has no way to learn that. There is no strip, no badge, no dot, and
critically no toast stack either, so clicking Help ▸ Check for Updates… would
have added nothing to it. The screen is not merely quiet; it has no surface a
message could arrive on.

**`after-welcome-downloaded.png` — the fix.** The difference is immediate and it
is the top 37 pixels. A full-bleed horizontal band now spans the entire width,
in a slightly lifted blue-slate that reads as a distinct plane against the
near-black page rather than as part of it, closed off by a hairline rule along
its bottom edge. On the left, hard against the margin, in the same accent blue
the app uses for its primary buttons: **"Kanmer 9.9.9 is ready to install."**
Pushed to the far right, tight against the opposite margin, sit two small pill
buttons — a filled blue **"Restart now"** and, beside it, an outlined ghost
**"Later"**. The eye lands on the sentence, travels the empty middle, and arrives
at the two things it can do; nothing competes for attention in between. It reads
exactly like the banner in the project view, because it *is* that banner — same
component, same rule, same two affordances.

Below it, everything from the "before" image is still there and still centred,
just re-centred inside a box that now starts 37px lower. Putting the two images
side by side, the welcome block has moved **down** by roughly 18 CSS pixels —
half the banner's height, because the content centres in the shorter remaining
box rather than being pushed by the banner. That is the opposite of what
`plan.md` predicted (it guessed the content would move *up*) and half of what the
ticket feared (it worried the recents list would be shoved a whole banner's
height under a hovering cursor). The recents rows do move, by those ~18px, about
30 s after launch when the check completes. Small, real, inherent to a top
banner, and recorded rather than hidden.

The layout holds under it: the banner's band and the welcome region tile the
viewport exactly, no scrollbar appears at the right edge, and the recents rows
keep their full width. The `height: 100%` → `flex: 1; min-height: 0` change did
its job — nothing is squashed and nothing is cut off at the bottom.

**`after-welcome-no-update.png` — the control.** Indistinguishable from the
"before" image, and provably so: same bytes. The bare top edge is back, "Kanmer"
is at the same y, the recents rows are at the same y. The fix is invisible until
there is something to say, which is the correct behaviour for a non-blocking
update surface and is the direct evidence that the CSS change carries no cost.

## Ticket verification list

- [x] **Launch with no project open against a feed offering a newer version —
      the banner appears on the welcome screen.** §2: real feed, real
      `downloaded` event, banner at `[0,0,1264,37]` with both buttons in the DOM;
      §4 for the pixels. *"Restart and update" was not clicked* — a deliberate
      omission. `quitAndInstall()` is not cancellable, and the dummy artefact is
      not an installer; driving that path would either do nothing useful or take
      the machine's Kanmer down. The gate in front of it (`restartWarning` →
      `ConfirmModal`) is pure and separately tested, the confirm now renders on
      this screen, and the single `installUpdate()` call site is unchanged and
      shared with the project view where the path is already proven.
- [x] **Help ▸ Check for Updates… produces a visible result on the welcome
      screen.** The mechanism, not a click: the menu item was already ungated
      (`main/index.ts`), its result already became a toast in state, and the only
      missing piece was a `.toast-stack` to render into. §2 shows a live update
      toast — "Kanmer 9.9.9 is downloading…" — rendered in a `.toast-stack` at
      `[1043,698,205,42]` on the welcome screen. The stack that carries it is the
      same one the manual check's "up to date" / "check failed" toasts use.
- [x] **In-project behaviour is unchanged.** §2: banner at `y=86`, below the tab
      strip and topbar; `overflows: false`; board renders 160 items. Row 3 of §4
      adds the welcome-screen half: byte-identical with no update pending.

## Governing docs

**FRD-021 R1** now reads "…on every screen, including with no project open", and
an `## Amended — GUI-065` section records why the FRD was silent (it was an
omission, not a decision — zero mentions of the welcome screen in the FRD, the
updater research, or GUI-017) and what changed. Authorized by the operator,
declared in `plan.md` § Governing docs. **R2 is untouched**: the restart gate
still runs in the renderer, before the IPC call, through the same single
`startInstall` call site — `grep installUpdate( renderer/` returns exactly one
call. No new ADR; the testing-stack addition is a convention and lives in
AGENTS.md §7, amended in the same PR as the operator required.

## Reproducing this

The harness is machine-local and uncommitted, at
`%TEMP%/claude/C--Users-PC-Documents-GitHub-kanmer/33647913-…/scratchpad/gui065/`:

```
node makefeed.mjs <dir> 9.9.9        # dummy artefact + sha512-matching latest.yml
node serve.mjs <dir> 8765            # local generic feed
# write apps/gui/dev-app-update.yml → provider: generic, url: http://127.0.0.1:8765/
cd apps/gui && KANMER_DEV_UPDATE=1 npx electron . \
    --user-data-dir=<fresh> --remote-debugging-port=9222 --disable-gpu
node evidence.mjs                    # live DOM + layout over CDP (no source patch)
node pixels.mjs <out/renderer> <png> downloaded|none   # headless-Chromium pixels
```

Every `electron.exe` was reaped afterwards — four processes per run, since
`child.kill()` does not reap the helpers and a survivor blocks
`git worktree remove`. `Get-Process electron` returns nothing.
