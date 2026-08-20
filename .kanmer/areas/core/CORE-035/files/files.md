# Files — CORE-035

## Kanmer evidence written by this ticket

| Path / record | Exact role |
|---|---|
| `proof/proof.md` on CORE-035 | Final SHA-bound proof record for the integration exercise, with chronological attempts and a link/summary of the complete command log. |
| `proof/compiled-workflow-integration.md` on CORE-035 | Full chronological command/MCP/GitHub interaction log: fixture identities, each expected refusal/check result, protected merge, detached verification, and cleanup. If the tool surface requires a type-relative path, address it as `proof/compiled-workflow-integration`. |
| `scratch/integration-run.md` on CORE-035 | Optional running notes while the exercise is active. Never substitute this for final proof and never place secrets in it. |

## Disposable remote/local fixture

These paths are created outside the Kanmer source repository and removed after evidence is stored:

| Path / surface | Purpose |
|---|---|
| `<temp>/kanmer-spine-integration-<run-id>/source/` | Minimal Node 20 source repository used by INT-004. |
| `<temp>/kanmer-spine-integration-<run-id>/source/.worktrees/kanmer/` | Disposable board worktree on `kanmer-board`; must remain separate from ticket worktrees. |
| `<temp>/kanmer-spine-integration-<run-id>/source/.worktrees/int-004/` | Happy-path implementation worktree. |
| `<temp>/kanmer-spine-integration-<run-id>/source/.worktrees/verify-int-004-<merge-sha>/` | Detached exact-merge-SHA verification worktree. |
| Private GitHub repo `kanmer-spine-integration-<run-id>` | Real PR/check/protection boundary. Must be clearly disposable, private, and deleted after proof. |
| Disposable `kanmer-board` branch | Holds the four fixture tickets and their documents. No PR requirement; no force/delete during the run. |
| `.github/workflows/pr.yml` in disposable source repo | Runs deterministic fixture verification and the real `kanmer-gate` command/check. Copy/adapt the shipped workflow contract; do not invent a fake pass job. |
| `package.json`, `src/value.mjs`, `test/value.test.mjs` or equivalent minimal files | Small real implementation and deterministic test. No dependencies beyond Node built-ins unless the Kanmer CLI package itself must be installed/built from the tested checkout. |

## Shipped Kanmer surfaces exercised, not modified

- `get_status`, `get_execution_packet`, `get_doc_gates`, `take_ticket`, document writes, moves, links.
- `scripts/verify.mjs` / root `npm run verify` in the Kanmer build under test.
- `.github/workflows/pr.yml` job contracts `verify` and `kanmer-gate`.
- `packages/core/src/merge-gate.ts` and `packages/mcp-server/src/check-pr.mjs`.
- SHA-bound review/proof schema and updated execute/review/verify skills.
- Branch protection/playbook from CORE-033.

## Required fixture ticket records

- INT-001: profile `spike`, valid research, no implementation dispatch.
- INT-002: profile `feature`; first missing preparation docs, then docs complete but one unresolved question.
- INT-003: ready ticket taken by a distinct actor with a non-board `.worktrees/int-003` path.
- INT-004: happy-path chore/feature with exact plan/checklist/files required by its resolved profile, no unresolved questions, no open dependency at final merge.
- One dependency ticket/edge used to fire `DEPENDENCY_BLOCKED`, then resolved through normal completion/unlink as the scenario specifies.

## Source-repository changes

No permanent Kanmer source file is expected. The integration ticket is complete through board proof. If execution discovers a product defect, stop the affected path and file a separate fix ticket; do not patch production code inside CORE-035.

## Do not modify

- The real Kanmer repository’s branch protection, `main`, or `kanmer-board` for fixture purposes.
- Existing product tickets/groups except CORE-035 evidence/status.
- Required check configuration through an override or bypass.
- Any secret/token file, global Git config, unrelated remote, or persistent package publication.
- Add a reusable integration framework, GitHub App, lease system, or golden-board harness.
