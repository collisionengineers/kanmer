# Files — PR body edit merge-gate rerun

| Path | Role | Change |
| --- | --- | --- |
| `.github/workflows/pr.yml` | Pull-request trigger and merge-gate job | Add the `edited` pull-request activity type. |
| `scripts/pr-workflow.test.mjs` | Dependency-free workflow contract test | Require the body-edit trigger and the documented gate maintenance contract. |
| `AGENTS.md` | Contributor instructions | Define how the gate resolves the ticket, runs against the board worktree, and is maintained. |

## Context files

| Path | Why read it |
| --- | --- |
| `packages/mcp-server/src/check-pr.mjs` | Confirms the gate reads `pull_request.body` and needs no code change. |
| `docs/functional/frd/FRD-009-interrogative-workflow.md` | Governs CI-enforced merge readiness. |
| `docs/architecture/adr/ADR-0011-gates-may-read-open-questions.md` | Governs the read-only ticket-state gate. |
| `.github/workflows/pr.yml` on [[CORE-092]] | Supplies the already-correct board fetch/ref mapping used as this ticket’s base. |

Out of scope: `check-pr.mjs`, ticket/policy semantics, the board branch setup, Cloudflare, and source-trust documents.
