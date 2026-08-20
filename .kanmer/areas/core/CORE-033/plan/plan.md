# Plan — CORE-033: Protect `main` and `kanmer-board`; write the ops playbook

## Objective

Turn GitHub into the first physical merge boundary for Kanmer while preserving the board branch’s shipped direct-push synchronization path. Document the exact live settings, evidence, verification, and recovery procedure so the policy is reproducible and safe to extend.

## Starting state

- CORE-032 creates a real Windows `verify` PR check but is a blocker until merged.
- GUI-085 is a blocker because its non-deterministic Windows timeout must be fixed before the check becomes mandatory.
- `main` and `kanmer-board` currently have no required protection contract.
- Automatic board sync directly pushes ordinary commits to `kanmer-board`; requiring a PR/check there would break normal operation.
- CORE-024 will later add `kanmer-gate`, but that check does not yet exist and must not be configured prematurely.

## Approach

Treat this as an operator-controlled configuration change plus one durable documentation file. First establish objective prerequisites: both blocker tickets complete and two green `verify` runs on distinct current PR heads. Capture the check name exactly as GitHub displays it. Write the playbook before changing settings, using placeholders only for live identifiers/evidence that will be filled during execution. Configure `main` with the narrow required-PR/check/conversation policy and configure `kanmer-board` with only no-force/no-delete. Read both policies back, perform controlled behavioural tests, fill the evidence table, and stop. The implementation agent does not merge code or add future gate behaviour.

## Governing docs

- **FRD-020 R1/R3:** preserved. The board remains on `kanmer-board`; automatic sync performs ordinary direct pushes, never force pushes, and therefore remains permitted by the board rule.
- **EPIC-009 context:** satisfied by waiting for GUI-085 and two green verification runs before creating the one-way merge boundary. No lease, new stage, hierarchy, or GitHub App is introduced.
- **MASTERPLAN S-03 / Appendix A:** implemented exactly: `main` requires PR + observed `verify` + conversation resolution and forbids force/deletion; `kanmer-board` forbids force/deletion but has no PR/check requirement; no unseen check is required; `kanmer-gate` is added only after it has posted.
- No new ADR/FRD is required; the playbook records operations rather than replacing the adopted architecture.

## Required changes

### A. Establish prerequisites

1. Confirm CORE-032 is merged and its proof identifies a successful real-PR run on Windows.
2. Confirm GUI-085 is merged and its proof demonstrates the canonical timeout failure is fixed rather than merely hidden with a global timeout increase.
3. Locate two successful `verify` runs on two distinct PR head SHAs after both prerequisites are present.
4. For each run record: PR number, head SHA, Actions run ID, conclusion, start/end time, duration, and the exact check string visible in the PR/rules UI.
5. Confirm the two observed check strings are identical. If they differ, stop; do not configure a required check until the job naming conflict is corrected.
6. Confirm the executing human has authority to create/read repository rules. Agents may prepare commands and documentation but must not invent credentials or bypass access controls.

### B. Write the playbook before mutating settings

7. Create `docs/plans/compiled-workflow/playbook.md`.
8. Add a header identifying this as the operational contract for the compiled-workflow spine, with last-verified date, repository, operator, and rule identifiers.
9. Add an invariants section stating:
   - GitHub is the merge boundary.
   - `verify` is the only initially required status check.
   - `kanmer-board` remains a direct-push operational branch.
   - force pushes/deletion are prohibited on both protected branches.
   - no check is required before it has posted at least once.
   - required check job names are stable interfaces.
10. Add a prerequisite evidence table containing the two green runs and GUI-085 completion reference. Leave no vague “confirmed” claim; use concrete IDs/SHAs/timestamps.
11. Add the exact `main` policy table:
    - branch/ruleset target: exact `main`;
    - require pull request before merging: enabled;
    - required approvals: zero/no new approval threshold unless an independently existing repository policy is explicitly retained and documented;
    - dismiss/stale reviews, code-owner review, last-push approval: not introduced;
    - required status checks: enabled;
    - required check: exact observed `verify` string;
    - require branches up to date: not introduced;
    - conversation resolution: enabled;
    - force pushes: disabled;
    - deletions: disabled;
    - signed commits, linear history, deployment gates, merge queue, lock branch, push restriction: not introduced;
    - bypass/enforcement: apply to administrators and other actors wherever the selected GitHub mechanism supports it; enumerate unavoidable bypass actors.
