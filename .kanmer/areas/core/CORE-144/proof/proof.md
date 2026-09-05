---
kind: proof-record
merged_sha: "de5bace9245f7ad1f84f885eaa1cbcd55099607e"
environment: "Windows 11, Git Bash, Node 24; detached verification worktree .worktrees/verify-core-144-de5bace9245f7ad1f84f885eaa1cbcd55099607e at exact merge SHA (HEAD detached, clean)"
verified_at: "2026-09-05T13:28:01Z"
result: PASS
attempts:
  - attempted_at: "2026-09-05T13:19:30Z"
    command: "gh pr view 327 --json state,mergeCommit,url"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "state MERGED, mergeCommit.oid de5bace9245f7ad1f84f885eaa1cbcd55099607e, url https://github.com/collisionengineers/kanmer/pull/327"
  - attempted_at: "2026-09-05T13:20:20Z"
    command: "git worktree add --detach .worktrees/verify-core-144-de5bace9245f7ad1f84f885eaa1cbcd55099607e de5bace9245f7ad1f84f885eaa1cbcd55099607e"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "worktree created at HEAD detached de5bace9"
  - attempted_at: "2026-09-05T13:20:25Z"
    command: "git -C .worktrees/verify-core-144-de5bace9245f7ad1f84f885eaa1cbcd55099607e rev-parse HEAD && git -C .worktrees/verify-core-144-de5bace9245f7ad1f84f885eaa1cbcd55099607e symbolic-ref --short -q HEAD ; git -C .worktrees/verify-core-144-de5bace9245f7ad1f84f885eaa1cbcd55099607e status --short --branch"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "HEAD == de5bace9245f7ad1f84f885eaa1cbcd55099607e (matches PR mergeCommit.oid), symbolic-ref empty (detached), status clean"
  - attempted_at: "2026-09-05T13:21:03Z"
    command: "npm ci"
    cwd: ".worktrees/verify-core-144-de5bace9245f7ad1f84f885eaa1cbcd55099607e"
    exit_code: 0
    result: PASS
    summary: "647 packages installed, audited 652 packages; no install errors"
  - attempted_at: "2026-09-05T13:21:36Z"
    command: "node --test scripts/verify-steps.test.mjs"
    cwd: ".worktrees/verify-core-144-de5bace9245f7ad1f84f885eaa1cbcd55099607e"
    exit_code: 0
    result: PASS
    summary: "12/12 pass, 2 suites — includes the new 'every workspace's own build script is reached at most once' assertion and the mutation-regression test, plus the temp-repo 'refuses when a file is added inside an already-untracked directory' regression test (F-002)"
  - attempted_at: "2026-09-05T13:21:42Z"
    command: "npm run build"
    cwd: ".worktrees/verify-core-144-de5bace9245f7ad1f84f885eaa1cbcd55099607e"
    exit_code: 0
    result: PASS
    summary: "server + standalone builds succeeded"
  - attempted_at: "2026-09-05T13:22:02Z"
    command: "node scripts/build-stamp.mjs --write"
    cwd: ".worktrees/verify-core-144-de5bace9245f7ad1f84f885eaa1cbcd55099607e"
    exit_code: 0
    result: PASS
    summary: "wrote stamp, head de5bace9245f, dirty=false"
  - attempted_at: "2026-09-05T13:22:02Z"
    command: "node scripts/build-stamp.mjs --assert server standalone"
    cwd: ".worktrees/verify-core-144-de5bace9245f7ad1f84f885eaa1cbcd55099607e"
    exit_code: 0
    result: PASS
    summary: "asserted server, standalone match the stamp"
  - attempted_at: "2026-09-05T13:22:06Z"
    command: "mkdir probe-dir && echo a > probe-dir/a.txt && node scripts/build-stamp.mjs --write && echo b > probe-dir/b.txt && node scripts/build-stamp.mjs --assert server standalone"
    cwd: ".worktrees/verify-core-144-de5bace9245f7ad1f84f885eaa1cbcd55099607e"
    exit_code: 1
    result: PASS
    summary: "untracked-directory regression probe (F-002/CORE-140 review): stamp written with only probe-dir/a.txt present (dirty=true), then probe-dir/b.txt added; the final --assert correctly REFUSED with 'working tree changed since the stamp was written (dirty digest mismatch)', exit 1 — this is the expected/required FAIL, proving the -uall fix now hashes untracked-directory contents individually (pre-CORE-144 behaviour incorrectly exited 0 here per the ticket body and review). probe-dir removed afterward, stamp rewritten clean (dirty=false) to restore the worktree."
  - attempted_at: "2026-09-05T13:22:13Z"
    command: "npm run test:scripts"
    cwd: ".worktrees/verify-core-144-de5bace9245f7ad1f84f885eaa1cbcd55099607e"
    exit_code: 0
    result: PASS
    summary: "196/196 pass, 13 suites, 139.2s"
  - attempted_at: "2026-09-05T13:19:32Z"
    command: "gh run list --workflow pr.yml --event push --commit de5bace9245f7ad1f84f885eaa1cbcd55099607e --limit 5 --json databaseId,headSha,event,status,conclusion,url,createdAt"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "one bound run found: databaseId 33968566448, headSha de5bace9245f7ad1f84f885eaa1cbcd55099607e, event push, status in_progress at time of listing (this push run was triggered by the PR #327 merge landing directly on main)"
  - attempted_at: "2026-09-05T13:28:01Z"
    command: "gh run view 33968566448 --json jobs,conclusion,status,attempt,headSha,url"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "run completed, conclusion success, attempt 1, headSha de5bace9245f7ad1f84f885eaa1cbcd55099607e; jobs: verify=success (13:19:37Z-13:27:40Z, 'Run the authoritative verification rail' step success), regate=success, kanmer-gate=skipped (expected on a push event)"
