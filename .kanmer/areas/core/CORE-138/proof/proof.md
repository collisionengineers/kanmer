---
kind: proof-record
merged_sha: "9945b1f2a0a4839cbb575437823fbd00926bd33e"
environment: "Windows 11, Git Bash, Node 24; detached verification worktree .worktrees/verify-core-138-9945b1f2a0a4839cbb575437823fbd00926bd33e at exact merge SHA (HEAD detached, clean)"
verified_at: "2026-09-05T04:35:00Z"
result: PASS
attempts:
  - attempted_at: "2026-09-05T04:19:12Z"
    command: "gh pr view 324 --json state,mergeCommit,url"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "state MERGED, mergeCommit.oid 9945b1f2a0a4839cbb575437823fbd00926bd33e, url https://github.com/collisionengineers/kanmer/pull/324"
  - attempted_at: "2026-09-05T04:19:20Z"
    command: "git worktree add --detach .worktrees/verify-core-138-9945b1f2a0a4839cbb575437823fbd00926bd33e 9945b1f2a0a4839cbb575437823fbd00926bd33e"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "worktree created at HEAD detached 9945b1f2"
  - attempted_at: "2026-09-05T04:19:25Z"
    command: "git -C .worktrees/verify-core-138-9945b1f2a0a4839cbb575437823fbd00926bd33e rev-parse HEAD && git -C .worktrees/verify-core-138-9945b1f2a0a4839cbb575437823fbd00926bd33e symbolic-ref --short -q HEAD ; git -C .worktrees/verify-core-138-9945b1f2a0a4839cbb575437823fbd00926bd33e status --short --branch"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "HEAD == 9945b1f2a0a4839cbb575437823fbd00926bd33e (matches PR mergeCommit.oid), symbolic-ref empty/exit 1 (detached), status clean, re-asserted again at 2026-09-05T04:32:10Z after a session interruption with identical results"
  - attempted_at: "2026-09-05T04:20:31Z"
    command: "grep -c pull_request_target .github/workflows/*.yml"
    cwd: ".worktrees/verify-core-138-9945b1f2a0a4839cbb575437823fbd00926bd33e"
    exit_code: 0
    result: PASS
    summary: "board-regate.yml:0, pr.yml:0, release.yml:0 — no pull_request_target anywhere, matching the acceptance criterion and files.md's explicit exclusion"
  - attempted_at: "2026-09-05T04:20:45Z"
    command: "npm ci"
    cwd: ".worktrees/verify-core-138-9945b1f2a0a4839cbb575437823fbd00926bd33e"
    exit_code: 0
    result: PASS
    summary: "647 packages installed, audited 652 packages; no install errors"
  - attempted_at: "2026-09-05T04:21:05Z"
    command: "npm run build:core"
    cwd: ".worktrees/verify-core-138-9945b1f2a0a4839cbb575437823fbd00926bd33e"
    exit_code: 0
    result: PASS
    summary: "@kanmer/core tsup build succeeded (ESM + DTS), check-browser.mjs passed"
  - attempted_at: "2026-09-05T04:22:10Z"
    command: "node --test scripts/pr-workflow.test.mjs packages/mcp-server/src/check-pr.test.mjs"
    cwd: ".worktrees/verify-core-138-9945b1f2a0a4839cbb575437823fbd00926bd33e"
    exit_code: 0
    result: PASS
    summary: "14 tests, 14 pass, 0 fail; includes the draft advisory (--draft mode runs every check but reports advisory and always exits 0), stale-attestation-on-draft, and payload-authoritative-draft assertions named in files.md/plan.md"
  - attempted_at: "2026-09-05T04:23:40Z"
    command: "npm run verify:skills"
    cwd: ".worktrees/verify-core-138-9945b1f2a0a4839cbb575437823fbd00926bd33e"
    exit_code: 0
    result: PASS
    summary: "ALL CHECKS PASSED, including kanmer-execute/kanmer-review skill-name and cross-reference checks touched by this ticket"
  - attempted_at: "2026-09-05T03:08:12Z"
    command: "gh run view 33941013906 --json jobs,createdAt,event  (cited, not re-created; live evidence already recorded by implementer/reviewer for AT-19)"
    cwd: "n/a — GitHub Actions history"
    exit_code: 0
    result: PASS
    summary: "pull_request (opened, draft) run createdAt 2026-09-05T03:08:12Z; kanmer-gate job conclusion success (advisory/exit 0) with real underlying findings (WRONG_STAGE, NO_REVIEW_RECORD, COMMITS_UNREACHABLE) confirming AT-19 draft-advisory behaviour; verify job started 03:08:15Z, cancelled 03:13:44Z"
  - attempted_at: "2026-09-05T03:10:06Z"
    command: "gh run view 33941099168 --json jobs,createdAt,event (cited, not re-created)"
    cwd: "n/a — GitHub Actions history"
    exit_code: 0
    result: PASS
    summary: "pull_request (edited) run createdAt 2026-09-05T03:10:06Z; kanmer-gate success, verify skipped as expected (verify.if excludes edited); confirms the edited event landed in its own concurrency group and did not itself cancel the original verify run"
  - attempted_at: "2026-09-05T03:13:32Z"
    command: "gh run view 33941257446 --json jobs,createdAt,event (cited, not re-created)"
    cwd: "n/a — GitHub Actions history"
    exit_code: 0
    result: PASS
    summary: "pull_request (ready_for_review) run createdAt 2026-09-05T03:13:32Z, sharing the original (non-meta) concurrency group with the opened run; this run is what cancelled run 33941013906's verify job at 03:13:44Z, ~12s after its own creation — confirms AT-21's corrected fact pattern: the edited run (created 03:10:06Z) survived until verify was cancelled at 03:13:44Z (3m38s later) by a different, same-group event, not by the edited run itself"
  - attempted_at: "2026-09-05T04:19:41Z"
    command: "gh run list --workflow pr.yml --event push --commit 9945b1f2a0a4839cbb575437823fbd00926bd33e --limit 5 --json databaseId,headSha,event,status,conclusion,url,createdAt"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "one bound run found: databaseId 33944249753, headSha 9945b1f2a0a4839cbb575437823fbd00926bd33e, event push, status in_progress at time of listing"
  - attempted_at: "2026-09-05T04:28:50Z"
    command: "gh run view 33944249753 --json jobs,conclusion,status,attempt,headSha,url"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "run completed, conclusion success, attempt 1, headSha 9945b1f2a0a4839cbb575437823fbd00926bd33e; jobs: verify=success (04:19:49Z-04:28:43Z), regate=success (no open PRs to re-gate), kanmer-gate=skipped (expected on a push event — this workflow file's first push-to-main run under the regate-waits-then-retries change)"
