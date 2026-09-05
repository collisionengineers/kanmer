## Live observation (AT-19 / AT-21) — 2026-09-05 ~03:10 UTC

PR #324 (draft): https://github.com/collisionengineers/kanmer/pull/324
Branch: CORE-138-gate-handoff, head 93e59f93e7f1ef1550c99d0af5268b8cca05dd42

- Run 33941013906 (event: pull_request, action: opened/draft) — `kanmer-gate`
  job completed conclusion=success (green) despite real findings
  (WRONG_STAGE, NO_REVIEW_RECORD, COMMITS_UNREACHABLE) because `--draft` was
  passed and the job always exits 0. Confirms AT-19: draft PR gate reports
  advisory (green), not red, on GitHub.
- Edited the PR body twice via `gh pr edit --body-file`. The first edit used
  byte-identical content and GitHub did not fire a new `edited` webhook (no
  new run) — noted for anyone reproducing this. The second edit appended a
  literal content change, which did trigger a new `pull_request` (action:
  edited) run: 33941099168, `createdAt: "2026-09-05T03:10:06Z"`.
- Run 33941099168 (event: pull_request, edited): `verify` job
  conclusion=skipped (expected — `verify.if` still excludes `edited`);
  `kanmer-gate` job ran and completed at `"completedAt": "2026-09-05T03:14:18Z"`
  with conclusion=success.

### Review round 1 correction (F-002) — read back from `gh run view <id> --json jobs`

The claim that run 33941013906's `verify` job "stayed in_progress throughout"
was wrong. The exact job JSON for run 33941013906
(`gh run view 33941013906 --json jobs`):

```
"verify": startedAt "2026-09-05T03:08:15Z", completedAt "2026-09-05T03:13:44Z", conclusion "cancelled"
```

It was cancelled at `2026-09-05T03:13:44Z` — **before** the edited run
(33941099168) finished at `2026-09-05T03:14:18Z`. The cancellation was not
caused by the edited run at all: a separate `ready_for_review` event fired
its own `pull_request` run, 33941257446
(`gh run view 33941257446 --json jobs,createdAt,event`:
`"createdAt": "2026-09-05T03:13:32Z"`). `ready_for_review` is not carved into
the `meta-` group — it shares the ordinary per-PR group with `opened`, so it
correctly cancelled the superseded `opened` run's `verify` job 12 seconds
after its own creation (`03:13:32Z` → `03:13:44Z`).

AT-21 is still genuinely demonstrated, but by a different and more precise
fact: the `edited` run (33941099168) was created at `2026-09-05T03:10:06Z`,
and the original `verify` job was not cancelled until `2026-09-05T03:13:44Z`
— i.e. `verify` survived **3m38s past the edited run's own creation**,
whereas a same-group `ready_for_review` event cancelled the equivalent run in
**~12s** (`03:13:32Z` created → `03:13:44Z` cancelled). That 3m38s-vs-12s gap
is the evidence that the `meta-`-prefixed `edited` concurrency group is doing
its job: an `edited` event simply never touches the original run's group, so
it cannot cancel it on any timescale, while a same-group event cancels within
seconds once it starts. The original narration's claim that `verify` was
literally still running at the moment the edited run finished happened to be
false in this instance because an unrelated `ready_for_review` event
intervened first and shares the original run's group — that coincidence does
not weaken the `edited`-group carve-out, since the `edited` run at no point
holds a slot in the original run's group and therefore never contends for
cancellation with it.

Board push: GUI auto-sync already had `kanmer-board` local == origin at
58386cb563a9cc7d9f724aae3d8687bcd64ad04c before this observation (confirmed
via `git -C .worktrees/kanmer rev-parse kanmer-board` ==
`git rev-parse origin/kanmer-board`).
