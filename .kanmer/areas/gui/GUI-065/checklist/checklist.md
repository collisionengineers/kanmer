# Checklist — GUI-065

- [x] Worktree `.worktrees/gui-065` on `gui-065-welcome-update-status` off `origin/main`; `take_ticket` records both
- [x] `components/UpdateBanner.tsx` — extract the `.banner.info` markup as a component taking `{ view, onRestart, onDismiss }`, no logic moved into it
- [x] `App.tsx` — bind `updateBanner`, `toastStack`, `restartConfirm` as JSX values above the `if (!root || !board)` early return
- [x] `App.tsx` — project branch renders those three variables in their existing positions; the three inline blocks are gone; the other four modals stay put
- [x] `App.tsx` — welcome branch wraps `<Welcome/>` in `<div className="app">` and renders the same three variables
- [x] `App.tsx` — the single `installUpdate()` call site is still exactly one (`startInstall`)
- [x] `styles.css` — `.welcome` `height: 100%` → `flex: 1; min-height: 0`, with a comment saying why
- [x] `apps/gui/package.json` — add `jsdom` + `@testing-library/react` devDeps; lockfile change is 616 insertions / **0 deletions**, purely additive
- [x] `components/UpdateBanner.test.tsx` — jsdom env, renders a real `downloaded` event through `updateSurface`, asserts banner text + both buttons + callbacks; asserts nothing renders for `null`, `dismissed` and `downloading`; file comment states what it does not prove
- [x] `docs/functional/frd/FRD-021-auto-update.md` — R1 gains "…on every screen, including with no project open"; an `## Amended — GUI-065` section records the mechanism
- [x] `AGENTS.md` §7 — amend "only renderer code with vitest coverage" to name the component-test exception and restate the rule that holds
- [x] `AGENTS.md` §7 — correct "exactly **two** renderer call sites" → one (stale since GUI-064)
- [x] `git diff AGENTS.md` shows **only** those two edits (3 insertions, 2 deletions)
- [x] `npm test` green — 19 chapters, core 232, gui 261, scripts fail 0 (no `kanmerGit` flake this run)
- [x] `npm run typecheck` green, all four workspaces named in the output
- [x] `npm run build:ui` green
- [x] `npm run check:manual` green (19 chapters) — the FRD-021 edit causes no manual ripple
- [x] `npm run build -w @kanmer/gui` green
- [x] Live Electron run: gitignored `dev-app-update.yml` + local feed with a **dummy** 3 MiB artefact, `KANMER_DEV_UPDATE=1`, no project open, real `downloaded` event
- [x] Every spawned `electron.exe` PID reaped; `Get-Process electron` returns nothing
- [x] Screenshots opened with `Read`, actually looked at, described in words the numbers could not produce
- [x] `post-implementation-report` written — including the `.toast-stack` widening and the ~18px downward content shift as intended consequences
- [x] PR opened naming GUI-065; ticket records the PR
- [ ] Review written to scratch (author and reviewer, said in the first line), merged
- [ ] `move_item verifying`; rail re-run on merged `main`; `proof.md` written stating plainly what the component test does and does not establish
- [ ] `move_item done`; closeout from the MAIN checkout — worktree removed, branch deleted, ticket released

## Progress notes

**Line numbers.** Research's numbers were stale as warned. Re-located against
`origin/main` at `d1ef063`: early return `App.tsx:1035-1045`, banner `:1126-1142`,
toast stack `:1310-1326`, restart confirm `:1357-1368`, updater block `:443-517`.
GUI-073 (`d1ef063`) landed after GUI-071 but did not touch `App.tsx`.

**jsdom needed no config file.** A per-file `// @vitest-environment jsdom`
docblock was enough — vitest 2.1.9 transforms the `.tsx` with no vitest config
at all (esbuild picks up `tsconfig.web.json`'s `"jsx": "react-jsx"`), and the
other 23 `apps/gui` test files keep their node environment. Recorded in
AGENTS.md §7 so the next person does not add a config that changes them.

**The worktree needed `npm run build:ui` before `npm test`.** A fresh worktree
has no `packages/core/dist`, so two gui suites fail on "Failed to resolve entry
for package @kanmer/core" — nothing to do with this change.

**This host cannot photograph the Electron window.** Established the hard way,
in all three directions: `Page.captureScreenshot` hangs (20 s, no response);
`Page.startScreencast` delivered one stale frame then zero, even after a forced
repaint and a red-background diagnostic that never appeared; GDI `PrintWindow`
with `PW_RENDERFULLCONTENT` returned the *initial* paint, and after a real
`MoveWindow` + `RedrawWindow` returned a blank client area. The compositor
produces no frames for that window on this desktop. The renderer itself was
provably alive throughout — CDP `Runtime.evaluate` returned the live DOM and
`getBoundingClientRect()` values the whole time. So the live-Electron evidence
is DOM + layout, and the pixels come from headless Chromium over the same built
bundle. Both are in proof.md with the boundary named.

**The layout prediction in the plan was wrong, and the measurement corrected
it.** The plan said the centred welcome content would shift **up** by about half
a banner height. It shifts **down** by ~18px: `.welcome` now starts at y=37 and
re-centres inside the shorter box, so everything in it — including the recents
list — moves down. Half the banner height, not the full 37px the ticket feared,
but in the direction the ticket feared. Measured from the before/after pair, not
estimated.
