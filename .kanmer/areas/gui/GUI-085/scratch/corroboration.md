## Corroboration from three more agents — 2026-08-16

Merged in from GUI-086, which was filed independently for the same defect and has
been archived as a duplicate. **This ticket's diagnosis is the better one** — the
timings showing four of seven tests already exceeding their own timeout reframe it
from "a flake" to "a mis-specified suite", which is the finding that should drive
the fix.

Four agents hit it during the HZN-003 auto run, on four unrelated diffs. Each had
to prove independently that it was pre-existing before it could trust its own rail:

- **SKILL-018** — `@kanmer/core` 193/193 clean every run; `@kanmer/gui` timed out
  only under concurrent load from other worktrees. Reran the file alone with
  `--testTimeout=30000` → 7/7 clean.
- **GUI-070** — proved it three ways: its merge commit touches **zero** files under
  `src/main/`; the failure **reproduces at the pre-merge base `fc2045b`**; and the
  file is 7/7 green run alone at a 30 s timeout.
- **MCP-009** — a **docs-only** diff (two files under `docs/`). Rather than infer
  from that, ran the suite at `2f06713`, the commit before its merge, where it also
  failed. A different subset each run: 2 tests, then 1, then 3.
- **GUI-066** — reproduced with its changes stashed, from the main checkout, and
  filed this ticket.

**Two aggravating factors this run, worth recording because they change the fix:**

1. **Concurrent load makes it much worse.** With ~8 agents working in parallel
   worktrees on one machine, git subprocesses compete for the disk and the 4.6–8.7 s
   range stretches further. A timeout chosen against an idle machine will not hold.
   Several consecutive full-suite runs **under load** is the honest acceptance test,
   not one clean run.
2. **The Windows handle problem is not confined to this test.** GUI-070 hit the same
   shape at closeout: `git worktree remove` failed with `Permission denied` because
   a stray `electron.exe` survived `child.kill()` — Node's `kill()` does not reap
   Electron's helper processes. So "something still holds the handle" is a recurring
   Windows pattern here, not a one-off in `afterEach`. Worth fixing the cause rather
   than retrying `rm` in a loop; if a retry loop is used anyway, label it as the
   last resort it is.

**One caution on the approach**, since it is tempting: do not reflexively convert
these to an injected git runner. The value of this suite is precisely that it
exercises real `git init` / `worktree add`. Raise the budget and fix the teardown
first; only move a case to a fake if it genuinely does not need the real thing.

And do not mark it skipped. `npm test` is step 1 of the release gate — a skipped
suite there is worse than a slow one.