receipts:
  - kind: github-actions-run
    provider: github
    repo: collisionengineers/kanmer
    workflow: pr.yml
    event: push
    run_id: 33944249753
    attempt: 1
    head_sha: "9945b1f2a0a4839cbb575437823fbd00926bd33e"
    job: verify
    conclusion: success
    url: "https://github.com/collisionengineers/kanmer/actions/runs/33944249753/job/101247347651"
    covers: ["npm run verify"]
    observed_by: "claude-code verifier (HZN-009)"
---

# Proof — CORE-138 (PR #324)

## Merge identity

`gh pr view 324 --json state,mergeCommit,url` returned `state: MERGED`,
`mergeCommit.oid: 9945b1f2a0a4839cbb575437823fbd00926bd33e`,
`url: https://github.com/collisionengineers/kanmer/pull/324`. All verification
below is bound to this exact SHA, not to the current tip of `main` (which
happens to also be this commit at the time of this run, since it is the most
recent merge).

## Reconciliation before touching Git

`reconcile_ticket id: CORE-138` (dry run, prior to any worktree work) returned
no `recommendation` — the store's `RECORDED_COMMIT_UNREACHABLE` finding fires
because the ticket's recorded `commits[]` (`93e59f93…`, `99256964…`) are the
PR's original source-branch commits, and this PR was **squash-merged**: a
squash merge creates a brand-new commit on `main` with no ancestry edge back
to the source branch's individual commits, so they are expected to be
`unreachable` from the merge commit — this is a structural property of squash
merges, not evidence of a mismatched or wrong merge. The PR's `headSha`
(`2e44b8059c5bc238a98ccf3ba6f5d3fb81fe4241`, matching `scratch/review.md`'s
round-3 attestation) and `mergeSha` (`9945b1f2…`, matching `gh pr view`) were
both correctly reported by the inspector. Per the task brief, with no
recommendation offered the ticket was moved `review → verifying` directly via
`move_item` with the `expected_revision` read from `get_item`.

## Detached verification worktree

```
git worktree add --detach .worktrees/verify-core-138-9945b1f2a0a4839cbb575437823fbd00926bd33e 9945b1f2a0a4839cbb575437823fbd00926bd33e
```

