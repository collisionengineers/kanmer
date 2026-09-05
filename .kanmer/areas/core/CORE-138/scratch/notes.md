## Live observation (AT-19 / AT-21) — 2026-09-05 ~03:10 UTC

PR #324 (draft): https://github.com/collisionengineers/kanmer/pull/324
Branch: CORE-138-gate-handoff, head 93e59f938b3f3a52a5c17e11c6cccb1e0d2e0f6a

- Run 33941013906 (event: pull_request, action: opened/draft) — `kanmer-gate`
  job completed conclusion=success (green) despite real findings
  (WRONG_STAGE, NO_REVIEW_RECORD, COMMITS_UNREACHABLE) because `--draft` was
  passed and the job always exits 0. Confirms AT-19: draft PR gate reports
  advisory (green), not red, on GitHub. `verify` job in this run stayed
  in_progress throughout the observation window.
- Edited the PR body twice via `gh pr edit --body-file`. The first edit used
  byte-identical content and GitHub did not fire a new `edited` webhook (no
  new run) — noted for anyone reproducing this. The second edit appended a
  literal content change, which did trigger a new `pull_request` (action:
  edited) run: 33941099168.
- Run 33941099168 (event: pull_request, edited): `verify` job
  status=completed conclusion=skipped (expected — `verify.if` still excludes
  `edited`); `kanmer-gate` job ran and the whole run finished
  conclusion=success.
- Critically: run 33941013906's `verify` job remained status=in_progress
  through and after the edited event/run 33941099168 completed — it was NOT
  cancelled. This confirms AT-21: the `meta-`-prefixed concurrency group for
  `edited` events kept the original run's `verify` job alive across the body
  edit.
- `gh run list --workflow pr.yml --branch CORE-138-gate-handoff` at the time
  of this note showed both runs: 33941013906 (still in_progress) and
  33941099168 (completed, success).

Board push: GUI auto-sync already had `kanmer-board` local == origin at
58386cb563a9cc7d9f724aae3d8687bcd64ad04c before this observation (confirmed
via `git -C .worktrees/kanmer rev-parse kanmer-board` ==
`git rev-parse origin/kanmer-board`).
