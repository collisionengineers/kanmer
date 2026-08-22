# Compiled-workflow branch protection playbook

Last verified: 2026-08-22 (UTC)

Repository: `collisionengineers/kanmer`  
Operator: `collisionengineers` (authenticated `gh`, repository admin)  
Rule identifiers: recorded after the live rules are created below.

This is the operational contract for the compiled-workflow merge boundary. It
records the narrow rules approved by CORE-033, the evidence that preceded the
one-way change, and the readback and recovery procedure. It is not a second
source of truth for workflow code.

## Invariants

- GitHub is the merge boundary for source `main`.
- `verify` is the only initially required status check.
- `kanmer-board` remains an operational direct-push branch; automatic board
  sync must not be moved behind a pull request or status check.
- Force pushes and branch deletion are prohibited on both protected branches.
- A check is never made required before GitHub has posted it at least once.
- Required check job names are stable interfaces. A rename requires a staged
  rule transition and a new observed run.
- No approvals, code-owner review, stale-review dismissal, up-to-date branch
  requirement, signed commits, linear history, deployment gate, merge queue,
  lock, push restriction, or unrelated policy is introduced here.

## Preconditions and evidence

Both prerequisite tickets are complete before the rule mutation:

| prerequisite | evidence |
|---|---|
| CORE-032 merged | PR #136 merged as `2ba84147cc513ad23e2811e09c005772cb259cfb`; the Windows `verify` job passed in run `32546955237`, job `96967001211`, on head `a174ce9645e0bcc276a45b993c35710e62e43316`. |
| GUI-085 merged | PR #88 is Done; its proof records the bounded timeout fix for real-Git Windows tests and two complete target runs. |

Two distinct successful `verify` runs were observed after GUI-085:

| run | PR / head | displayed check | conclusion | created → updated |
|---|---|---|---|---|
| `32546955237` / job `96967001211` | PR #142, `a174ce9645e0bcc276a45b993c35710e62e43316` | `verify` | success | `2026-08-22T02:41:50Z` → `2026-08-22T02:44:40Z` |
| `32557139544` / job `96993014805` | PR #157, `fddcd9b4c900b5f597f26b805300ff629e60a747` | `verify` | success | `2026-08-22T06:30:14Z` → `2026-08-22T06:32:34Z` |

The displayed check string is byte-for-byte identical (`verify`). The same
second run also posted `kanmer-gate` for CORE-024, but that job remains
future-only for this rule and is not required by CORE-033.

Current pre-change readback (2026-08-22):

```text
GET branches/main/protection        -> 404 Branch not protected
GET branches/kanmer-board/protection -> 404 Branch not protected
```

The authenticated operator has repository `admin` permission. No rule change
is attempted until this playbook is committed on the ticket branch.

## Post-save readback — 2026-08-22

The rules were created only after the playbook commit `89e61bdf`.

| target | readback |
|---|---|
| `main` | `required_status_checks.contexts=["verify"]`, `strict=false`, `required_pull_request_reviews.required_approving_review_count=0`, `require_code_owner_reviews=false`, `dismiss_stale_reviews=false`, `require_last_push_approval=false`, `required_conversation_resolution=true`, `enforce_admins=true`, `allow_force_pushes=false`, `allow_deletions=false`, `required_linear_history=false`, `lock_branch=false`, `restrictions=null`; API URL `https://api.github.com/repos/collisionengineers/kanmer/branches/main/protection`. |
| `kanmer-board` | `required_status_checks=null`, `required_pull_request_reviews=null`, `required_conversation_resolution=false`, `enforce_admins=true`, `allow_force_pushes=false`, `allow_deletions=false`, `required_linear_history=false`, `lock_branch=false`, `restrictions=null`; API URL `https://api.github.com/repos/collisionengineers/kanmer/branches/kanmer-board/protection`. |

Both readbacks match the approved tables. GitHub's personal repository API
does not expose numeric rule IDs for this branch-protection endpoint; the
branch-specific protection URLs above are the durable identifiers. No bypass
user/team restrictions were configured (the endpoint rejects those fields for
this personal repository); the authenticated owner is the unavoidable owner
exception.

Direct `main` push negative test: a disposable empty commit `154b6cdb` was
attempted with `git push origin HEAD:refs/heads/main`. GitHub rejected it with
exit 1 and `GH006: Protected branch update failed` / `Changes must be made
through a pull request` / `Required status check "verify" is expected`. The
remote `main` ref was unchanged; the disposable worktree and local branch were
removed.

