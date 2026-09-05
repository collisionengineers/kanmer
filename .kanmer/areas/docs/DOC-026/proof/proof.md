---
kind: proof-record
merged_sha: "37b83b1435602dddeaea3da32668b4846d1be963"
environment: "detached verification worktree .worktrees/verify-doc-026-37b83b1435602dddeaea3da32668b4846d1be963 at exact merge SHA; Windows, Git Bash, Node v24.15.0, npm 11.14.1"
verified_at: "2026-09-05T04:10:00Z"
result: PASS
pr_url: "https://github.com/collisionengineers/kanmer/pull/326"
merged_at: "2026-09-05T03:57:XX Z"
attempts:
  - attempted_at: "2026-09-05T03:59:00Z"
    command: "gh pr view 326 --json state,mergeCommit,url"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "state MERGED; mergeCommit.oid 37b83b1435602dddeaea3da32668b4846d1be963, matching the ticket's authorised PR."
  - attempted_at: "2026-09-05T03:59:10Z"
    command: "gh run list --workflow pr.yml --event push --commit 37b83b1435602dddeaea3da32668b4846d1be963 --limit 5 --json databaseId,headSha,event,status,conclusion,url,createdAt"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "One push-event run found, databaseId 33943282405, headSha exactly the merge SHA, status in_progress at read time."
  - attempted_at: "2026-09-05T03:59:20Z"
    command: "gh run watch 33943282405 --exit-status"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "Run reached status completed, conclusion success."
  - attempted_at: "2026-09-05T04:06:00Z"
    command: "gh run view 33943282405 --json jobs,conclusion,status,headSha,url"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "Run conclusion success; job verify (databaseId 101244656425, attempt 1) completed/success, headSha 37b83b1435602dddeaea3da32668b4846d1be963, step 'Run the authoritative verification rail' success (03:58:21Z-04:05:29Z). This is the npm run verify receipt for the exact merge SHA (HZN-009)."
  - attempted_at: "2026-09-05T04:06:30Z"
    command: "git fetch origin && git worktree add --detach .worktrees/verify-doc-026-37b83b1435602dddeaea3da32668b4846d1be963 37b83b1435602dddeaea3da32668b4846d1be963"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "Worktree created. git -C <worktree> rev-parse HEAD == 37b83b1435602dddeaea3da32668b4846d1be963; symbolic-ref --short -q HEAD exit 1 (detached, confirmed); status --short --branch clean, ## HEAD (no branch). Not .worktrees/kanmer or .worktrees/DOC-026."
  - attempted_at: "2026-09-05T04:07:00Z"
    command: "npm ci"
    cwd: ".worktrees/verify-doc-026-37b83b1435602dddeaea3da32668b4846d1be963"
    exit_code: 0
    result: PASS
    summary: "Clean install, no error. 647 packages added, 652 audited."
  - attempted_at: "2026-09-05T04:07:30Z"
    command: "test ! -e CLOSEOUT_PLAN.md"
    cwd: ".worktrees/verify-doc-026-37b83b1435602dddeaea3da32668b4846d1be963"
    exit_code: 0
    result: PASS
    summary: "CLOSEOUT_PLAN.md is absent from the repo root, as the plan requires."
  - attempted_at: "2026-09-05T04:07:40Z"
    command: "grep -rn CLOSEOUT_PLAN --include=*.md --include=*.mjs --include=*.ts --include=*.yml . --exclude-dir=node_modules --exclude-dir=.worktrees --exclude-dir=Kanmer_Upgrade_Pack_2026-09-05"
    cwd: ".worktrees/verify-doc-026-37b83b1435602dddeaea3da32668b4846d1be963"
    exit_code: 0
    result: PASS
    summary: "Exactly one hit: AGENTS.md:107, the expected retirement pointer line ('CLOSEOUT_PLAN.md — retired 2026-09-05 (DOC-026); superseded by ...'). No stale reference remains."
  - attempted_at: "2026-09-05T04:07:50Z"
    command: "node scripts/verify-agents-block.mjs"
    cwd: ".worktrees/verify-doc-026-37b83b1435602dddeaea3da32668b4846d1be963"
    exit_code: 0
    result: PASS
    summary: "35/35 checks passed; managed block byte-identical, BLOCK_BODY invariants intact."
  - attempted_at: "2026-09-05T04:08:00Z"
    command: "npm run verify:docs"
    cwd: ".worktrees/verify-doc-026-37b83b1435602dddeaea3da32668b4846d1be963"
    exit_code: 0
    result: PASS
    summary: "manual up to date (22 chapters); verify-docs PASS — document mirror, 3 remote chapters, 26 doctor ids, links/fences/canary/provider boundaries, generated manual current."
  - attempted_at: "2026-09-05T04:08:15Z"
    command: "npm run check:manual"
    cwd: ".worktrees/verify-doc-026-37b83b1435602dddeaea3da32668b4846d1be963"
    exit_code: 0
    result: PASS
    summary: "manual up to date (22 chapters)."
  - attempted_at: "2026-09-05T04:08:30Z"
    command: "npm run verify:skills"
    cwd: ".worktrees/verify-doc-026-37b83b1435602dddeaea3da32668b4846d1be963"
    exit_code: 0
    result: PASS
    summary: "ALL CHECKS PASSED, including '21. no shipped skill link escapes its skill folder — 0 hits'."
  - attempted_at: "2026-09-05T04:08:45Z"
    command: "ls plugins/kanmer/skills | wc -l"
    cwd: ".worktrees/verify-doc-026-37b83b1435602dddeaea3da32668b4846d1be963"
    exit_code: 0
    result: PASS
    summary: "12 skill directories present (kanmer-auto, kanmer-closeout, kanmer-docs, kanmer-execute, kanmer-groom, kanmer-plan, kanmer-report, kanmer-research, kanmer-review, kanmer-setup, kanmer-tickets, kanmer-verify). grep -n kanmer-import AGENTS.md returns no hits: AGENTS.md §2 lists no kanmer-import row."
  - attempted_at: "2026-09-05T04:09:00Z"
    command: "git branch --list local-closeout-plan-docs"
    cwd: "C:\\Users\\Alex\\Documents\\GitHub\\kanmer"
    exit_code: 0
    result: PASS
    summary: "Empty output from the root repo checkout: local-closeout-plan-docs no longer exists locally, as the plan's step 4 and 6 require."
  - attempted_at: "2026-09-05T04:09:15Z"
    command: "gh run view 33942486457 --json jobs (cited from scratch/review.md F-006, not re-run)"
    cwd: "n/a — cited, not re-run"
    exit_code: null
    result: PASS
    summary: "Transient discharged per the skill's three-part rule for the PR-event run at head 57a6e919 (a pre-merge head, not the merge SHA): the smoke case 'ready packet is read-only' (packages/mcp-server/src/smoke.mjs) failed on first attempt (job 101242491460, 8m06s) and passed on an identical re-run of the same job at the same head SHA with no code change (job 101243591230, 8m19s). (1) The PR's entire diff is two documentation files (AGENTS.md, CLOSEOUT_PLAN.md); nothing in it can reach get_execution_packet or its sandbox tree-snapshot mechanism. (2) The failing test/file (packages/mcp-server/src/smoke.mjs's read-only packet assertion) is untouched by this diff. (3) Mechanism argument: the assertion compares a content-hash tree snapshot plus the ticket file and activity.jsonl before/after a read-only MCP call — a timing-sensitive filesystem snapshot check unrelated to documentation content, consistent with a known intermittent flake class already recorded on the board (scratch/review.md F-006), not a regression this doc-only change could cause. This is cited corroborating evidence for the merge-SHA push run's cleanliness, not itself the authoritative receipt — the authoritative receipt is the push-to-main run 33943282405 at the exact merge SHA 37b83b14, which passed on its only attempt with no retry needed."
