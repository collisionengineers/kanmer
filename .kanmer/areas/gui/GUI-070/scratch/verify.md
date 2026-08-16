## Verify notes — 2026-08-16, merged main `2f06713`

**Pre-existing flake, investigated rather than waved past.**
`apps/gui/src/main/kanmerGit.test.ts` fails 1–3 of its 7 cases in the main
checkout under load (`Test timed out in 5000ms`, then `EPERM` on the `rmSync`
temp-dir cleanup in `afterEach`). Established as pre-existing three ways:
`src/main/` has zero files in `git show 2f06713 --stat`; the same failures
reproduce at the **pre-merge base `fc2045b`**; and the file is 7/7 green run
alone with `--testTimeout=30000` (cases take 4.3–6.5 s against a 5 s default,
spawning real `git` subprocesses). Deliberately **not** fixed here — unrelated
file, and folding it in would smuggle an unplanned change through a deletion
ticket. Worth its own ticket if it keeps costing verification time; the fix is
almost certainly a raised `testTimeout` for that file plus a more patient temp
cleanup, which is the same Windows `EPERM`/`EBUSY` class FRD-007 M5 already
documents.

**Runtime verification method.** `KANMER_SMOKE=1` exits 0 but cannot press a
key, and `shortcuts.ts:1-13` records that nothing covers the Ctrl+N handler. So
the built app was booted with `--remote-debugging-port` against a throwaway
sandbox board (two tickets, one in Backlog) and driven over CDP: nav labels,
board column headers, Ctrl+1/2/3 out of order and repeated, Ctrl+4's inertness,
and a Backlog card click → selection + editor. The driver script lives in the
agent scratchpad and is deliberately not committed — the real answer to that
coverage gap is a jsdom/testing-library setup, which is parked in
`open-questions` as its own ticket.

**Screenshot** at `assets/board-no-backlog-tab.png` — nav reads Board / Standup /
Archived, Backlog is the first of six columns. It incidentally shows GUI-071's
live defect (Board tab reads `2`, i.e. every non-archived ticket).
