# Plan — CORE-032: GitHub Actions PR workflow — `verify` job only

## Objective

Expose CORE-031’s authoritative `npm run verify` rail as the repository’s first stable GitHub pull-request check, on Windows, without adding merge-gate behaviour or causing direct board-branch pushes to run CI.

## Starting state

- No `.github/workflows/` directory or CI check exists.
- CORE-031 provides the shared root `verify` command and blocks this ticket until that command is merged.
- `main` and `kanmer-board` remain unprotected; protection is deliberately owned by CORE-033.
- CORE-024 will later add a real `kanmer-gate` job to this workflow after its evaluator exists.

## Approach

Create one minimal workflow file with one job. Trigger only the four specified `pull_request` lifecycle events for PRs whose base is `main`; set repository permissions to read-only, select Bash explicitly for Windows run steps, check out the PR, install Node 20, and execute `npm ci && npm run verify`. Do not add optimization or future placeholders. This makes the first observed `verify` check a trustworthy name for branch protection and keeps board mutations out of Actions by construction.

## Governing docs

- No PRD, FRD, or ADR is linked in `refs`; this ticket is repository-operations wiring rather than a new application architecture decision.
- **EPIC-009 context:** met by adding only the first required CI physics; branch protection and `kanmer/gate` remain in their dedicated tickets.
- **MASTERPLAN S-02 and Appendix A:** met by the exact event list, base branch, runner, shell, Node major, command, permission, single-job topology, no-stub rule, and check-name stability below.

## Required changes

1. Confirm CORE-031 is merged and the branch contains a working root `npm run verify`; do not duplicate or repair that rail in this ticket.
2. Create `.github/workflows/pr.yml` with a concise workflow display name that does not alter the required job/check name.
3. Configure only:

   ```yaml
   on:
     pull_request:
       branches: [main]
       types: [opened, synchronize, reopened, ready_for_review]
   ```

   Do not add `push`, `workflow_dispatch`, `schedule`, `merge_group`, path filters, or another base branch.
4. Set top-level permissions to:

   ```yaml
   permissions:
     contents: read
   ```

5. Set the workflow-level run default to Bash:

   ```yaml
   defaults:
     run:
       shell: bash
   ```

6. Define exactly one job under `jobs`, with ID `verify` and explicit display name `verify` so the first observed check name is unambiguous.
7. Set `runs-on: windows-latest`. Do not introduce a matrix or fallback runner.
8. Add an `actions/checkout@v4` step with default shallow checkout; this ticket requires no board branch or history traversal.
9. Add an `actions/setup-node@v4` step with `node-version: 20`. Do not add dependency caching before measuring a real run.
10. Add one run step named clearly, with the exact command on one shell line:

    ```bash
    npm ci && npm run verify
    ```

11. Inspect the YAML for a second job, write permission, broad event, conditional draft skip, Linux runner, or gate stub; remove any such addition.
12. Commit/push the workflow on the ticket branch and open the implementation PR against `main` with `Kanmer: CORE-032` in the body.
13. Use the PR’s own Actions run as the first real verification:
    - confirm one check named `verify` appears;
    - confirm it runs on a Windows runner with Node 20 and Bash;
    - confirm `npm ci` and `npm run verify` both exit zero;
    - record elapsed duration and whether it is below the `<10 min` target.
14. If the check fails, fix the actual failing code/rail only when the cause is in this ticket. If an unrelated pre-existing leaf is red, stop and report it to its owner rather than weakening the workflow.
15. After merge, use the next ordinary `kanmer-board` sync commit as non-trigger evidence: verify no run for `pr.yml` was created from that direct push. Do not manufacture a board mutation solely for this proof.

## Expected files

- Add: `.github/workflows/pr.yml`

## Do not modify

- `scripts/verify.mjs`, `scripts/release.mjs`, `package.json`, or `package-lock.json`
- Any application/test source
- Repository branch-protection/ruleset settings
- Board files or board sync configuration
- Any additional workflow file

## Ordered implementation steps

1. Re-read CORE-031’s merged command and run it locally or in a normal checkout to ensure the dependency is real.
2. Create the workflow directory/file.
3. Enter the event and permission blocks exactly.
4. Enter the Bash default.
5. Enter the single `verify` job and its three steps.
6. Perform a line-by-line scope audit against the required YAML contract.
7. Confirm the file is the only diff.
8. Open/synchronize the PR and observe the workflow from GitHub rather than inferring success locally.
9. Capture the check name, conclusion, runner, commands, and duration.
10. Stop at review readiness; leave protection and gate-job expansion to their blocked tickets.

## Acceptance checks

- `.github/workflows/pr.yml` exists and is the only changed path.
- The workflow has exactly one job ID and display name: `verify`.
- The only trigger is `pull_request` to `main` for `opened`, `synchronize`, `reopened`, and `ready_for_review`.
- Top-level permissions contain only `contents: read`.
- All `run:` steps use Bash.
- The job runs on `windows-latest` and installs Node 20.
- The sole execution command is `npm ci && npm run verify`.
- There is no `kanmer-gate` job or stub.
- A real PR reports a green check whose displayed name is `verify`.
- The real run duration is recorded and targeted below ten minutes; duration alone is not grounds to delete checks.
- A direct `kanmer-board` push produces no run from this workflow.

## Verification

Local/static inspection before push:

```bash
git diff --check
git diff -- .github/workflows/pr.yml
git status --short
```

Real PR evidence:

```bash
gh pr checks <pr-number>
gh run list --workflow pr.yml --branch <ticket-branch> --limit 5
gh run view <run-id> --log
```

Post-merge non-trigger evidence after an ordinary board sync:

```bash
gh run list --workflow pr.yml --branch kanmer-board --limit 10
```

Record that no run corresponds to the direct board push; do not treat absence before the workflow is merged as proof.

## Risks / open questions

- **Check-name drift:** protection later matches the displayed name. Mitigation: explicit job name `verify`, capture the actual UI/CLI string, and do not rename it after protection.
- **Windows shell mismatch:** future gate commands use Bash variable syntax. Mitigation: workflow-level `shell: bash` now.
- **First-run red rail:** CI may expose a real existing failure. Mitigation: retain the check and route the failure; never switch OS or remove a step merely to get green.
- **Accidental board CI:** a `push` trigger would run on board sync. Mitigation: event contract contains only `pull_request`.
- No unresolved question remains.

## Failure and deviation rules

- Do not add a second job, placeholder gate, write permission, alternative OS, cache, retry, matrix, artifact, or trigger.
- Do not alter the authoritative verify rail from this ticket.
- A GitHub run that did not execute on the current PR head is not acceptance evidence.
- Report a duration above ten minutes with the slow step; do not optimize without a separate measured follow-up.
- Do not configure branch protection or merge the PR.

## Stop condition

Stop when the one-file PR has produced one green Windows check named `verify` on its current head, the exact run evidence and duration are recorded, and the workflow contains no trigger capable of running on direct `kanmer-board` pushes. Do not merge and do not begin CORE-033 or CORE-024.
