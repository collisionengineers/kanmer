# Checklist — CORE-033

## Preconditions

- [ ] Confirm CORE-032 is merged and `verify` has posted on a real PR.
- [ ] Confirm GUI-085 is merged and its proof shows the Windows timeout root cause is fixed.
- [ ] Record successful `verify` run 1: PR, head SHA, run ID, exact displayed check name, conclusion, timestamps, duration.
- [ ] Record successful `verify` run 2 on a distinct PR head SHA with the same fields.
- [ ] Confirm both observed check-name strings are byte-for-byte identical.
- [ ] Confirm an authorized human/operator has repository rule-management access.

## Playbook

- [ ] Create `docs/plans/compiled-workflow/playbook.md`.
- [ ] Add purpose, invariants, repository/operator/date/rule-ID fields.
- [ ] Add the concrete prerequisite evidence table; no vague “verified” rows.
- [ ] Add the exact `main` settings table, including explicitly unintroduced options.
- [ ] Add the exact `kanmer-board` settings table, preserving ordinary direct pushes.
- [ ] Add initial rollout and post-save readback procedures.
- [ ] Add behavioural tests for pending/missing check, unresolved conversation, direct `main` push, and board push.
- [ ] Add the future CORE-024/`kanmer-gate` procedure requiring one observed job run first.
- [ ] Add emergency temporary-change and mandatory-restoration logging.
- [ ] Add the “do not configure” list and unavoidable-bypass recording.

## Configure `main`

- [ ] Capture the current/before settings.
- [ ] Target exact branch `main`, not a wildcard covering the board branch.
- [ ] Enable pull-request requirement.
- [ ] Require only the exact observed `verify` check.
- [ ] Enable conversation resolution.
- [ ] Disable force pushes.
- [ ] Disable branch deletion.
- [ ] Apply enforcement to administrators/maintainers as far as supported and list unavoidable bypasses.
- [ ] Confirm no approval count, code owner, branch-up-to-date, signed commit, linear history, deployment, queue, lock, or unrelated restriction was added.
- [ ] Save and record the rule name/ID and timestamp.

## Configure `kanmer-board`

- [ ] Capture the current/before settings.
- [ ] Target exact branch `kanmer-board` in a separate rule.
- [ ] Leave PR requirement disabled.
- [ ] Leave required status checks disabled.
- [ ] Leave ordinary direct pushes available.
- [ ] Disable force pushes.
- [ ] Disable branch deletion.
- [ ] Record any unavoidable bypass actors.
- [ ] Save and record the rule name/ID and timestamp.

## Readback and behavioural proof

- [ ] Read both saved rules back through GitHub and paste normalized values into the playbook/proof.
- [ ] Compare every load-bearing field with the approved settings before testing.
- [ ] Confirm a real PR is blocked while `verify` is missing or pending.
- [ ] Confirm an unresolved conversation blocks a green PR and resolving it clears that blocker.
- [ ] Under authorized operator control, attempt one ordinary non-force direct push of an empty local commit to `main`; record the protected-branch refusal.
- [ ] Remove/reset the refused local empty commit without touching remote `main`.
- [ ] Use a legitimate ordinary Kanmer board sync/direct push and record its success without `--force`.
- [ ] Confirm no force-push or deletion negative test was attempted.
- [ ] If any direct `main` push is unexpectedly accepted, stop, preserve the SHA, open remediation, and do not mark this ticket complete.

## Scope and handoff

- [ ] Run `git diff --check`.
- [ ] Confirm the source diff contains only `docs/plans/compiled-workflow/playbook.md`.
- [ ] Confirm `.github/workflows`, verification scripts, board-sync code, package files, and governing docs are unchanged.
- [ ] Confirm the playbook lists `kanmer-gate` as future-only, not currently required.
- [ ] Open the PR with `Kanmer: CORE-033` in the body and attach the settings/readback/behaviour evidence.
- [ ] Stop at review readiness; do not merge, bypass protection, begin CORE-035, or add `kanmer-gate`.

## Progress notes

Append concrete rule IDs, check names, run IDs, SHAs, commands, and GitHub responses here. Do not mark settings complete from memory or screenshots without readable field values.
