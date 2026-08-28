# Files — CORE-135

## Where the change lands

| Path or external surface | Why |
|---|---|
| GitHub `main` branch protection, `required_status_checks` subresource | Change only `strict` to `true`; preserve `verify` and `kanmer-gate` with app id `15368` and every unrelated protection field. |
| `.worktrees/kanmer/.github/workflows/board-regate.yml` on `kanmer-board` | Operator-install the existing canonical workflow byte-for-byte. This is the only non-`.kanmer` board-branch addition. |
| `.kanmer/areas/core/CORE-135/**` via stable MCP | Durable plan, execution log, review/verification evidence and exact board-SHA proof. |
| PR #304 GitHub state | Controlled stale-base fixture: retain old-head check identities, then prove the mandated rebase creates a new head and fresh checks. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `.github/workflows/board-regate.yml` | The exact operator-installed bytes, literal board branch trigger, permissions and dispatch command; do not edit while copying. |
| `.github/workflows/pr.yml` | The existing `workflow_dispatch` and `regate` behavior, required job names, and why the board workflow dispatches rather than evaluates a gate itself. |
| `scripts/pr-workflow.test.mjs` | The focused source contract; it already passes and should not need modification. |
| `docs/architecture/adr/ADR-0016-compiled-workflow.md` | GitHub remains merge physics; Kanmer must not become a merge queue or second evaluator. |
| `docs/functional/frd/FRD-035-golden-board-and-candidate-promotion-safety.md` | Candidate acceptance requires current CI/Kanmer gates and stable-controlled board safety. |
| [[CORE-123]] research, plan, proof and Outcome | The dispatcher is implemented and verified; installation was deliberately left to the operator. |
| `AGENTS.md` board rules | The board worktree stays on its protected branch; this ticket uses the explicitly authorized workflow-install and sync exception only. |

## Ripple effects

- Enabling strict current-base protection makes GitHub require a branch update whenever `main` moves; the update's `synchronize` event creates fresh `verify` and `kanmer-gate` jobs.
- Installing the board workflow makes every board push dispatch `pr.yml`; its existing `regate` job re-runs open-PR gates. The current workflow also schedules its main-ref verify job on dispatch; this ticket records rather than redesigns that behavior.
- Board commits made for this ticket are shared live state and must be pushed before gate evidence is trusted.
- No package, build artifact, application source, API schema or storage format changes.

## Out of scope

- Changing `KANMER_GATE_STRICT` or the merge-gate source contract.
- Editing `pr.yml` or `board-regate.yml` source bytes.
- A merge queue, GitHub App, service, scheduler or provider framework.
- Resolving PR #304's SKILL-038 review findings; those stay in its one Phase-3 remediation.
- Adding CORE-135 to HZN-008 or changing any group membership.
- Any Infisical or secret-rotation work.
