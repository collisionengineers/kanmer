# Post-implementation report — CORE-033

## Outcome

CORE-033 created the durable compiled-workflow branch-protection playbook and
configured the exact live GitHub protections for `main` and `kanmer-board`.
The playbook is committed on the ticket branch as `89e61bdf` (with live
readback and board-sync evidence in `c283f4cc`). No application, workflow,
board-store, or verification source was changed.

## Changed file

- `docs/plans/compiled-workflow/playbook.md`: operational contract covering
  prerequisites, exact policies, staged readback, behavior tests, the future
  CORE-024/kanmer-gate extension, emergency restoration, and the explicit
  do-not-configure list.

## Live settings

- `main`: pull request required; exact status check `verify` required with
  strict=false; conversation resolution required; zero approvals; admin
  enforcement on; force pushes/deletion disabled; no other restrictions.
- `kanmer-board`: no PR/check/conversation requirement; ordinary direct push
  preserved; admin enforcement on for force/delete protections; force
  pushes/deletion disabled; no other restrictions.
- The branch-protection API URLs and all load-bearing post-save fields are
  recorded in the playbook. Personal-repository user/team restriction fields
  are unsupported by the endpoint; the authenticated owner is the documented
  unavoidable exception.

## Verification

- Two distinct green Windows `verify` runs were recorded before mutation:
  PR #142/run 32546955237/head a174ce96 and PR #157/run 32557139544/head
  fddcd9b4; both display the exact check `verify`.
- PR #158 provided a real pending-check observation: its initial status was
  BLOCKED with both `verify` and `kanmer-gate` queued (run 32557510255).
  After both checks passed, an unresolved review thread kept the PR blocked;
  GraphQL `isResolved:false` then `resolveReviewThread` changed it to
  true and the PR became CLEAN.
- A disposable empty direct push to `main` (SHA 154b6cdb) was refused by
  GitHub with exit 1 and GH006's PR/required-verify messages. The remote ref
  was unchanged and the temporary worktree/branch were removed.
- The production GUI `syncBoard` helper ran after a legitimate MCP scratch
  update, committed board sync SHA 83cdf8014d607f09b745325ec6822c871adc7cd2,
  pushed it without force, returned no error/paused state, and the remote
  `kanmer-board` ref matched. The board worktree remained clean on the
  expected branch.
- `git diff --check` passes and the ticket branch diff against origin/main
  contains only the playbook file.

## Scope and residuals

The negative force-push/deletion behaviors were not attempted destructively;
readback is the evidence. `kanmer-gate` is intentionally not required by
CORE-033 even though it has now posted, because CORE-024's staged extension
procedure owns that later rule change. No direct main push was accepted and no
remediation ticket was needed. Merged-main verification should re-run the
playbook diff check and read both protection endpoints; no source build is
needed for this documentation/settings-only change.

## Review handoff

PR #158: https://github.com/collisionengineers/kanmer/pull/158  
Kanmer: CORE-033

This lane stops at Review for independent review. It does not merge, start
CORE-035, or change the future required-check set.
