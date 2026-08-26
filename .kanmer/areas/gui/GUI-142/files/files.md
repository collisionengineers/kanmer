# Files

| Path | Change | Risk / caller impact |
| --- | --- | --- |
| apps/gui/src/main/providers.ts | Replace the Codex portable cmd.exe descriptor with the tested PowerShell descriptor. | This is the single source of generated provider invocation and probe invocation. |
| apps/gui/src/main/providers.test.ts | Update portable descriptor and configuration-merge expectations. | Prevent a regression to the malformed cmd quoting. |
| apps/gui/src/main/connect.test.ts | Update Connect selection/probe expectations and add normal argument-serialization execution coverage. | Ensures GUI Connect writes a live registration, not merely an equal object. |
| packages/core/src/staleness.ts | Recognize the portable PowerShell descriptor as the supported current registration. | Avoids false stale status after Connect. |
| packages/core/src/staleness.test.ts | Cover supported descriptor and legacy cmd descriptor treatment. | Detects drift accurately. |
| examples/codex-config.toml | Publish the supported manual registration. | Copy/paste users receive the correct command. |
| README.md | Document the changed Codex registration convention. | User-facing setup stays accurate. |
| AGENTS.md | Update the documented provider command convention. | Required because the project command convention changes. |

## Context files

| Path | Why read it |
| --- | --- |
| apps/gui/src/main/connect.ts | Owns registration merge/reconnect and probe process invocation. |
| apps/gui/src/main/providers.ts | Defines all provider descriptors and TOML merge semantics. |
| packages/core/src/staleness.ts | Defines what project registrations are considered stale. |
| docs/functional/frd/FRD-012-connect.md | Governing Connect requirements and acceptance expectations. |

## Out of scope

- OAuth, HTTP remote access, Cloudflare Access, and tunnel runtime behavior belong to [[MCP-052]].
- Global Codex configuration other than the temporary local bootstrap is not changed by the product fix.
