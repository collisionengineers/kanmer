# GUI-113 post-implementation report

## Outcome

Implemented the two mapped CORE-043 review remediations:

- Saved custom board-branch changes now reconcile only provider-owned, already-present Codex, Claude, and OpenCode project registrations for each matching open project. Provider registration state is checked before writing; absent registrations are no-ops; malformed/indeterminate registrations are surfaced without mutation; unknown providers and unrelated projects remain untouched.
- Grok and Antigravity native plugin connects now receive the saved branch. Connect stages a disposable copy of the selected native plugin descriptor, sets `mcpServers.kanmer.env.KANMER_BOARD_BRANCH` to the normalized branch, installs from that copy, and removes it. The shipped Grok/Claude-compatible and Antigravity descriptors declare the same default environment contract. The source bundle and user project state are not edited by staging.

## Scope and traceability

- Ticket: GUI-113
- Base: CORE-043 cumulative `30ed38aa7052ccf01a34d6859e67ba3e5deee6b5`
- Implementation commit: `8fdecece`
- Pull request: #208 — https://github.com/collisionengineers/kanmer/pull/208
- Files changed: `AGENTS.md`, `apps/gui/src/main/connect.ts`, `apps/gui/src/main/connect.test.ts`, `apps/gui/src/main/index.ts`, `apps/gui/src/main/index.sync.test.ts`, `apps/gui/src/main/providers.ts`, `plugins/kanmer/mcp/claude.mcp.json`, `plugins/kanmer/mcp_config.json`
- Governing refs: FRD-020, FRD-012, ADR-0016
- No post-merge proof is claimed; this ticket stops at Review.

## Deterministic evidence

- PASS — focused GUI connect/index rails: 35/35.
- PASS — full GUI rail: 48 test files, 417 tests.
- PASS — GUI typecheck.
- PASS — all-workspace typecheck (core, mcp-server, ui, gui).
- PASS — `npm run build` (core and mcp-server, including standalone bundle).
- PASS — GUI production build.
- PASS — `npm run test -w @kanmer/core -- --reporter=dot`: 14 files, 283 tests.
- PASS — `npm run test:scripts`: 89/89.
- PASS — `npm run check:manual`: manual current, 22 chapters.
- PASS — `npm run verify:docs`.
- PASS — `npm run verify:agents-block`: 31/31.
- PASS — `npm run verify:skills`: all checks.
- PASS — `git diff --check`.

## Preserved limitations and failures

- INCONCLUSIVE/exit 1 — `npm run plugin:check` from the linked ticket worktree refused because the workspace resolved `@kanmer/core` from the main checkout rather than this ticket checkout. No source claim is based on this rail.
- INCONCLUSIVE/exit 1 — `npm run mcpb:check` built core/server successfully but could not find the installed `@anthropic-ai/mcpb` CLI entry under the linked worktree node_modules. This is an environment/tooling limitation unrelated to GUI-113; no MCP artifact was changed.
- INCONCLUSIVE — hosted branch-protection/Actions-variable retarget and real Grok/Antigravity credential/plugin-host lifecycle evidence were not available and were not fabricated.

## Review handoff

The implementation deliberately stops before merge, verification, closeout, worktree cleanup, and self-review. Independent review should inspect the provider ownership boundaries, the disposable descriptor cleanup, and the production `applyGitPreferences` caller against the two mapped findings.
