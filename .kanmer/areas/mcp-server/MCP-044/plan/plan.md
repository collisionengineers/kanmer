# MCP-044 plan — propagate the configured board branch to local MCP

## Governing docs

- `docs/functional/frd/FRD-020-board-git-worktree-sync.md` — the board branch is configurable and GUI/MCP inspectors must compare the same convention.
- `docs/functional/frd/FRD-012-connect.md` — provider-owned registration shapes; R1e is amended only to add the project branch environment value while preserving the portable Codex command.
- `docs/architecture/adr/ADR-0016-compiled-workflow.md` — local readiness and hosted protection remain separate; no GitHub API/App or protected-ref mutation is introduced.

## Outcome

When the GUI's configured board branch is custom, every project-scoped MCP registration created by Connect carries `KANMER_BOARD_BRANCH=<configured branch>`. The local server's existing `get_status` expected-branch check then agrees with the GUI and managed instructions. Codex remains machine-portable: its command, args, cwd behavior and root discovery are unchanged; only a project configuration environment entry is added.

## Ordered implementation steps

1. Extend the pure provider invocation seam with an optional normalized board-branch argument, defaulting to `kanmer-board` for existing direct callers, and add the environment value alongside the Electron-as-Node flag where required.
2. Thread the saved `readSettings().kanmerBranch` through the GUI Connect IPC handler into `connectAgent`/`serverInvocation`; do not use a stale observed branch after a refused rename as the configured expectation.
3. Preserve provider ownership and idempotence: Codex TOML, Claude CLI, OpenCode JSON and Antigravity JSON must each serialize only their owned Kanmer registration and retain unrelated entries; Grok's native plugin path remains unchanged and manually/plugin-launched runtimes are documented to export the variable.
4. Update the canonical `scripts/agents-block-body.mjs` prose to distinguish local registration/export from the hosted Actions mirror; regenerate this repo's AGENTS block and update the setup skill's fenced copy byte-for-byte.
5. Amend FRD-012 R1e to document the project-scoped environment exception without reintroducing machine-specific paths or a root pin. Keep FRD-020/ADR-0016 semantics and the installer launcher unchanged.
6. Add focused tests for default/custom invocation, all provider environment serialization, idempotent re-merge, Connect threading, and the unchanged portable command/rootless contract.
7. Run focused GUI tests, all-workspace typecheck, relevant build/manual/managed-block/plugin/diff rails, preserve every exit code, write the post-implementation report, record commit/PR traceability, and stop at Review for independent review.

## Proof approach

The report will bind the exact branch/commit and list the focused provider/Connect test counts, typecheck/build/manual/managed-block/plugin rails, and any base failures. Review must inspect that the custom branch appears in each project registration while no absolute path, `--root`, `--repo-root`, cwd, installer or unrelated provider state is introduced. Live GitHub protection/Actions-variable mutation remains INCONCLUSIVE external evidence.

## Risks and mitigations

- Existing host processes do not reread registration environment until restarted; reconnect refreshes config and the report documents the restart boundary.
- A failed/invalid configured branch must not be silently invented; the existing settings/ensure-worktree validation remains authoritative and invocation normalization uses the documented default only for omitted test/direct callers.
- Codex's old R1e wording could make the new env look like a machine path; the FRD amendment explicitly calls it a project-scoped convention and keeps the fixed launcher bytes unchanged.

## Non-goals

No branch rename/reconciliation logic, GitHub API/App, workflow gate changes, installer/shim edits, MCP tool changes, plugin manifest edits, dependency changes, provider ownership changes, or CORE-043 source changes.

## Stop condition

Open the bounded PR, move MCP-044 to Review after the report gate passes, and stop for an independent reviewer. Do not self-review, merge, verify, or clean up.
