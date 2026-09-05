---
kind: proof-record
merged_sha: "58718455ffc2174e2cc34cccf72d5f0158fc876b"
environment: "detached verification worktree .worktrees/verify-core-145-58718455ffc2174e2cc34cccf72d5f0158fc876b (Windows, Git Bash, Node 24) plus an ephemeral fresh clone at $TMP/kanmer-fresh-145v (deleted after use); GitHub Actions windows-latest for the hosted rail"
verified_at: "2026-09-05T13:52:00Z"
result: PASS
attempts:
  - attempted_at: "2026-09-05T13:38:33Z"
    command: "gh pr view 328 --json state,mergeCommit,url"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "state=MERGED, mergeCommit.oid=58718455ffc2174e2cc34cccf72d5f0158fc876b, matches the ticket's recorded PR #328."
  - attempted_at: "2026-09-05T13:39:10Z"
    command: "git fetch origin && git worktree add --detach .worktrees/verify-core-145-58718455ffc2174e2cc34cccf72d5f0158fc876b 58718455ffc2174e2cc34cccf72d5f0158fc876b"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Detached worktree created at the exact merge SHA. Confirmed: rev-parse HEAD == 58718455ffc2174e2cc34cccf72d5f0158fc876b; symbolic-ref --short -q HEAD exits 1 (detached); status --short --branch shows '## HEAD (no branch)' with no local changes."
  - attempted_at: "2026-09-05T13:40:00Z"
    command: "git clone https://github.com/collisionengineers/kanmer.git \"$TMP/kanmer-fresh-145v\" && git checkout 58718455ffc2174e2cc34cccf72d5f0158fc876b && npm ci && test ! -e packages/core/dist/index.js && npm run test:http -w @kanmer/mcp-server"
    cwd: "$TMP/kanmer-fresh-145v (outside the repo, TMP=C:\\Users\\Alex\\AppData\\Local\\Temp)"
    exit_code: 0
    result: PASS
    summary: "Genuinely fresh clone, no prior build anywhere. packages/core/dist/index.js confirmed absent before npm run test:http (CONFIRMED_ABSENT). npm run test:http -w @kanmer/mcp-server built @kanmer/core first via the CORE-145 fix and then ran the standalone HTTP tests: 249 tests, 248 pass, 1 skipped, 0 fail, exit 0. This is the decisive check the hosted rail cannot exercise (the rail always runs from a workspace with the root build already applied). Fresh clone deleted after the run."
  - attempted_at: "2026-09-05T13:52:30Z"
    command: "npm ci"
    cwd: ".worktrees/verify-core-145-58718455ffc2174e2cc34cccf72d5f0158fc876b"
    exit_code: 0
    result: PASS
    summary: "Clean install in the detached verification worktree."
  - attempted_at: "2026-09-05T13:53:40Z"
    command: "node --test scripts/verify-steps.test.mjs"
    cwd: ".worktrees/verify-core-145-58718455ffc2174e2cc34cccf72d5f0158fc876b"
    exit_code: 0
    result: PASS
    summary: "12/12 pass, 0 fail — includes CORE-144's 'root workspace build reached exactly once' and 'every workspace's own build script reached at most once' assertions, and the mutation regression test. Confirms the CORE-145 fix's non-assume-built existsSync guard sits outside the rail's --assume-built branch and does not disturb the build-once invariant."
  - attempted_at: "2026-09-05T13:54:10Z"
    command: "npm run test:scripts"
    cwd: ".worktrees/verify-core-145-58718455ffc2174e2cc34cccf72d5f0158fc876b"
    exit_code: 1
    result: FAIL
    summary: "13 test files failed with ERR_MODULE_NOT_FOUND resolving @kanmer/core from packages/core/dist/index.js. Root cause: the detached worktree had not yet run the repo's own root build (test:scripts imports @kanmer/core directly and is not part of the fresh-clone cold-checkout contract this ticket fixes). Not a regression from CORE-145 — recorded and immediately superseded by the next attempt after running npm run build."
  - attempted_at: "2026-09-05T13:55:00Z"
    command: "npm run build"
    cwd: ".worktrees/verify-core-145-58718455ffc2174e2cc34cccf72d5f0158fc876b"
    exit_code: 0
    result: PASS
    summary: "Root build (core then mcp-server) completed successfully, producing packages/core/dist/index.js required by test:scripts."
  - attempted_at: "2026-09-05T13:56:00Z"
    command: "npm run test:scripts"
    cwd: ".worktrees/verify-core-145-58718455ffc2174e2cc34cccf72d5f0158fc876b"
    exit_code: 0
    result: PASS
    summary: "196/196 pass, 0 fail, after the root build was run. Retained the prior FAIL attempt above per the proof rules: same command, same SHA, only the missing precondition (root build) changed between attempts."
  - attempted_at: "2026-09-05T13:37:42Z"
    command: "gh run list --workflow pr.yml --event push --commit 58718455ffc2174e2cc34cccf72d5f0158fc876b --limit 5 --json databaseId,headSha,event,status,conclusion,url,createdAt ; gh run view 33969450026 --json jobs,conclusion,status,attempt,headSha,url"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "github-actions-run receipt — provider github, repo collisionengineers/kanmer, workflow pr.yml, event push, run_id 33969450026, attempt 1, head_sha 58718455ffc2174e2cc34cccf72d5f0158fc876b (== merged_sha), job 'verify' (databaseId 101315246910) conclusion success, started 2026-09-05T13:37:46Z, completed 2026-09-05T13:47:17Z, url https://github.com/collisionengineers/kanmer/actions/runs/33969450026/job/101315246910. Sibling job 'regate' also completed success (101315247143); 'kanmer-gate' completed skipped (not a PR-event job on a push trigger), as expected per the workflow's own gating. Covers [\"npm run verify\"]. observed_by \"claude-code verifier (HZN-009)\"."
  - attempted_at: "2026-09-05T13:58:00Z"
    command: "gh pr view 328 --json state,mergedAt,url (closeout finalisation)"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Closeout confirmation: state=MERGED, mergedAt=2026-09-05T13:37:39Z, url=https://github.com/collisionengineers/kanmer/pull/328."