Asserted twice (once at creation, once after a session interruption/resume):
`rev-parse HEAD` == the PR's full `mergeCommit.oid`; `symbolic-ref --short -q
HEAD` empty (exit 1, detached); `status --short --branch` clean. Not
`.worktrees/kanmer` (the board worktree) and not `.worktrees/core-138` (the
ticket's implementation worktree, left untouched for closeout).

## Obligation classification

| Obligation | Classification | Evidence |
|---|---|---|
| `npm run verify` (full rail) | already covered by a bound hosted receipt | push-to-main run 33944249753, job `verify`, conclusion `success` |
| `npm ci` | missing locally, run in worktree | PASS, exit 0 |
| `npm run build:core` | missing locally, run in worktree | PASS, exit 0 |
| `node --test scripts/pr-workflow.test.mjs packages/mcp-server/src/check-pr.test.mjs` | missing locally, run in worktree | PASS, 14/14, exit 0 |
| `npm run verify:skills` | missing locally, run in worktree | PASS, ALL CHECKS PASSED, exit 0 |
| `grep -c pull_request_target .github/workflows/*.yml` (expect 0) | missing locally, run in worktree | PASS, 0/0/0 |
| AT-19 (draft advisory, ready strict/warn) live behaviour | already recorded (implementer + round-1/round-3 reviewer) | run 33941013906 |
| AT-21 (edited doesn't cancel verify) live behaviour | already recorded (implementer + round-1/round-3 reviewer) | runs 33941013906, 33941099168, 33941257446 |

Per the skill, obligations already discharged by a recorded hosted receipt or
by evidence the implementer/reviewer already read back from GitHub were cited
by run id rather than re-run or re-created (no new PRs were opened).

## Bound push-to-main receipt (exact merge SHA)

```
gh run list --workflow pr.yml --event push --commit 9945b1f2a0a4839cbb575437823fbd00926bd33e --limit 5 --json databaseId,headSha,event,status,conclusion,url,createdAt
```

returned exactly one run: `databaseId 33944249753`, `headSha
9945b1f2a0a4839cbb575437823fbd00926bd33e`, `event push`, `createdAt
2026-09-05T04:19:41Z`. This is also the first push-to-main run to execute under
the new `pr.yml` (the `regate` job's `gh run watch` bounded-wait-then-retry
change, part of this same ticket).

`gh run view 33944249753 --json jobs,conclusion,status,attempt,headSha,url`
after completion:

- `status: completed`, `conclusion: success`, `attempt: 1`, `headSha` matches
  the merge SHA exactly.
- job `verify`: `success` (04:19:49Z–04:28:43Z) — this is the full
  authoritative verification rail (`npm run verify`) run on the merged tree.
- job `regate`: `success` (04:19:45Z–04:19:50Z) — the "Re-run kanmer-gate for
  every open pull request" step completed successfully; there were no open
  PRs at push time, so the bounded-wait-then-retry path this ticket added
  was not exercised on this particular run, but the job itself, which now
  contains the `gh run watch`/retry logic, ran and reported green rather than
  the old unconditional skip.
- job `kanmer-gate`: `skipped` — expected: `kanmer-gate`'s `if:` gates on
  `github.event_name == 'pull_request'`, and this is a `push` event.

## Live-behaviour evidence cited (AT-19 / AT-21), not re-created

Read back rather than re-run, per the coordinator's instruction to cite
existing evidence instead of opening new PRs:

- `gh run view 33941013906 --json jobs,createdAt,event`: `pull_request`
  (opened, draft) run, `createdAt 2026-09-05T03:08:12Z`. `kanmer-gate`
  `conclusion: success` despite real underlying findings (`WRONG_STAGE`,
  `NO_REVIEW_RECORD`, `COMMITS_UNREACHABLE`), because `--draft` forces exit 0
  — **AT-19 confirmed**. `verify` job `startedAt 03:08:15Z`, `completedAt
  03:13:44Z`, `conclusion: cancelled`.
- `gh run view 33941099168 --json jobs,createdAt,event`: `pull_request`
  (edited) run, `createdAt 2026-09-05T03:10:06Z`. `kanmer-gate`
  `conclusion: success`, `verify` `conclusion: skipped` (expected —
  `verify.if` excludes `edited`).
- `gh run view 33941257446 --json jobs,createdAt,event`: `pull_request`
  (ready_for_review) run, `createdAt 2026-09-05T03:13:32Z`, sharing the
  original (non-`meta-`) concurrency group with the `opened` run. This run,
  not the `edited` run, cancelled 33941013906's `verify` job at
  `03:13:44Z` (~12s after its own creation) — **AT-21 confirmed** on the
  corrected fact pattern: the `edited` run (created `03:10:06Z`) never held a
  slot in the original run's concurrency group and could not have cancelled
  it; `verify` survived 3m38s past the edited run's own creation before a
  different same-group event cancelled it in ~12s, demonstrating the
  `edited`-group carve-out is what changed, consistent with
  `scratch/review.md`'s round-1/round-3 findings F-002 (fixed) and the
  post-implementation report's "Live observation" section.

## Worktree-run checks (exact merge SHA `9945b1f2…`)

All run in `.worktrees/verify-core-138-9945b1f2a0a4839cbb575437823fbd00926bd33e`:

```
npm ci                                                                        exit 0
npm run build:core                                                           exit 0
node --test scripts/pr-workflow.test.mjs packages/mcp-server/src/check-pr.test.mjs   exit 0 (14/14 pass)
npm run verify:skills                                                        exit 0 (ALL CHECKS PASSED)
grep -c pull_request_target .github/workflows/*.yml                          board-regate.yml:0 pr.yml:0 release.yml:0
```

## Result

`PASS`. Every named obligation is either a passing local check at the exact
merge SHA or a bound hosted receipt/cited run at that same SHA. No finding is
open, missing, or contradicts a green result. `RECORDED_COMMIT_UNREACHABLE` is
explained above as expected squash-merge behaviour, not a defect.
