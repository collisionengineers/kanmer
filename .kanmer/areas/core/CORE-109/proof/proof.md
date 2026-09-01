---
kind: proof-record
merged_sha: "3a55f443dd700a74018de2c4c3ab1c0b20904e49"
environment: "Windows NT 10.0.26200 / gh CLI against collisionengineers/kanmer / local checkout at origin/main 4fda54b4 (post-hoc reconciliation, no build)"
verified_at: "2026-09-01T18:44:29Z"
result: PASS
attempts:
  - attempted_at: "2026-09-01T18:44:29Z"
    command: "gh pr view 275 --json number,state,mergedAt,mergeCommit"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "PR 275 (docs: add v0.3.10 release notes) MERGED 2026-08-25T12:58:27Z at a309d4e7c89b1956d7c4c76697ab7f05a0d31736."
  - attempted_at: "2026-09-01T18:44:29Z"
    command: "gh pr view 276 --json number,state,mergedAt,mergeCommit"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "PR 276 (release: v0.3.10) MERGED 2026-08-25T13:10:28Z at 3a55f443dd700a74018de2c4c3ab1c0b20904e49; git rev-parse v0.3.10 resolves to the same commit."
  - attempted_at: "2026-09-01T18:44:29Z"
    command: "git merge-base --is-ancestor a309d4e7 origin/main && git merge-base --is-ancestor 3a55f443 origin/main"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "Both merge commits are reachable from origin/main."
  - attempted_at: "2026-09-01T18:44:29Z"
    command: "gh release view v0.3.10 --json tagName,isDraft,publishedAt,targetCommitish,assets"
    cwd: "."
    exit_code: 0
    result: PASS
    summary: "v0.3.10 is a public (non-draft) GitHub release published 2026-08-25T13:18:35Z with kanmer-0.3.10.mcpb, Kanmer-Setup-0.3.10.exe, Kanmer-Setup-0.3.10.exe.blockmap and latest.yml."
---

## Outcome

CORE-109's deliverable — the v0.3.10 recovery release — was published on 2026-08-25 through PR #275 (release notes) and PR #276 (release commit, tagged v0.3.10). The ticket was left in Review after the release because the release-controller session ended before reconciling the board; v0.3.11 and v0.3.12 were subsequently published through their own tickets (CORE-110, CORE-111), so v0.3.10 is a superseded public release, not the live control plane.

This proof records the exact GitHub state and is written after the fact by the claude-code controller on 2026-09-01 during the HZN-008 board reconciliation (run ledger `groups/HZN-008/automation/runs/20260827T133106Z-claude-code.md`). It makes no claim about installer/updater behaviour beyond what the four GitHub facts above show; the release-path proofs that CORE-036 and CORE-042 still owe are supplied by the v0.4.0 release, not by this ticket.

Traceability: worktree `.worktrees/core-109` (clean, branch `core-109-release-v0-3-10` merged into main) is removed at closeout; the remote branch was deleted in the 2026-09-01 merged-branch sweep.
