# Post-implementation report

## Change

Added .github/workflows/pr.yml as the only source change. It declares only pull_request events for main (opened, synchronize, reopened, ready_for_review), contents: read, workflow-level Bash, exactly one job named verify on windows-latest, actions/checkout@v4, actions/setup-node@v4 with Node 20, and one npm ci && npm run verify command. No push trigger, board workflow, kanmer-gate stub, protection setting, cache, matrix, retry, artifact, or unrelated file was added.

## Scope and governing contract

CORE-032 implements MASTERPLAN S-02 and Appendix A's GHA contract. CORE-031 is merged and supplies the authoritative root verify rail; this ticket does not alter scripts/verify.mjs, package scripts, the lockfile, protection, CORE-024, CORE-033, or board files. EPIC-009 context is respected: this is only the compiled-workflow CI spine; branch protection and merge-gate expansion remain separate tickets.

## Traceability

- Ticket: CORE-032.
- Branch/worktree: core-032-gha-verify / .worktrees/core-032.
- Commit: a24f924b512c22e14641d6a7c8102860862ae6a3.
- PR: https://github.com/collisionengineers/kanmer/pull/136.
- PR head: a24f924b512c22e14641d6a7c8102860862ae6a3.

## Verification

- Static YAML contract inspection: exit 0. Parsed trigger, permissions, Bash default, one verify job, Windows runner, Node 20, and sole run command; no extra triggers/jobs/stubs.
- git diff --check: exit 0.
- git status --short before commit: only .github/workflows/pr.yml.
- Normal-checkout npm run verify: exit 1 after 71.15s. First failure was the pre-existing packages/core/src/migrate.test.ts test “resuming does not rewrite tickets an earlier run already migrated”, timed out at 5000ms; core reported 1 failed, 258 passed, 259 total across 11 files. This failure is preserved and no unrelated test or rail was weakened.
- GitHub PR #136 verify check: started 2026-08-21T22:02:25Z, currently IN_PROGRESS at run 32531237498/job/96923485539 while this report is written. Conclusion, exact run duration, and under-ten-minute target are therefore INCONCLUSIVE until the check completes.
- Post-merge kanmer-board non-trigger evidence is unavailable before merge and is not claimed.

## Risks and handoff

The PR check intentionally exposes the existing verify-rail failure rather than changing it. A real Windows run may reproduce or differ from the local migration timeout; its exact conclusion owns acceptance of the CI check. No real board-sync post-merge run is available in this execution lane. Independent review should inspect the one-file diff, PR check, and preserved failure before deciding whether to merge or create a follow-up for the unrelated migration flake. Author stops at Review and will not self-review, merge, configure protection, or clean up.
