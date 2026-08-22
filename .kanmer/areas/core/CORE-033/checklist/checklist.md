# Checklist — CORE-033

## Preconditions

- [x] Confirm CORE-032 is merged and `verify` has posted on a real PR. (PR #136; run 32546955237/job 96967001211.)
- [x] Confirm GUI-085 is merged and its proof shows the Windows timeout root cause is fixed. (PR #88 Done; bounded timeout fix recorded.)
- [x] Record successful `verify` run 1: PR, head SHA, run ID, exact displayed check name, conclusion, timestamps, duration. (PR #142, a174ce96, run 32546955237, `verify`, success.)
- [x] Record successful `verify` run 2 on a distinct PR head SHA with the same fields. (PR #157, fddcd9b4, run 32557139544, `verify`, success.)
- [x] Confirm both observed check-name strings are byte-for-byte identical. (Both `verify`.)
- [x] Confirm an authorized human/operator has repository rule-management access. (gh identity collisionengineers; repository admin.)

## Playbook

- [x] Create `docs/plans/compiled-workflow/playbook.md`.
- [x] Add purpose, invariants, repository/operator/date/rule-ID fields.
- [x] Add the concrete prerequisite evidence table; no vague “verified” rows.
- [x] Add the exact `main` settings table, including explicitly unintroduced options.
- [x] Add the exact `kanmer-board` settings table, preserving ordinary direct pushes.
- [x] Add initial rollout and post-save readback procedures.
- [x] Add behavioural tests for pending/missing check, unresolved conversation, direct `main` push, and board push.
- [x] Add the future CORE-024/`kanmer-gate` procedure requiring one observed job run first.
- [x] Add emergency temporary-change and mandatory-restoration logging.
- [x] Add the “do not configure” list and unavoidable-bypass recording.

## Configure `main`

- [x] Capture the current/before settings. (Both branches returned 404 Branch not protected.)
- [x] Target exact branch `main`, not a wildcard covering the board branch.
- [x] Enable pull-request requirement.
- [x] Require only the exact observed `verify` check.
- [x] Enable conversation resolution.
- [x] Disable force pushes.
- [x] Disable branch deletion.
- [x] Apply enforcement to administrators/maintainers as far as supported and list unavoidable bypasses.
- [x] Confirm no approval count, code owner, branch-up-to-date, signed commit, linear history, deployment, queue, lock, or unrelated restriction was added.
- [x] Save and record the rule name/ID and timestamp. (Branch-protection API URL recorded; personal-repo endpoint exposes no numeric rule ID.)

## Configure `kanmer-board`

- [x] Capture the current/before settings.
- [x] Target exact branch `kanmer-board` in a separate rule.
- [x] Leave PR requirement disabled.
- [x] Leave required status checks disabled.
- [x] Leave ordinary direct pushes available.
- [x] Disable force pushes.
- [x] Disable branch deletion.
- [x] Record any unavoidable bypass actors. (Owner exception documented; no user/team restrictions supported.)
- [x] Save and record the rule ID/name plus timestamp.

## Readback and behavioural proof

- [x] Read both saved rules back through GitHub and paste normalized values into the playbook/proof.
- [x] Compare every load-bearing field with the approved settings before testing.
- [x] Confirm a real PR is blocked while `verify` is missing or pending. (PR #158 initially BLOCKED with verify/kanmer-gate QUEUED; gh pr checks recorded.)
- [x] Confirm an unresolved conversation blocks a green PR and resolving it clears that blocker. (Thread PRRT_kwDOT2PEds6bXFpb isResolved false, then true; PR #158 moved BLOCKED→CLEAN once checks passed.)
- [x] Under authorized operator control, attempt one ordinary non-force direct push of an empty local commit to `main`; record the protected-branch refusal. (Disposable 154b6cdb; GH006; exit 1.)
- [x] Remove/reset the refused local empty commit without touching remote `main`.
- [x] Use a legitimate ordinary Kanmer board sync/direct push and record its success without `--force`. (Production GUI syncBoard; board commit 83cdf801; remote ref confirmed.)
- [x] Confirm no force-push or deletion negative test was attempted.
- [x] If any direct `main` push is unexpectedly accepted, stop, preserve the SHA, open remediation, and do not mark this ticket complete. (Condition did not occur; GH006 refusal recorded.)

## Scope and handoff

- [x] Run `git diff --check`.
- [x] Confirm the source diff contains only `docs/plans/compiled-workflow/playbook.md`.
- [x] Confirm `.github/workflows`, verification scripts, board-sync code, package files, and governing docs are unchanged.
- [x] Confirm the playbook lists `kanmer-gate` as future-only, not currently required.
- [x] Open the PR with `Kanmer: CORE-033` in the body and attach the settings/readback/behaviour evidence. (PR #158.)
- [x] Stop at review readiness; do not merge, bypass protection, begin CORE-035, or add `kanmer-gate`.

## Progress notes

- 2026-08-22: playbook committed as 89e61bdf before rule mutation; live rules created/read back via GitHub API.
- 2026-08-22: direct main push disposable SHA 154b6cdb rejected GH006; no remote mutation.
- 2026-08-22: PR #158 pending-check observation (run 32557510255): verify and kanmer-gate queued; unresolved thread blocked PR, then GraphQL resolution cleared it after both checks passed.
- 2026-08-22: production GUI syncBoard helper committed and pushed board scratch update 83cdf801; remote kanmer-board ref matches and worktree is clean.
- 2026-08-22: current PR head c283f4cc includes final readback/board evidence; hosted checks are rerunning. Independent review remains required; no merge or CORE-035 start.
