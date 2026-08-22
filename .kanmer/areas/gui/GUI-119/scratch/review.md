# Independent review — PASS

Reviewed independently of author gui099_executor. Exact PR #217 head `0403684bdc448b3aef0ce8f62793525e1ce67619`; base `core-043-protection-retarget` at `1126253eed586111db60ed72eccf6754f0f5ef06`.

## Changes checked

- `apps/gui/src/main/index.ts` passes the saved `readSettings().kanmerBranch` into OpenAI tunnel invocation creation, RemoteAccessManager, and update-skills IPC.
- `apps/gui/src/main/remoteAccess/manager.ts` applies normalized `KANMER_BOARD_BRANCH` to both remote runtime and doctor child environments.
- `apps/gui/src/main/connect.ts` stages only marketplace-owned roots, patches the Claude MCP descriptor with the normalized branch, invokes provider-owned marketplace commands against the temporary root, and removes staging in `finally`; the shipped bundle and user-global marketplace are not mutated.
- Deterministic regressions cover OpenAI adversarial branch text `team&whoami`, remote normalization/defaults, and staged Claude descriptor inspection. The remaining changed test lines are scoped to the above production seams.

## Evidence

- Focused GUI provider rail: 56/56 PASS, exit 0.
- GUI typecheck: PASS, exit 0.
- GUI build: PASS, exit 0 (existing gray-matter eval warning only).
- `verify:docs`: PASS, exit 0; manual current (22 chapters).
- `test:scripts`: 89/89 PASS, exit 0.
- `git diff --check`: PASS, exit 0.
- PR is OPEN and mergeable at the exact head/base above; no hosted checks were reported.
- The report's initial scripts failure and full-suite timeout/hang remain preserved as typed evidence; focused rails are the bounded deterministic proof.
- Real Claude/OpenAI/remote host, installed marketplace, tunnel, and protected-live-branch evidence remain INCONCLUSIVE and are not claimed as PASS.

## Disposition

No blocking or non-blocking findings. The implementation matches GUI-119's plan and FRD-020/FRD-012/ADR-0016 contracts within scope. Verdict: PASS; authorized to merge non-squash into `core-043-protection-retarget`.

Post-merge traceability: PR #217 merged non-squash at `2026-08-22T22:12:05Z`, merge commit `7654a28104fbc67c58cad61241188d0f3d898c17`. The implementation head `0403684bdc448b3aef0ce8f62793525e1ce67619` and merge commit were verified against the requested base before handoff.
