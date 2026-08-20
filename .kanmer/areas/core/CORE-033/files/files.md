# Files — CORE-033

## Where the change lands

| Path / surface | Why |
|---|---|
| `docs/plans/compiled-workflow/playbook.md` | New durable operator playbook. Record prerequisites, the two successful `verify` runs, exact GitHub-displayed check names, initial `main` and `kanmer-board` rule settings, behavioural verification, rollback/emergency handling, and the later procedure for adding `kanmer-gate`. |
| GitHub repository settings for branch/ruleset targeting `main` | Operational mutation: require PRs, the exact observed `verify` check, and resolved conversations; refuse force pushes and deletion; ensure intended actors cannot bypass the physical boundary. |
| GitHub repository settings for branch/ruleset targeting `kanmer-board` | Operational mutation: refuse force pushes and deletion while preserving ordinary direct pushes; no PR or status-check requirement. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `.github/workflows/pr.yml` | Delivered by CORE-032. Provides the real `verify` job/check whose observed display name is required here. Do not rename or edit it in this ticket. |
| `scripts/verify.mjs` | Defines what the required PR check actually executes; no verification step is recreated in the playbook. |
| `docs/manual/board-sync.md` | User-facing proof that board sync commits/rebases and directly pushes `kanmer-board`, and that Kanmer never force-pushes. |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Governing shipped contract for the board branch/worktree and direct-push sync path. |
| `apps/gui/src/main/kanmerGit.ts` | Implementation context for `syncBoard`; inspect only if the operator needs to confirm the current push path before protection. No code change belongs here. |
| `MASTERPLAN.md` | S-03 and Appendix A fix the two rule policies, rollout order, exact-name rule, and future `kanmer-gate` procedure. |
| `.kanmer/groups/EPIC-009/context.md` | Requires two green runs and places GUI-085 before protection; rules out unrelated workflow expansion. |
| CORE-032 ticket evidence | Supplies the first and second successful `verify` run IDs, PR numbers, head SHAs, duration, and displayed check name. |
| GUI-085 ticket proof | Confirms the canonical Windows timeout defect is fixed before the check becomes mandatory. |
| CORE-024 ticket | Owns the later real `kanmer-gate` job; it must not be pre-required by this ticket. |

## Playbook content map

The new playbook must contain these sections in order:

1. Purpose and invariants.
2. Preconditions/evidence table.
3. Exact `main` settings.
4. Exact `kanmer-board` settings.
5. Initial enablement sequence.
6. Settings readback and behavioural test procedure.
7. Expected results and failure handling.
8. Adding `kanmer-gate` after CORE-024.
9. Emergency temporary rollback and restoration log.
10. Recorded live values: repository, rule IDs, observed check strings, run/PR/head SHA evidence, operator, date.

## Ripple effects

- CORE-035 depends on these settings for its end-to-end protected-merge scenario.
- CORE-024 can add its job to `.github/workflows/pr.yml`, but it must follow the playbook’s “observed once before required” procedure.
- Renaming the `verify` job after protection would break required-check matching; any future rename requires a staged transition recorded in the playbook.
- Board sync remains an intentional direct writer. A rule that accidentally requires PRs/checks on `kanmer-board` is a product outage, not a harmless policy difference.
- Repository owners need an explicit emergency path because a CI infrastructure outage can otherwise block all merges; the path is auditable operator intervention, not an agent bypass.

## Out of scope

- Changing `.github/workflows/pr.yml`, adding `kanmer-gate`, or modifying verification code.
- Requiring approvals, code owners, signed commits, linear history, deployments, merge queue, auto-merge, branch-up-to-date, branch locking, or push restrictions not named by the ticket.
- Changing Kanmer board-sync implementation or moving board mutation behind PRs.
- Protecting release tags or any branch other than exact `main` and `kanmer-board`.
- Creating a GitHub App, custom bypass service, or automated repository-policy reconciler.
- Merging any PR as part of the implementation agent’s work.