---

# Proof — CORE-145, PR #328, merge SHA `58718455ffc2174e2cc34cccf72d5f0158fc876b`

## Result: PASS

Every deterministic check that could run locally or on the hosted rail passed
at the exact merge commit. The one FAIL attempt (`npm run test:scripts` before
a root build existed in the detached worktree) is not evidence against the
change: `test:scripts` is a general repo-hygiene suite that imports
`@kanmer/core` directly and has never been part of the fresh-clone
cold-checkout contract CORE-145 fixes — that contract is exercised by the
dedicated fresh-clone check above, which passed with `packages/core/dist`
confirmed absent beforehand. Running `npm run build` once (the same
precondition the post-implementation report and the PR's own reviewer used)
and re-running `npm run test:scripts` at the same SHA turned it green
(196/196). Both attempts are retained above per the proof-record rules.

## Decisive check

The fresh-clone check is the one the hosted CI rail structurally cannot
exercise, because the rail's `verify` job always starts from a workspace with
the root build already produced by an earlier step. `packages/core/dist/index.js`
was confirmed absent immediately before `npm run test:http -w @kanmer/mcp-server`,
and that command — unmodified from what a real first-time contributor would
run — built `@kanmer/core` via CORE-145's `existsSync` guard in
`packages/mcp-server/scripts/run-http-tests.mjs` and then passed with 248/249
tests (1 pre-existing skip), exit 0. This is the exact bug CORE-145 was filed
to fix (`Could not resolve "@kanmer/core"` on a genuinely cold checkout), and
it is now fixed at the merged SHA.

## Hosted rail

`pr.yml` run [33969450026](https://github.com/collisionengineers/kanmer/actions/runs/33969450026)
triggered by the `push` event at the merge commit. `verify` job (windows-latest)
conclusion `success` in ~9m05s (2026-09-05T13:38:06Z–13:47:11Z for "Run the
authoritative verification rail", covering `npm run verify`). `regate`
conclusion `success`. `kanmer-gate` `skipped` (correct — it runs on PR events,
not on a post-merge push).

## Reviewer/proof cross-check

`scratch/review.md`'s round-2 attestation (head `3ebb71232c4505aea4019a49655be8c1144d68b4`,
the pre-squash PR head) independently reproduced the same fresh-clone result
(249 tests, 248 pass/1 skip) and the same 12/12 `verify-steps.test.mjs` and
196/196 `test:scripts` counts this verification observed at the squashed
merge commit `58718455ffc2174e2cc34cccf72d5f0158fc876b` — consistent evidence
across the pre-merge review head and the post-merge verification head.

## Scope note

Per policy, the full `npm run verify` was not re-run locally in the detached
worktree; the hosted `pr.yml` run's `verify` job is the authoritative rail
execution of `npm run verify` and is cited above by run/job id, conclusion,
and exact head SHA match.

## Closeout finalisation

PR: https://github.com/collisionengineers/kanmer/pull/328 (merged
2026-09-05T13:37:39Z). Ticket moved Verifying → Done at 2026-09-05T13:49:25Z.
delivery_state=integrated, delivery_branch=main,
delivery_sha=58718455ffc2174e2cc34cccf72d5f0158fc876b.
