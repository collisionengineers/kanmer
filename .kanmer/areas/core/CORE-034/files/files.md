# Files — CORE-034

## Add

| Path | Required change |
|---|---|
| `packages/core/src/worktree-guard.ts` | Pure path-normalization/comparison helper. Reject a supplied ticket worktree when it resolves to the actual board root or canonical `<repo>/.worktrees/kanmer`; handle relative/absolute, mixed separators, trailing separators, Windows case-insensitivity; no Git or filesystem mutation. |

## Modify

| Path | Required change |
|---|---|
| `packages/core/src/index.ts` | Export the new guard/helper through the public core entry point. |
| `packages/core/src/store.ts` | Invoke the guard at the start of `takeTicket` when `input.worktree` is present, before gate evaluation and before any write. Pass `this.paths.projectRoot` and `this.paths.repoRoot`. Taking without a worktree remains unchanged. |
| `packages/core/src/store.test.ts` | Add regression cases for `.worktrees/kanmer`, absolute board root, canonical absolute board path, mixed `/` and `\`, trailing separators, Windows casing, no-worktree success, and `.worktrees/doc-011` success. Assert rejected takes do not mutate the ticket bytes/stage/taken fields. |
| `packages/mcp-server/src/index.ts` | Add the local non-throwing Git branch inspector; compute the `boardWorktree` block in `get_status`; update the existing tool description to document the new informational fields. Cross-reference the GUI helper in a maintenance comment. |
| `packages/mcp-server/src/smoke.mjs` | Assert the complete `boardWorktree` shape, active ticket count, expected-branch env/default behaviour, and non-fatal handling when branch inspection is unavailable. Add a deterministic Git fixture for a healthy expected branch if needed. |
| `apps/gui/src/main/kanmerGit.ts` | Add/export the paired board-worktree inspection helper required for GUI-098, reusing this module’s local Git wrapper. Keep it observational; do not call `ensureBoardWorktree` or repair. Add a comment naming the MCP pair. |
| `apps/gui/src/main/kanmerGit.test.ts` | Unit-test healthy branch, wrong branch, detached/unavailable branch, expected-branch override, and returned path without relying on the existing timing-sensitive integration cases. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated bundled MCP artifact after source changes, from the normal main checkout. Do not hand-edit. |

## Inspect / consider

| Path | Reason |
|---|---|
| `packages/core/src/paths.ts` | Existing `WORKTREES_DIR`, `deriveRepoRoot`, and `resolvePaths` semantics. Reuse; do not add a second repo-root derivation. |
| `packages/core/src/types.ts` | `TakeTicketInput` already makes `worktree` optional; no schema change is required. |
| `packages/mcp-server/src/root.ts` | Confirms `projectRoot` is the board root and `repoRoot` is separate; do not derive them from cwd again. |
| `apps/gui/src/main/index.ts` | Future GUI-098 caller location for the exported inspect helper; avoid wiring the banner in this ticket. |
| `docs/functional/frd/FRD-002-file-store.md` | Core no-Git-subprocess boundary (G2a). |
| `docs/functional/frd/FRD-020-board-git-worktree-sync.md` | Board root/branch operational contract and repair ownership. |
| `MASTERPLAN.md` Appendix A | Exact guard and health semantics, deliberate helper duplication, plugin-build rule. |
| `plugins/kanmer/tool-reference.md` | Inspect only to confirm no new tool row is required. Do not edit. |

## Ripple effects

- GUI-098 consumes the GUI inspect helper and health semantics; this ticket must leave a stable, minimal result rather than implement the banner.
- `get_status` JSON gains a field, so smoke snapshots/consumer assumptions must tolerate it; no existing field is renamed.
- Plugin bytes must match the built MCP server after source changes.
- The guard protects only recorded metadata. It cannot stop raw Git commands from checking out the board worktree; the health block surfaces that separate failure class.

## Do not modify

- Ticket worktree creation/cleanup workflows, dispatch prompts, or `take_ticket` MCP schema.
- Board sync/rename/repair behaviour in `ensureBoardWorktree`.
- `get_status` mutability annotation or any other tool.
- A new shared Git package, dependency, lease, or blocking health gate.
- `plugins/kanmer/tool-reference.md` unless a genuinely new tool is added (it is not).
