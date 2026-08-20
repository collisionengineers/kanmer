# Independent review — MCP-018 / PR #83

## Changes reviewed

- Replaced the linked-worktree proxy with ownership validation of the resolved `@kanmer/core` dependency.
- Added copied-plugin isolation using manifest-selected MCP entry, sanitized environment, unrelated cwd, JSON-RPC initialization and tool discovery.
- Added four regression cases and retained fresh-vs-committed bundle byte comparison.

## Checks

- PASS — complete ticket docs, resolved questions, plan/files/report, and PR diff were read.
- PASS — `node --test scripts/plugin-isolation.test.mjs`: 4/4.
- PASS — `npm run plugin:check` from the prepared worktree: bundle bytes match; isolated handshake lists 30 tools.
- PASS — the ownership guard checks the resolved real path with a directory boundary, so it accepts a self-contained linked worktree but rejects borrowed core resolution.
- PASS — isolated copy runs outside the repository from a path containing spaces; child cwd and environment avoid workspace-resolution assistance.
- PASS — scoped diff check and clean worktree.
- NOTE (non-blocking): current main has no `npm run verify` until CORE-031 merges; root typecheck’s UI `documentPaths` fixture error is unrelated. Windows CI remains the normal PR-hosted check.

## Disposition

No blocking findings. The artifact byte comparison and runtime-isolation proof cover distinct failure modes and are both retained.

## Verdict

PASS — merge PR #83 and move MCP-018 to Verifying.