receipts:
  - kind: github-actions-run
    provider: github
    repo: collisionengineers/kanmer
    workflow: pr.yml
    event: push
    run_id: 33968566448
    attempt: 1
    head_sha: "de5bace9245f7ad1f84f885eaa1cbcd55099607e"
    job: verify
    conclusion: success
    url: "https://github.com/collisionengineers/kanmer/actions/runs/33968566448/job/101312914304"
    covers: ["npm run verify"]
    observed_by: "claude-code verifier (HZN-009)"
---

# Proof — CORE-144 (PR #327)

## Merge identity

`gh pr view 327 --json state,mergeCommit,url` returned `state: MERGED`,
`mergeCommit.oid: de5bace9245f7ad1f84f885eaa1cbcd55099607e`,
`url: https://github.com/collisionengineers/kanmer/pull/327`. All verification
below is bound to this exact SHA. `main`'s current tip is also this commit
(the merge landed directly on `main` with nothing pushed after it), but the
worktree used for every local check below is a disposable detached worktree
pinned to the SHA itself, not a read of the mutable `main` checkout.

## Reconciliation before touching Git

`reconcile_ticket id: CORE-144` (dry run, before any worktree work) returned
no `recommendation`. It reported `CLAIM_EXPIRED` (informational — the
implementer's lease from the Implementing phase had expired, expected once a
ticket has moved on to Review/Verifying) and `RECORDED_COMMIT_UNREACHABLE`:
the ticket's recorded `commits[]` (`8ba0cc86`) is the PR's pre-rebind source
commit, and PR #327 was **squash-merged**, so a squash merge's brand-new
commit on `main` has no ancestry edge back to the original branch commit —
this is the known, expected structural property of squash merges (tracked as
a `reconcile_ticket` false-positive by CORE-146), not evidence of a mismatched
or wrong merge. `pullRequest.state: merged`, `pullRequest.headSha:
194c61a80530e812465c76b5afb3c1449b1b0526` (the post-rebind PR head, matching
`scratch/review.md`'s delta re-bind attestation), and `pullRequest.mergeSha:
de5bace9245f7ad1f84f885eaa1cbcd55099607e` were all correctly reported by the
inspector and match `gh pr view`. `proof.state: absent` (this ticket had no
prior proof record). With no recommendation offered, the ticket was moved
`review → verifying` directly via `move_item` with the `expected_revision`
read from `get_item` (`rev1:f2b696e23c0d04e9`), per `get_doc_gates`
confirming `review → verifying` reachable and passable.

## Detached verification worktree

```
git fetch origin
git worktree add --detach .worktrees/verify-core-144-de5bace9245f7ad1f84f885eaa1cbcd55099607e de5bace9245f7ad1f84f885eaa1cbcd55099607e
```

Asserted: `rev-parse HEAD` == the PR's full `mergeCommit.oid`;
`symbolic-ref --short -q HEAD` empty (detached); `status --short --branch`
clean. Not `.worktrees/kanmer` (the board worktree) and not
`.worktrees/CORE-144` (the ticket's implementation worktree, left untouched
for closeout).

## Obligation classification

| Obligation | Classification | Evidence |
|---|---|---|
| `npm run verify` (full rail) | already covered by a bound hosted receipt | push-to-main run 33968566448, job `verify`, conclusion `success` |
| `npm ci` | missing locally, run in worktree | PASS, exit 0 |
| `node --test scripts/verify-steps.test.mjs` | missing locally, run in worktree | PASS, 12/12, exit 0 |
| `npm run build && node scripts/build-stamp.mjs --write && node scripts/build-stamp.mjs --assert server standalone` | missing locally, run in worktree | PASS, exit 0 |
| untracked-directory dirty-digest probe (F-002 fix, `-uall`) | missing locally, run in worktree — must FAIL | FAIL (exit 1) as required — this is the correct, expected result |
| `npm run test:scripts` | missing locally, run in worktree | PASS, 196/196, exit 0 |

## Bound push-to-main receipt (exact merge SHA)

```
gh run list --workflow pr.yml --event push --commit de5bace9245f7ad1f84f885eaa1cbcd55099607e --limit 5 --json databaseId,headSha,event,status,conclusion,url,createdAt
```

returned exactly one run: `databaseId 33968566448`, `headSha
de5bace9245f7ad1f84f885eaa1cbcd55099607e`, `event push`, `createdAt
2026-09-05T13:19:32Z`. This run was triggered directly by PR #327's merge
landing on `main` (no intervening push).

`gh run view 33968566448 --json jobs,conclusion,status,attempt,headSha,url`
after completion:

- `status: completed`, `conclusion: success`, `attempt: 1`, `headSha` matches
  the merge SHA exactly.
- job `verify`: `success` (13:19:37Z–13:27:40Z, 8m3s) — the "Run the
  authoritative verification rail" step (`npm run verify`) succeeded on the
  merged tree.
- job `regate`: `success` (13:19:35Z–13:19:39Z) — "Re-run kanmer-gate for
  every open pull request" completed successfully.
- job `kanmer-gate`: `skipped` — expected: `kanmer-gate`'s `if:` gates on
  `github.event_name == 'pull_request'`, and this is a `push` event.

## Worktree-run checks (exact merge SHA `de5bace9…`)

All run in
`.worktrees/verify-core-144-de5bace9245f7ad1f84f885eaa1cbcd55099607e`:

```
npm ci                                                                                exit 0
node --test scripts/verify-steps.test.mjs                                            exit 0 (12/12 pass)
npm run build                                                                         exit 0
node scripts/build-stamp.mjs --write                                                 exit 0 (dirty=false)
node scripts/build-stamp.mjs --assert server standalone                              exit 0
npm run test:scripts                                                                  exit 0 (196/196 pass)
```

## Untracked-directory dirty-digest probe (must FAIL, and did)

Reproducing the exact CORE-140-review probe this ticket's F-002 fixes:

```
mkdir probe-dir && echo a > probe-dir/a.txt
node scripts/build-stamp.mjs --write            # dirty=true, stamp captures probe-dir/a.txt's hash
echo b > probe-dir/b.txt
node scripts/build-stamp.mjs --assert server standalone
```

The final `--assert` **refused** with `working tree changed since the stamp
was written (dirty digest mismatch)`, exit code **1**. This is the required
FAIL: before CORE-144, `git status --porcelain=v1 -z` (no `-uall`) collapses
an already-untracked directory to one `?? probe-dir/` entry, so a second file
added inside it left the digest unchanged and the pre-fix `--assert` exited 0
(the exact defect the ticket body reproduces). With `-uall`, `probe-dir/a.txt`
and `probe-dir/b.txt` are each listed and hashed individually, so the digest
correctly changes and the assert refuses. `probe-dir` was then removed and
the stamp rewritten clean (`dirty=false`) to leave the worktree as found.

## Result

`PASS`. Every named obligation is either a passing local check at the exact
merge SHA (including the untracked-directory probe, whose required outcome is
a FAIL and which correctly FAILed) or a bound hosted receipt at that same SHA.
No finding is open, missing, or contradicts a green result.
`RECORDED_COMMIT_UNREACHABLE` is explained above as expected squash-merge
behaviour (tracked by CORE-146), not a defect.
