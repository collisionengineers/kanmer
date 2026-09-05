---
kind: proof-record
schema: 2
merged_sha: "410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2"
environment: "detached verification worktree .worktrees/verify-core-129-410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2 (Windows, Git Bash, Node 24); GitHub Actions windows-latest for the hosted push-triggered pr.yml receipt; the decisive census ran against a disposable copy of the live board (copied from .worktrees/kanmer/.kanmer to a Windows TEMP directory, deleted after use)"
verified_at: "2026-09-05T14:58:57Z"
result: PASS
attempts:
  - attempted_at: "2026-09-05T14:43:40Z"
    command: "gh pr view 329 --json state,mergeCommit,url"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "state=MERGED, mergeCommit.oid=410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2, matches the ticket's recorded PR #329."
  - attempted_at: "2026-09-05T14:45:35Z"
    command: "gh run list --workflow pr.yml --event push --commit 410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2 --limit 5 --json databaseId,headSha,event,status,conclusion,url,createdAt"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "One push-triggered pr.yml run found for the exact merge SHA: databaseId 33972754959, headSha 410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2, status in_progress at query time."
  - attempted_at: "2026-09-05T14:55:10Z"
    command: "gh run watch 33972754959 --exit-status; gh run view 33972754959 --json jobs,conclusion,status,attempt,headSha,url"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "Bound receipt satisfied: run 33972754959, event push, headSha == merged_sha, job 'verify' (databaseId 101324060322) status completed conclusion success (2026-09-05T14:45:33Z-14:54:58Z, ~9m25s covering 'npm run verify'); sibling job 'regate' success (101324060233); 'kanmer-gate' skipped (correct for a push trigger, not a PR event). This discharges every obligation that is a subset of npm run verify (build, core vitest suites including proof-record/docs/migrate, and packages/mcp-server/src/reconciliation.test.mjs via test:built -> test:http:built)."
  - attempted_at: "2026-09-05T14:55:45Z"
    command: "git fetch origin && git worktree add --detach .worktrees/verify-core-129-410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2 410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "Detached worktree created at the exact merge SHA. Confirmed: rev-parse HEAD == 410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2; symbolic-ref --short -q HEAD exits 1 (detached); status --short --branch shows '## HEAD (no branch)' with no local changes."
  - attempted_at: "2026-09-05T14:55:59Z"
    command: "npm ci"
    cwd: ".worktrees/verify-core-129-410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "Clean install in the detached verification worktree: 647 packages added."
  - attempted_at: "2026-09-05T14:56:19Z"
    command: "npm run build"
    cwd: ".worktrees/verify-core-129-410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "Root build (core, gui, mcp-server incl. standalone bundles) completed successfully, producing packages/core/dist/index.js used by the census script below."
  - attempted_at: "2026-09-05T14:57:30Z"
    exit_code: null
    result: PASS
    authority: supporting
    summary: "Decisive product check — census on a COPY of the live board, never the live board itself. Copied .worktrees/kanmer/.kanmer (3416 files, sha256 796e5ddf...) to a disposable Windows TEMP directory. Constructed a KanmerStore against the copy from the built packages/core/dist/index.js and ran auditProofRecords twice plus migrateProofValidation({dryRun:true}) twice, all in one process. All four readings: complete=true, problems=[], parserVersion=proof-record/2#1, digest=proof-census-v1:444c89b9350f6f2d8d9ee8b127fef0233eccc4a589bd2b0504028c9b5802b796, counts { valid: 0, legacy: 319, invalid: 2, absent: 105, total: 426 }, invalid tickets = [GUI-133, GUI-135] (both Done, unparseable YAML frontmatter, matching the post-implementation report's prediction). Post-census sha256 of the copy's 3416 files was byte-identical to the pre-census snapshot, and the live board (.worktrees/kanmer) was confirmed 'git status --short' clean both before and after — it was never touched. The temp copy was deleted after use. Manual/no-process form: the check is a Node script invoking the built library, not a shell command with a meaningful cwd/exit_code of its own; the underlying auditProofRecords/migrateProofValidation calls all returned normally with no thrown error."
  - attempted_at: "2026-09-05T14:58:45Z"
    command: "npx vitest run src/proof-record.test.ts src/docs.test.ts src/migrate.test.ts --root packages/core"
    cwd: ".worktrees/verify-core-129-410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2"
    exit_code: 0
    result: PASS
    authority: supporting
    summary: "3 files, 143 tests, all passed (proof-record.test.ts 54, migrate.test.ts 29, docs.test.ts 60)."
  - attempted_at: "2026-09-05T14:58:57Z"
    command: "node --test packages/mcp-server/src/reconciliation.test.mjs"
    cwd: ".worktrees/verify-core-129-410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2"
    exit_code: 0
    result: PASS
    authority: authoritative
    summary: "51/51 tests pass, 0 fail, 0 cancelled, 0 skipped. Covers reconciliation.ts's use of the shared proof-record parser, including the PROOF_RECORD_NOT_AUTHORITATIVE finding and both receipt findings from MCP-057."
