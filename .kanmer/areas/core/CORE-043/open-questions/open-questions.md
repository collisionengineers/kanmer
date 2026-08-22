# CORE-043 open questions

## Resolved choices

- [x] Can Kanmer call GitHub's protection API? No. ADR-0016 explicitly excludes a GitHub App/merge-control layer and this GUI has no authorized API seam; the safe implementation is an explicit retarget-first constraint.
- [x] Which branch is protected by the repository workflow contract? The literal `kanmer-board` branch used by `.github/workflows/pr.yml` and the ticket body.
- [x] What happens when the default branch is requested for rename? Refuse before `git branch -m`, push, or delete, and preserve the persisted setting when an open-worktree migration is refused.
- [x] Does this alter custom-branch migration? No. Once protection has been retargeted and the local worktree is already on a non-default branch, the existing push-before-delete behavior remains covered.

## Parked (explicitly deferred)

- [x] Live GitHub protection retargeting and hosted proof are deferred to an authorized repository-owner operation; this ticket records the boundary as INCONCLUSIVE and does not fabricate it.
- [x] A GitHub App/API integration is a separate follow-up because it is outside ADR-0016 and CORE-043's bounded scope.