12. Add the exact `kanmer-board` policy table:
    - branch/ruleset target: exact `kanmer-board`;
    - pull request requirement: disabled;
    - status checks: disabled;
    - conversation resolution: disabled/not applicable;
    - ordinary direct push: allowed;
    - force pushes: disabled;
    - deletions: disabled;
    - all other restrictions: not introduced;
    - bypass/enforcement: no actor should gain force/delete permission silently; enumerate unavoidable owner bypass.
13. Add an initial rollout procedure matching section C below.
14. Add readback commands/UI fields and a place to paste normalized settings output after creation.
15. Add behavioural verification procedures and expected outcomes for sections D–F below.
16. Add a later `kanmer-gate` extension procedure:
    - CORE-024 merged;
    - job posts on a real PR;
    - exact displayed name captured;
    - current PR remains mergeable with existing `verify` rule before modification;
    - append the observed gate check to `main` required checks;
    - re-run blocked/green PR tests;
    - never rename either job without a staged rule transition.
17. Add an emergency section requiring authorized-human action only, a timestamped reason, affected check/rule, temporary change, linked incident/follow-up ticket, and explicit restoration/readback evidence.
18. Add a “do not configure” list covering all unapproved repository policies.

### C. Configure `main`

19. Re-read current repository rules immediately before mutation and save the before state in the playbook/proof.
20. Create or update the narrow rule targeting exact `main`; do not use a wildcard that also captures `kanmer-board`.
21. Enable pull-request-only changes.
22. Enable required status checks and select only the exact observed `verify` check.
23. Enable required conversation resolution.
24. Disable force pushes and branch deletion.
25. Configure enforcement/no bypass for normal administrators/maintainers to the maximum supported by the chosen rule type; explicitly list repository-owner or app bypasses that cannot be removed.
26. Leave every unapproved option unchanged/off. Do not opportunistically impose an approval count or branch-up-to-date requirement.
27. Save the rule and capture its GitHub ID/name plus timestamp.

### D. Configure `kanmer-board`

28. Re-read the current board-branch settings and save the before state.
29. Create or update a rule targeting exact `kanmer-board`, separate from `main`.
30. Leave pull requests, required checks, and conversation resolution disabled.
31. Confirm ordinary pushes remain allowed for the Kanmer sync actor/operator.
32. Disable force pushes and deletion.
33. Apply no-bypass enforcement to force/delete prohibitions as far as supported and record any unavoidable exceptions.
34. Save and capture the rule ID/name plus timestamp.

### E. Read back and compare

35. Fetch/read both saved policies through GitHub’s UI or API after mutation; do not rely on the values submitted.
36. Normalize the readback into the playbook’s settings tables.
37. Compare every load-bearing field with the approved policy.
38. If `kanmer-board` shows a PR/check restriction, remove it before testing sync.
39. If `main` lacks the observed `verify` check, conversation resolution, PR requirement, or force/delete protection, stop and correct the rule before behavioural tests.
40. Commit only the completed playbook file on the ticket branch and open a PR with `Kanmer: CORE-033`; the settings evidence can be redacted only for secrets, never for rule values or check names.

### F. Behavioural verification

41. **Unchecked/pending PR test:** use a real PR targeting `main` whose current head has not yet completed `verify` (or temporarily observe it immediately after synchronizing a harmless documentation-only head). Confirm GitHub reports merge blocked specifically by the missing/pending required check.
42. **Conversation test:** create or retain one unresolved review conversation on a controlled test PR after `verify` is green; confirm merge remains blocked, then resolve it and confirm that blocker clears. Do not merge the test PR solely for this ticket.
43. **Direct `main` push test:** an authorized operator creates a local empty test commit from current `main` with no content changes, confirms rule readback again, and attempts an ordinary non-force push directly to `main`. Expected result: GitHub refuses it. Record command, ref, server response, timestamp, and operator. Delete the local empty commit/reset the disposable local branch after refusal.
44. If the direct push is unexpectedly accepted, stop all work immediately; do not stack another commit. Open a remediation ticket, preserve the accepted SHA, and restore repository state through a normal PR/revert under human control. The ticket cannot pass.
45. **Board push test:** invoke ordinary Kanmer “Sync now” or an equivalent normal board commit/push after a legitimate board mutation already exists. Confirm the direct push to `kanmer-board` succeeds without force and the board worktree remains healthy. Do not create fabricated ticket data solely for the test.
46. Confirm a force push and branch deletion were not attempted; their disabled settings plus readback are sufficient because destructive negative tests are unnecessary.
47. Attach or record all behavioural evidence in the playbook/proof and map each result to the ticket’s three verification claims.

