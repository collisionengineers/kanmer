## Verify notes — 2026-08-16, merged main `5cab894`

**`check:manual` reports 19 chapters, not the 11 the brief expected.** Not this
change and not a regression: DOC-007 (#49) rewrote the in-app manual, and it
merged between this branch's base `0c4ffda` and its merge. Five other PRs landed
in the same window (#46, #47, #48, #50, #51). None touches `App.tsx` or the
renderer's `lib/`, and GitHub merged cleanly. Recorded because "11 chapters" was
a stated rail expectation and the number moving is otherwise alarming.

**`kanmerGit.test.ts` did not flake on merged main** — 22/22 files, 253/253
tests green in one pass, no raised timeout. It flaked once pre-merge (1 of 7,
`Test timed out in 5000ms`) and was 7/7 alone at `--testTimeout=30000` in 54.7s.
Consistent with the load-dependent diagnosis already on its own ticket. Not
chased, not fixed here.

**Runtime method.** Built merged main with `electron-vite build`, launched
against a *copy* of the live board (`KANMER_OPEN`, fresh `--user-data-dir`,
`--remote-debugging-port=9223`) and driven over CDP. Driver script lives in the
agent scratchpad and is deliberately uncommitted — same call GUI-070 made, and
the real answer to the coverage gap it works around is a jsdom/testing-library
setup, parked in `open-questions` as its own ticket.

The live-update check wrote `archived: true` into a sandbox ticket file and
watched the badges move through the real file watcher (Board 155→154, Archived
2→3), then restored the file. Nothing was written to the real board.

**Electron reaped.** Four `electron.exe` PIDs the first run, four the second;
one survived the first `Stop-Process` and needed a second pass. Confirmed zero
remaining before closeout, since a stray helper blocks `git worktree remove`.
