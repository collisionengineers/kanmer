# Research — CORE-035: compiled-workflow end-to-end verification

## Question

What single disposable scenario proves that the 0.4.0 spine works as a system—not merely as isolated unit tests—while producing an auditable log and leaving no persistent test repository, branch, worktree, or bypass?

## Findings

### Integration boundary

- The ticket is a verification chore. Its deliverable is evidence, not a new production abstraction or test framework.
- Unit/smoke tests already cover individual store, MCP, skill-prose, and gate functions. This ticket must exercise the real boundaries they cannot prove together:
  - MCP process and project fingerprint;
  - profile-derived execution packet;
  - take/branch/worktree metadata;
  - actual GitHub PR event and `verify`/`kanmer-gate` checks;
  - protected merge refusal/permission;
  - exact merge SHA detached verification;
  - proof record and Done movement.
- A local bare remote cannot prove GitHub required checks, review conversations, or protected merge. The scenario therefore requires a real disposable private GitHub repository created by an authenticated authorized operator/account.
- The Kanmer product repository/board must not be used as the fixture. The disposable repo gets its own source checkout, `kanmer-board` branch/worktree, board data, and branch protection.

### Fixture shape

Use one disposable repository and deterministic Kanmer board containing:

1. `INT-001` — spike, with research present; proves spike refusal dominates.
2. `INT-002` — feature missing required preparation docs and with an unresolved question; first call proves missing-doc refusal; after docs are added the second call proves question refusal.
3. `INT-003` — ready chore/feature taken by `other-actor`; proves occupancy refusal with `missing:[]`.
4. `INT-004` — happy-path small chore with plan/checklist as resolved by its profile and a trivial production file/test change.

The happy-path change should be dependency-free and observable, e.g. add a small exported function plus a Node test to a minimal Node 20 repository. Avoid package publishing, external services, database, GUI, or generated assets; the target is workflow physics.

### Gate matrix

The real PR for INT-004 must produce and retain evidence for these transitions:

- `verify` check posts and passes on the current head.
- `kanmer-gate` fails `NO_TICKET` with no `Kanmer:` footer and no matching branch prefix.
- Amend PR body/footer to `Kanmer: INT-004`; rerun/synchronize.
- Add an unresolved open question; `kanmer-gate` fails the phase-1 open-question check.
- Resolve/park the question as allowed; gate advances.
- Exercise phase-2 checks at least once:
  - wrong ticket stage (`WRONG_STAGE`);
  - blocked dependency (`DEPENDENCY_BLOCKED`);
  - missing or stale review record (`NO_REVIEW_RECORD`/`STALE_REVIEW`, advisory or required according to shipped phase);
  - unreachable recorded commit (`COMMITS_UNREACHABLE`, advisory/fail according to shipped rollout).
- Correct each condition using normal Kanmer/Git operations, never a bypass.
- Write the current-head review attestation and verify final required checks are green on that head.
- Demonstrate GitHub refuses merge while any required check/conversation condition is unmet.
- Merge only through the protected PR path once all required checks pass.

The ticket body explicitly requires missing-ticket and open-question red cases; CORE-025’s accepted scope requires the phase-2 paths. “Every gate fires” is therefore interpreted as every implemented gate outcome in CORE-024/025, with warning versus failure recorded exactly as shipped.

### Exact-SHA verification

- Read the PR `mergeCommit.oid`; create a detached verification worktree at that full SHA.
- Assert `HEAD` equals the merge SHA and is detached.
- Run the fixture tests and relevant Kanmer checks from that worktree.
- Write `proof/proof.md` with full SHA and chronological attempts.
- Only PASS moves INT-004 to Done.
- Confirm the source repository’s ordinary `main` checkout and board worktree branch did not change as a side effect.

### Evidence/logging

- Capture one chronological Markdown command/interaction log under CORE-035 proof, not in source code.
- Each event includes UTC timestamp, machine/account alias, repository, cwd, exact command or MCP call, input identity/head SHA, exit/result, relevant output excerpt, and expected assertion.
- Retain failed gate attempts and warning results; do not overwrite them with the happy path.
- Redact tokens/secrets and delete the disposable remote/local files only after proof is safely stored and reviewed.

### Cleanup

- Remove branch protection/rules only if GitHub requires it before deleting the disposable repository.
- Delete the remote repo, local checkout, board worktree, ticket worktrees, verification worktree, and temporary credentials/config.
- Record cleanup proof (repo not found/local paths absent) without deleting the Kanmer ticket’s proof record.

## Decision

Implement no reusable product script by default. Execute a scripted command checklist plus real MCP/GitHub operations, and store the complete log as proof. If repeated manual setup exposes a deterministic defect, file a separate harness ticket; do not broaden this integration ticket.

## Remaining unknowns

None. Lack of authenticated permission to create/protect/delete a private GitHub repository is an execution blocker to report, not a reason to substitute a local mock or use the production repository.