### G. Final audit

48. Confirm no workflow/application/board-sync source changed.
49. Confirm exactly one repository file was added and both live rules match the documented readback.
50. Confirm the playbook says `kanmer-gate` is future-only and does not list it among current required checks.
51. Confirm CORE-035 can consume the documented settings and evidence without rediscovering the policy.

## Expected files

- Add: `docs/plans/compiled-workflow/playbook.md`

## Do not modify

- `.github/workflows/pr.yml`
- `scripts/verify.mjs`, `scripts/release.mjs`, package files, or tests
- `apps/gui/src/main/kanmerGit.ts` or any board-sync implementation
- `docs/manual/board-sync.md` or FRD-020 unless a separate contradiction ticket is opened
- Board ticket content except this ticket’s Kanmer documents/evidence
- Any GitHub rule for a branch other than exact `main` and exact `kanmer-board`

## Acceptance checks

- CORE-032 and GUI-085 are complete before configuration.
- Two green `verify` runs on distinct PR head SHAs are recorded.
- The required check string is copied from GitHub exactly and was observed at least once before it was required.
- `docs/plans/compiled-workflow/playbook.md` contains complete prerequisites, both exact policies, rollout/readback/tests, `kanmer-gate` extension, emergency restoration, and live evidence.
- `main` requires PR, exact `verify`, and conversation resolution and refuses force pushes/deletion.
- A PR without completed `verify` cannot merge.
- A green PR with an unresolved conversation cannot merge until resolved.
- An ordinary direct push to `main` is refused.
- `kanmer-board` has no PR or status-check requirement, refuses force/deletion by configuration, and accepts an ordinary board sync push.
- No additional repository policy or source-code change was introduced.

## Verification commands / evidence

Use the GitHub UI or authenticated CLI/API to capture current and final settings. Where CLI is used, retain redacted JSON output containing rule IDs, target patterns, required checks, PR requirement, conversation resolution, bypass actors, force-push, and deletion fields.

Repository diff:

```bash
git diff --check
git diff -- docs/plans/compiled-workflow/playbook.md
git status --short
```

Check/run evidence:

```bash
gh pr checks <pr-1>
gh pr checks <pr-2>
gh run view <run-id-1> --json databaseId,headSha,conclusion,createdAt,updatedAt,name
gh run view <run-id-2> --json databaseId,headSha,conclusion,createdAt,updatedAt,name
```

Controlled direct-push evidence is an ordinary non-force push of an empty local test commit and must return a protected-branch refusal. Board evidence is a normal Kanmer sync/direct push, never `--force`.

## Risks / open questions

- **Accidental board outage:** a wildcard or copied `main` rule could require PR/checks on `kanmer-board`. Mitigation: exact branch targets, separate rules, readback before sync test.
- **Permanent merge lockout:** requiring an unseen or unstable check can block every PR. Mitigation: two green runs and exact observed name; `kanmer-gate` deferred until it posts.
- **Maintainer bypass:** protection may appear successful for contributors but allow admin pushes. Mitigation: enforce broadly and document unavoidable owner/app bypasses.
- **Over-broad governance:** extra approval or history requirements can create unrelated friction. Mitigation: explicit “not introduced” table and final settings diff.
- **Risky direct-push test:** if protection is wrong, an empty commit could land. Mitigation: readback first, empty commit only, immediate stop/recovery protocol, authorized operator only.
- No unresolved question remains.

## Failure and deviation rules

- Do not configure protection until all prerequisites and two green runs exist.
- Do not require a check that GitHub has never posted.
- Do not add, infer, or “harden” settings outside the exact contract.
- Do not test force push or deletion destructively.
- Do not bypass a red/missing check to merge this or another PR.
- Any unavoidable bypass actor or repository-plan limitation is a reported deviation and blocks claims of absolute enforcement.
- Do not merge this ticket’s PR or begin CORE-035.

## Stop condition

Stop when the one-file playbook accurately records two green runs and the exact live rules, `main` demonstrably blocks unchecked/unresolved/direct-push paths, `kanmer-board` demonstrably still accepts an ordinary sync push, all settings read back exactly as approved, and the PR is ready for independent review. Do not merge and do not begin CORE-035 or add `kanmer-gate`.
