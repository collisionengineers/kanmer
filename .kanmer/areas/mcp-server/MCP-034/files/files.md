# Files — MCP-034

## Where the change lands

| Path | Why |
|---|---|
| `packages/mcp-server/src/project-identity.ts` | Make Windows-looking absolute identity vectors resolve with `path.win32` on every host while preserving native POSIX/Windows resolution and the exact MCP-022 hash payload. |
| `packages/mcp-server/src/errors.ts` | Add the narrowly scoped core single-boundary `leaving … requires …` classifier to the existing three-code builder; preserve all legacy text and leave unrelated errors uncoded. |
| `packages/mcp-server/src/smoke.mjs` | Keep the Windows vector platform-independent and assert that the existing Backlog→Preparing gate refusal carries `structuredContent.error.code = GATE_BLOCKED` while retaining its text. |
| `AGENTS.md` | Add user-owned operating guidance for optional top-level `expected_project`/compatibility sniffing and the `readOnlyHint: false` annotation dependency of the central write guard. Do not edit the managed marker block. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated standalone artifact required because MCP server source changes ship through the committed plugin bundle. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/mcp-server/src/project-identity.ts` | Existing canonicalization and exact payload/key-order contract; only host selection is defective. |
| `packages/mcp-server/src/errors.ts` | Existing exact code union and compatibility text builder; the new classifier must remain narrow. |
| `packages/mcp-server/src/index.ts` | Central registration wrapper and write guard; every mutating tool depends on `readOnlyHint: false` and top-level metadata stripping. |
| `packages/mcp-server/src/smoke.mjs` | Cross-platform identity vectors, write-schema inventory, and current entering/collapsed/leave gate smoke coverage. |
| `packages/mcp-server/src/smoke-protocol.mjs` | Raw JSON-RPC schema and structured-error evidence; no tool count or protocol shape change is expected. |
| `packages/core/src/store.ts` | Authoritative gate refusal wording (`leaving`, `entering`, collapsed-pipeline); do not change core text. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | Existing expected-project compatibility documentation; this ticket adds no new tool/reference semantics. |
| `scripts/agents-block-body.mjs`, `scripts/agents-block.mjs`, `scripts/verify-agents-block.mjs` | Managed AGENTS block source, writer, and byte-level verification; user-owned guidance must stay outside markers. |
| `docs/architecture/adr/ADR-0016-compiled-workflow.md` | Governs compiled workflow and structured error behavior. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | Governs MCP project safety and structured error acceptance. |
| MCP-022 `post-implementation-report`, `proof`, and `scratch/independent-review` | Merged implementation baseline, evidence, and the exact three findings this remediation closes. |

## Ripple effects

- Rebuild `dist` and the committed standalone plugin bundle after source changes; tool count and tool-reference rows remain unchanged.
- `smoke.mjs` output gains stronger assertions only; protocol/discovery surfaces should remain stable.
- `AGENTS.md` verification must still confirm the managed block is byte-identical; its user-owned prose changes are intentionally outside that check.
- Existing MCP-022 behavior for missing/correct project tokens, revision conflicts, collapsed gate refusals, and unrelated validation errors must remain unchanged.

## Out of scope

- Any change to project-token generation, payload fields, compatibility rollout, mandatory enforcement, or error-code vocabulary.
- Any change to `@kanmer/core` gate semantics or message wording.
- New MCP tools, dependencies, tool-reference rows, protocol revisions, or remote-access behavior.
- Editing `scripts/agents-block-body.mjs`, the fenced managed block in `kanmer-setup/SKILL.md`, or generated AGENTS markers.
- MCP-023 or any unrelated review finding; MCP-033's plugin artifact issue is already closed.
