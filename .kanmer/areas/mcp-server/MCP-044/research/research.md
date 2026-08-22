# MCP-044 research — local board-branch convention propagation

## Question

How can a custom protected board branch reach every local MCP process and provider registration after the GUI handoff, while preserving the portable Codex launcher contract and without treating a GitHub Actions variable as local process state?

## Findings

1. **The configured source is already the GUI Git preference.** `apps/gui/src/main/settings.ts` stores `AppSettings.kanmerBranch` (default `kanmer-board`), and `openProject` passes that value to `ensureBoardWorktree`. The project context retains the resulting branch, but the `connectAgent` IPC handler currently passes only sourceRoot and boardRoot. Source: `apps/gui/src/main/index.ts`, `settings.ts`.

2. **The provider registry already owns environment serialization.** `Invocation.env` is written to Claude CLI `-e` flags, Codex TOML `env`, OpenCode `environment`, and Antigravity `env`. The two production invocations do not carry the convention: `codexPortableInvocation()` returns `{}`, while `installedElectronInvocation()` only sets `ELECTRON_RUN_AS_NODE`. Source: `apps/gui/src/main/providers.ts`, `connect.ts`, and provider tests.

3. **MCP already consumes the right override, but local callers omit it.** `packages/mcp-server/src/index.ts` reads `process.env.KANMER_BOARD_BRANCH?.trim() || "kanmer-board"` for `get_status.boardWorktree.expectedBranch`; the smoke rail also honors it. A custom board therefore reports the stale default whenever a local provider process lacks this environment entry. Source: MCP-043 finding #3836189723 and `packages/mcp-server/src/index.ts`.

4. **The portable Codex command can remain rootless and machine-portable.** The command remains `cmd.exe /d /s /c "%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd"`; the project-scoped TOML entry can carry the project convention as `env.KANMER_BOARD_BRANCH`. This is repository/project configuration, not a machine path, and reconnect refreshes it. The installer launcher itself remains unchanged and continues inheriting the provider environment. Source: FRD-012 R1e/R1d, ADR-0012 and `apps/gui/build/kanmer-mcp.cmd`.

5. **The canonical managed instructions are generated from one body.** `scripts/agents-block-body.mjs` feeds `scripts/agents-block.mjs` and the GUI's `agentsBlock.ts`; `AGENTS.md` and the fenced block in `plugins/kanmer/skills/kanmer-setup/SKILL.md` are checked against it. The current prose says the convention is a repository variable, which is true for hosted workflow input but does not tell local MCP/plugin runtimes how to receive it. Source: `scripts/verify-agents-block.mjs`, `scripts/agents-block-body.mjs`, managed block and finding #3836189723.

6. **The bounded fix belongs at Connect's registration seam.** Add an optional board-branch argument with the default for direct/test callers, pass the current configured setting from the GUI IPC handler, serialize `KANMER_BOARD_BRANCH` into each project-scoped Connect registration, and explicitly document that manually/plugin-launched local runtimes must export the same variable while Actions mirrors it only for hosted gates. No MCP root discovery, Git mutation, provider ownership, plugin descriptor, or GitHub API change is needed.

## Implications

- Existing users receive the new value when they reconnect; Connect's existing idempotent merge replaces only Kanmer's owned registration. No unrelated provider file is rewritten by this ticket.
- The Codex portability claim changes only by adding a project convention environment entry; no absolute path, root pin, cwd, `--root`, `--repo-root`, username, drive, install directory or bundle path is serialized.
- Tests must assert all four environment serialization surfaces and that branch values are preserved through reconnect/idempotent merges. Managed-block verification must remain byte-exact.
- Live GitHub protection and repository-variable mutation remain external administrator-owned evidence under ADR-0016; this ticket proves local propagation, not hosted protection state.
