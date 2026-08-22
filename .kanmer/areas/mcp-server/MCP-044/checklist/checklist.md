# MCP-044 checklist

## Research and plan

- [x] Confirm finding #3836189723, the full MCP-044 packet, CORE-043 context, FRD-020, FRD-012 and ADR-0016 were read.
- [x] Record the saved GUI `kanmerBranch` as the Connect source and retain the local-vs-hosted boundary.
- [x] Write the bounded plan and keep the no-plugin/installer/GitHub-API/CORE-043 non-goals explicit.

## Provider runtime propagation

- [x] Add a normalized optional board-branch parameter to provider invocation construction with `kanmer-board` default behavior for direct callers.
- [x] Add `KANMER_BOARD_BRANCH` to Electron-as-Node provider environments without removing `ELECTRON_RUN_AS_NODE`.
- [x] Add `KANMER_BOARD_BRANCH` to the project-scoped portable Codex registration while preserving its exact rootless launcher command and args.
- [x] Verify Claude CLI, OpenCode JSON and Antigravity JSON receive the same branch value through the shared `Invocation.env` serialization.
- [x] Thread the current saved GUI setting through the Connect IPC → `connectAgent` → `serverInvocation` seam.
- [x] Preserve Grok native-plugin behavior and all existing provider ownership/unmerge/idempotence rules.

## Managed convention and governing docs

- [x] Update canonical managed instructions to state local registration/export requirements and hosted Actions mirroring separately.
- [x] Regenerate the repository AGENTS.md managed block from the canonical body.
- [x] Synchronize the `kanmer-setup` fenced block byte-for-byte.
- [x] Amend FRD-012 R1e for the project-scoped branch environment while preserving portability and no-root constraints.

## Tests and evidence

- [x] Add default/custom invocation tests and assert no machine-specific command, path, cwd, root or bundle fields are introduced.
- [x] Add provider merge/CLI tests for custom branch environment and idempotent preservation of unrelated configuration.
- [x] Add Connect threading coverage for the configured branch.
- [x] Run focused GUI provider/Connect tests and retain exact count/exit.
- [x] Run all-workspace typecheck and relevant core/server/GUI builds; retain exact exits and failures.
- [x] Run manual, managed-block, plugin-sync and diff/status rails; retain exact exits.
- [x] INCONCLUSIVE — live protection/Actions-variable mutation was not performed; no GitHub-hosted or production provider state was changed.

## Handoff

- [ ] Write post-implementation report with changed files, governing-doc mapping, tests, risks and follow-up.
- [ ] Commit only MCP-044 scope, push the dedicated branch, record exact commit/PR, and move one boundary to Review.
- [ ] Append the result to HZN-007 current/run and read back ticket/docs/gates before stopping.

## Stop condition

Stop in Review for an independent reviewer; do not self-review or merge.
