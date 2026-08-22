# Files — CORE-058

## Implementation surfaces

| File | Role / risk |
|---|---|
| `apps/gui/src/main/kanmerGit.ts` | Canonical board-worktree creation and reconciliation. Add one shared board-ignore entry set and ensure it is reconciled for new, existing, attached, and branch-mismatch board worktrees before sync can stage `.kanmer`. |
| `apps/gui/src/main/kanmerGit.test.ts` | Real-Git regressions for new board worktrees, existing missing-rule worktrees, and idempotent reconciliation. Keep assertions about refs/worktree path and no unrelated branch behavior. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Generated standalone plugin artifact. Replace only with output produced from a normal, non-linked checkout of this exact source branch; never hand-edit minified output. |

## Context files

| File | Why it matters |
|---|---|
| `apps/gui/src/main/index.ts` | Calls `ensureBoardWorktree` and `syncBoard`; confirms the helper is production-reachable. |
| `apps/gui/src/main/kanmerGit.ts` | Existing activity/temp ignore contract, branch/worktree semantics, and staging boundary. |
| `scripts/build-plugin.mjs` | Defines artifact copy/provenance path. |
| `scripts/check-plugin-sync.mjs` and `scripts/lib/plugin-checkout-guard.mjs` | Normal-checkout ownership guard and byte-level parity contract; linked worktrees must not claim plugin check. |
| `packages/mcp-server/tsup.standalone.config.ts` / `version-define.mjs` | Deterministic standalone build contract; only release version is an allowed build input. |
| `docs/functional/frd/FRD-027-project-declared-sources.md` / `docs/architecture/adr/ADR-0020-project-declared-source-trust.md` | Governing source-cache and fail-closed boundaries; this ticket is hygiene, not a new authority path. |
| `CORE-044` plan/report/review | Parent acceptance inventory and exact cumulative base/head; current artifact and board-cache findings are the only scope here. |

## Ripple effects

- `ensureBoardWorktree` callers gain idempotent board `.gitignore` reconciliation; `syncBoard` behavior remains unchanged and stages only ignored-safe board state.
- The GUI Git integration test runs real Git and may be slower on Windows; its existing bounded timeout must remain.
- The generated plugin bundle must match a fresh normal-checkout standalone build; no runtime source change is expected from artifact regeneration.

## Out of scope

Source fetching/DNS/cache transaction behavior (CORE-044/056/057), branch rename semantics (CORE-052/054), GUI ticket/provider work, MCP tool schema changes, and live packaged/host-provider evidence.