receipts:
  - kind: github-actions-run
    provider: github
    repo: collisionengineers/kanmer
    workflow: pr.yml
    event: push
    run_id: 33972754959
    attempt: 1
    head_sha: "410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2"
    job: verify
    conclusion: success
    url: "https://github.com/collisionengineers/kanmer/actions/runs/33972754959/job/101324060322"
    covers: ["npm run verify"]
    observed_by: "claude-code verifier (CORE-129)"
---

# Proof — CORE-129, PR #329, merge SHA `410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2`

## Result: PASS

This is the first `schema: 2` proof record written on this board. Every
deterministic obligation the packet named passed, both on the hosted rail (the
bound post-merge `pr.yml` `verify` run at the exact merge SHA) and by direct
local re-run in a disposable detached worktree at that same SHA. The one
obligation that is not a subset of `npm run verify` — the ticket's own decisive
product check, a census of the live board's proof records — was run against a
disposable copy of the live board and never touched the live board itself.

## Bound receipt

`pr.yml` run [33972754959](https://github.com/collisionengineers/kanmer/actions/runs/33972754959)
triggered by the `push` event at the merge commit. `verify` job (windows-latest,
databaseId 101324060322) conclusion `success` in ~9m25s
(2026-09-05T14:45:33Z-14:54:58Z, "Run the authoritative verification rail",
covering `npm run verify`). `regate` conclusion `success`. `kanmer-gate`
`skipped` (correct — it runs on PR events, not on a post-merge push). This
receipt satisfies every obligation that is a subset of `npm run verify`:
`npm ci`, `npm run build`, the focused core vitest suites
(`proof-record.test.ts`, `docs.test.ts`, `migrate.test.ts`), and
`packages/mcp-server/src/reconciliation.test.mjs` (reached through
`npm run test:built` -> `npm run test:http:built -w @kanmer/mcp-server`, whose
fixed suite list includes `src/reconciliation.test.mjs`). Each of these was
also re-run directly in the detached worktree below as corroborating,
supporting evidence; none disagreed with the receipt.

## Decisive check — census on a copy of the live board

`packages/core/src/migrate.ts`'s `auditProofRecords` and `migrateProofValidation`
were run, from the built `packages/core/dist/index.js`, against a disposable
copy of `.worktrees/kanmer/.kanmer` (3416 files) in a Windows TEMP directory —
never against the live board. Two direct `auditProofRecords` calls and two
`migrateProofValidation({ dryRun: true })` calls, all in one Node process,
returned:

| Reading | complete | digest | valid | legacy | invalid | absent | total |
|---|---|---|---|---|---|---|---|
| audit 1 | true | `proof-census-v1:444c89b9…` | 0 | 319 | 2 | 105 | 426 |
| audit 2 | true | identical | identical | identical | identical | identical | identical |
| dry run 1 | true | identical | — | — | — | — | — |
| dry run 2 | true | identical | — | — | — | — | — |

All four digests match. The two invalid records are **GUI-133** and
**GUI-135** (both Done, both unparseable YAML frontmatter) — matching the
post-implementation report's and the independent reviewer's own census exactly
in shape (counts differ from the PR-time readings only by ordinary board churn
— tickets filed or archived between then and now — never by parser
instability). SHA-256 over all 3416 files in the copy was identical before and
after the four readings, and `git status --short` in `.worktrees/kanmer` (the
live board) was clean both before and after this check — the live board was
never written to. The temp copy was deleted after use.

## Local re-run in the detached worktree

`npm ci` (647 packages) and `npm run build` both exited 0. The three focused
core vitest files passed 143/143 tests. `node --test
packages/mcp-server/src/reconciliation.test.mjs` passed 51/51. All of this
corroborates, rather than substitutes for, the bound hosted receipt above.

## Scope note

Per the merge-SHA `kanmer-verify` skill, the bound receipt was looked up
*before* creating the verification worktree; the worktree was created only
because the ticket's own census obligation is not a subset of `npm run verify`
and could not be discharged by the receipt alone. No manual/GUI/hosted-provider
check outside the receipt and the census was named by this ticket's packet.

## Closeout finalisation

PR: https://github.com/collisionengineers/kanmer/pull/329 (merged, squash
commit `410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2`). Ticket moved
Verifying → Done. delivery_state=integrated, delivery_branch=main,
delivery_sha=410bfd22c2ad9fab3d430588e2ba8b4012ebf7c2.
