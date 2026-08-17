# Plan — SKILL-019: Stop Codex loading duplicate repo-local and plugin Kanmer skills

## Approach

Use plugins for reusable Kanmer workflow skills on hosts that support plugins, and keep board MCP registration project-scoped. Codex remains on its installed plugin. Antigravity switches from copied .agents/skills to the already-supported skills-only Kanmer plugin, installed with AGY’s plugin mechanism; its project .agents/mcp_config.json remains the board connection. OpenCode moves to its native .opencode/skills directory, and Grok/Claude remain unchanged. Reconcile legacy generated .agents/skills only after the AGY plugin is demonstrably active, preserving user-authored skills. This removes the duplicate at its source without per-project Codex suppression or abandoning either host’s supported extension model.

## Governing docs

- **FRD-012 Connect — Modifies, pending explicit authorization.** Change Antigravity’s skill install to a global skills-only plugin while retaining project MCP registration; move OpenCode to .opencode/skills; state plugin skills and project MCP have intentionally different scopes.
- **FRD-023 Agent skills system — Modifies, pending explicit authorization.** Preserve roster and rail; update the host distribution matrix and one-visible-copy invariant.
- **ADR-0009 — Modifies or supersedes, pending explicit authorization.** Preserve the contract hierarchy/evidence method while correcting the conclusion that AGY’s global plugin scope is unsuitable for reusable skills.

Implementation and governing-doc edits do not begin without authorization.

## Steps

1. Prove against installed AGY that agy plugin install of the shipped Kanmer plugin processes all current skills, exposes them in a fresh session, remains namespaced, and does not advertise or launch the removed incompatible MCP server. Record command/output and invoke a skill.
2. Verify AGY plugin install/reinstall/list/disable/uninstall behavior and exit codes so Connect can be idempotent and report exact copy-paste fallback commands. Verify project .agents/mcp_config.json still supplies the Kanmer board independently.
3. Verify OpenCode loads the same roster from .opencode/skills and Codex continues loading only the plugin-qualified roster when no generated .agents/skills exists.
4. With explicit authorization, update FRD-012, FRD-023, and ADR-0009 or create/link a superseding ADR.
5. Change the provider registry so Antigravity uses its plugin installer for skills plus its existing project config registration for MCP; move OpenCode to .opencode/skills; leave Codex, Claude, and Grok on their intended routes.
6. Extend Connect to run/report the AGY plugin install independently of MCP registration. A failed plugin install fails Connect visibly with the exact fallback. Reconnect is idempotent. Project disconnect removes MCP registration but does not silently uninstall the global skills plugin.
7. Add safe legacy reconciliation: after confirming the AGY plugin is active, remove only Kanmer-owned stamped folders from project .agents/skills, preserve user-authored siblings, and migrate OpenCode’s copy to .opencode/skills. Never delete based on kanmer-* globs.
8. Update staleness detection, update messaging, gitignore, packaging and plugin-sync checks, provider/connect/core tests, and supporting prose. Assert that no current Connect path generates project .agents/skills and that the Kanmer plugin remains skills-only for AGY/Codex.
9. Run focused/full automated rails and fresh-session behavioral checks for Codex plugin, AGY plugin plus project MCP, OpenCode native skills, legacy cleanup, and disconnect behavior.

## Verification

Capture AGY plugin install/list/reinstall/disable/uninstall output, a fresh-session Kanmer skill invocation, and a real MCP tool call from project .agents/mcp_config.json proving the two channels work independently. Prove Codex exposes only plugin-qualified Kanmer skills after legacy cleanup and OpenCode invokes a skill from .opencode. Run focused providers/connect/staleness tests, npm test, npm run typecheck, npm run verify:skills, npm run verify:agents-block, and the required build plus npm run plugin:check from the main checkout. Test user-authored .agents content survives byte-for-byte.

## Risks / open questions

- AGY plugin filesystem/schema behavior must be proven against the installed binary; documentation and prior FRD evidence are strong but not a substitute for the implementation-time positive control.
- A global plugin can serve several projects. Project disconnect must not uninstall it automatically; global removal remains explicit.
- AGY’s plugin parser must continue ignoring the Claude-only MCP config. A regression rail must prevent the removed root .mcp.json or Codex mcpServers declaration from returning.
- Legacy cleanup is destructive only for stamped Kanmer-owned content and only after the replacement plugin works.
- Governing-doc edits remain authorization-gated.
