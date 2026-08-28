---
kind: proof-record
merged_sha: "add0da7fc17968796f43b3035065de400a4db2d4"
environment: >-
  GitHub branch protection and Actions for collisionengineers/kanmer; remote
  kanmer-board; Windows release-controller checkout. Administrative ticket with
  no source PR or source commit of its own.
verified_at: "2026-08-28T12:49:36.0739496Z"
result: PASS
attempts:
  - attempted_at: "2026-08-28T11:58:00Z"
    command: "gh api repos/collisionengineers/kanmer/branches/main/protection"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: >-
      Baseline captured with strict=false and app-bound verify/kanmer-gate
      requirements before the authorized strict-only update.
  - attempted_at: "2026-08-28T12:03:00Z"
    command: "gh api --method PUT repos/collisionengineers/kanmer/branches/main/protection/required_status_checks"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: >-
      Strict current-base enforcement enabled. Full normalized before/after
      comparison retained every unrelated protection field unchanged.
  - attempted_at: "2026-08-28T12:08:00Z"
    command: "git push origin kanmer-board"
    cwd: ".worktrees/kanmer"
    exit_code: 0
    result: PASS
    summary: >-
      Existing board-regate.yml installed byte-identically at board commit
      70f09ddea983e9cf87c28be36cf2ece1a0e5f24a; blob e93ec28a220d9bf41358408890f8ba38e49469a7,
      SHA-256 4b8ad8322d7cf30553988d8ef3924729d22f5ee6fed2d84dec3e5b22c16edeee.
  - attempted_at: "2026-08-28T12:10:00Z"
    command: "node --test scripts/pr-workflow.test.mjs"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: "Focused workflow contract test passed 1/1."
  - attempted_at: "2026-08-28T12:11:00Z"
    command: "gh run view 33169661851; gh run view 33169669232"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: >-
      Board-only fixture 09d2a74d1c3532ea719cfd3428ce71b7875aca6e
      triggered the installed dispatcher and existing PR workflow. Regate
      succeeded and both open-PR gates emitted the exact fixture board SHA.
  - attempted_at: "2026-08-28T12:42:28Z"
    command: "git push --force-with-lease origin 8010881c:skill-038-blocked-dependents"
    cwd: ".worktrees/skill-038"
    exit_code: 0
    result: PASS
    summary: >-
      Expected old remote head 8a909ee97d95a0c50e5102c3c7f88d4c575614ba
      matched. PR #304 changed to exact head
      8010881c4e48ffabe97aba674361980f8ab3b279 on base add0da7f and fresh
      required jobs were created; old-head successes were not reused.
  - attempted_at: "2026-08-28T12:48:25Z"
    command: "gh run view 33172190036 --repo collisionengineers/kanmer"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: >-
      Exact-new-head kanmer-gate job 98851790978 succeeded in 1m11s and hosted
      verify job 98851791247 succeeded in 5m57s at
      8010881c4e48ffabe97aba674361980f8ab3b279.
  - attempted_at: "2026-08-28T12:49:20Z"
    command: "gh api repos/collisionengineers/kanmer/branches/main/protection"
    cwd: "C:/Users/Alex/Documents/GitHub/kanmer"
    exit_code: 0
    result: PASS
    summary: >-
      Final read: strict=true; only verify and kanmer-gate, app id 15368;
      admin enforcement and conversation resolution true; restrictions null;
      force pushes and deletions false.
---

# Proof — CORE-135

## Result

PASS. Current-base protection and board-push re-gating are both active and
proven against exact immutable identities.

## Acceptance evidence

- Old PR #304 head `8a909ee9` retained green checks from base `d523a293` but
  became `BEHIND` after main advanced to `add0da7f` and strict protection was
  enabled.
- Updating the branch produced new head `8010881c`, base `add0da7f`, and
  fresh required jobs. Both passed; no old result was treated as proof for the
  new head.
- The canonical board workflow is present remotely with exact source bytes.
- Board-only push `09d2a74d` dispatched re-gating and open-PR gate evidence
  named that exact board SHA.
- Independent administrative review passed with no blocker, major, or minor
  finding. Its note about an already-active gate attempt is retained as accepted
  risk with causal evidence.
- No Kanmer source behavior, stage, group membership, provider, project
  variable, or workflow architecture changed.

## Residual risk

The existing workflow-dispatch condition schedules a redundant full main verify
on board pushes. This is resource-controlled and did not invalidate freshness;
it remains accepted release-local residual risk rather than a new architecture
change. Infisical/secret rotation is explicitly outside this release work.