receipts:
  - kind: github-actions-run
    provider: github
    repo: collisionengineers/kanmer
    workflow: pr.yml
    event: push
    run_id: 33943282405
    attempt: 1
    head_sha: "37b83b1435602dddeaea3da32668b4846d1be963"
    job: verify
    conclusion: success
    url: "https://github.com/collisionengineers/kanmer/actions/runs/33943282405/job/101244656425"
    covers: ["npm run verify"]
    observed_by: "claude-code verifier (HZN-009)"
---

# Proof — DOC-026 (Retire CLOSEOUT_PLAN.md, add the operating index, fix stale AGENTS.md pointers)

## What the receipt satisfies

The push-to-`main` `verify` job on run `33943282405`, job id `101244656425`,
attempt 1, ran the authoritative verification rail (`npm run verify`) against
the exact merge SHA `37b83b1435602dddeaea3da32668b4846d1be963` and concluded
`success` in 7m08s (03:58:21Z-04:05:29Z, the "Run the authoritative
verification rail" step). Per HZN-009's evidence rule, this hosted run is
consumed as the authoritative discharge of the full `npm run verify`
obligation for this exact merged tree; it passed on its only attempt with no
retry needed.

## Discharged transient from pre-merge PR evidence

`scratch/review.md`'s F-006 recorded a first-attempt `verify` failure on the
PR-event run at pre-merge head `57a6e919` (workflow run `33942486457`): the
smoke case "ready packet is read-only" in `packages/mcp-server/src/smoke.mjs`
failed once (job `101242491460`, 8m06s) and passed on an identical re-run of
the same job at the same head SHA with a docs-only diff and no code change
(job `101243591230`, 8m19s). Per this skill's three-part transient rule: (1)
a re-run of the same job at the same SHA with no code change — satisfied by
job `101243591230`; (2) confirmation the failing test/file is untouched by
this diff — `packages/mcp-server/src/smoke.mjs` is not touched anywhere in
this PR's two-file diff (`AGENTS.md`, `CLOSEOUT_PLAN.md`); (3) a mechanism
argument — the assertion is a content-hash tree-snapshot timing check around
a read-only MCP call, structurally unrelated to a documentation-only change
and unable to be reached by it. This is retained as discharged corroborating
context from the pre-merge head; it is not itself the merge-SHA receipt. The
actual push-to-`main` run at the merge SHA (`33943282405`) required no retry
and passed cleanly on its first and only attempt.

## What the worktree checks satisfy

The detached worktree at the exact merge SHA additionally confirmed, directly,
every check this skill names beyond the hosted rail: `npm ci` clean;
`CLOSEOUT_PLAN.md` absent from the repo root; a repo-wide grep for
`CLOSEOUT_PLAN` across `.md`/`.mjs`/`.ts`/`.yml` files (excluding
`node_modules`, `.worktrees`, `Kanmer_Upgrade_Pack_2026-09-05`) returns exactly
one hit, the expected `AGENTS.md:107` retirement pointer; `node
scripts/verify-agents-block.mjs` 35/35 checks passed (managed block
byte-identical); `npm run verify:docs` and `npm run check:manual` both PASS
(22 chapters, manual current); `npm run verify:skills` ALL CHECKS PASSED;
`plugins/kanmer/skills` contains exactly 12 directories and `AGENTS.md` §2
lists no `kanmer-import` row; and `git branch --list local-closeout-plan-docs`
from the root repository checkout returns empty, confirming the mined local
branch was deleted per the plan's step 4/6.

## Result

**PASS.** The hosted receipt discharges `npm run verify` for the exact merged
tree at `37b83b1435602dddeaea3da32668b4846d1be963`, passing cleanly on its
only attempt. The one pre-merge transient (F-006, a smoke-test timing flake
on an earlier PR head, unrelated to this doc-only diff) is discharged per the
three-part rule and does not recur on the merge-SHA run. The detached-worktree
checks directly confirm every acceptance criterion in the ticket's plan:
`CLOSEOUT_PLAN.md` is gone, no stale reference remains, the managed AGENTS.md
block is untouched, docs/skills verification is green, the phantom
`kanmer-import` row is gone, and the mined local branch no longer exists.
Nothing failed and nothing required here was left unavailable.