Board direct-push test: after the rule readback, the production GUI
`syncBoard` helper was run against the existing board worktree after a real
MCP scratch update. It committed `83cdf8014d607f09b745325ec6822c871adc7cd2`
(`chore(kanmer): sync board 2026-08-22T06:38:34.767Z`) and returned
`available=true`, `lastSync=2026-08-22T06:41:58.989Z`, `error=null`,
`paused=false`. `git ls-remote` confirmed the same SHA on
`refs/heads/kanmer-board`; the worktree is clean and on the expected branch.

## Exact `main` policy

Target the exact branch name `main` (never a wildcard that also matches the
board branch).

| setting | value |
|---|---|
| require pull request before merge | enabled |
| required approvals | zero; no new review threshold |
| required status checks | enabled; exact check `verify` only |
| require branches up to date | disabled (`strict: false`) |
| conversation resolution | enabled |
| force pushes | disabled |
| branch deletion | disabled |
| administrator enforcement | enabled wherever the selected GitHub rule mechanism supports it; unavoidable owner/app bypasses are recorded in readback |
| all other restrictions | not introduced |

## Exact `kanmer-board` policy

Target the exact branch name `kanmer-board` in a separate rule.

| setting | value |
|---|---|
| pull request requirement | disabled |
| required status checks | disabled |
| conversation resolution | disabled / not applicable |
| ordinary direct push | allowed for the Kanmer sync actor/operator |
| force pushes | disabled |
| branch deletion | disabled |
| administrator enforcement | enabled for force/delete prohibitions wherever supported; unavoidable owner/app bypasses are recorded in readback |
| all other restrictions | not introduced |

## Initial rollout and readback

1. Capture both current policies before mutation (the 404 readback above).
2. Create/update only the exact `main` and `kanmer-board` rules with the values
   in the tables. Do not add `kanmer-gate` to required checks yet.
3. Fetch both policies again through the GitHub API/UI. Record rule IDs, target
   patterns, required checks, PR/conversation settings, enforcement, bypass
   actors, force-push and deletion fields in the proof and this file.
4. Compare every load-bearing value with the tables before any behavior test.
   If `kanmer-board` has a PR/check restriction, remove it before continuing.
5. Record the exact save timestamp and authenticated operator.

## Behavioural verification

- **Pending PR:** use a real PR targeting `main` whose `verify` check is
  pending or absent. GitHub must report the required check as a merge blocker.
- **Conversation:** retain one unresolved review conversation on a controlled
  PR after `verify` is green; merge remains blocked until it is resolved. Do
  not merge a test PR solely for this ticket.
- **Direct `main` push:** after a final rule readback, an authorized operator
  creates a local empty test commit and attempts one ordinary non-force push to
  `main`. GitHub must refuse it. Record the command, ref, server response,
  timestamp, and operator; remove the disposable local commit without touching
  remote `main`.
- **Board push:** perform one legitimate ordinary Kanmer board sync/direct push
  (never `--force`) and record the successful ref update and healthy board
  worktree. Do not fabricate ticket data solely for this test.
- Do not attempt force-push or deletion negatives; the saved settings and
  readback are sufficient.

If a direct `main` push is accepted, stop immediately, preserve the accepted
SHA, open a remediation ticket, and restore state only through a normal PR or
revert under human control. The ticket cannot pass.

## Adding `kanmer-gate` later

After CORE-024 is merged, wait for `kanmer-gate` to post on a real PR and copy
the exact displayed check name. Confirm the PR is still mergeable under the
existing `verify` rule, then append the observed gate check to `main` required
checks and repeat the blocked/green tests. Never rename a job while it is
required; stage any rename as an observed-new-check transition.

## Emergency change and restoration

Only an authorized human may temporarily change a rule. Log UTC timestamp,
operator, affected rule/check, reason, temporary value, linked incident or
follow-up ticket, restoration command, and post-restore readback. A CI outage
does not authorize an agent to bypass protection. Restore the approved values
immediately and attach the readback to the ticket.

## Do not configure

Do not add approvals, code owners, stale-review dismissal, last-push approval,
branch-up-to-date requirements, signed commits, linear history, deployments,
merge queue, auto-merge, branch locking, push restrictions, wildcard targets,
tag protection, or any check not observed on a real run. Do not change workflow,
board-sync, package, or verification source in this ticket.

## Live readback and evidence

The normalized post-save settings, rule identifiers, behavior-test commands and
responses, and any unavoidable bypass actors are appended here before review.
The ticket proof is written on merged `main`; this playbook is the durable
operator handoff and must remain accurate after closeout.
