# Independent review — MCP-016 / PR #62

## Disclosure and evidence boundary

This is an independent post-hoc review; I was not the MCP-016 implementation author. I read the complete packet (ticket body, `research/research.md`, `files.md`, `plan.md`, `checklist.md`, `open-questions.md`, `post-implementation-report.md`, `proof.md`, and the prior self-review scratch), PR #62's merged diff and discussion (no GitHub review comments), and the governing `FRD-012-connect.md` R2/R6/R7 plus the packet's ADR-0009 method constraint.

PR #62: https://github.com/collisionengineers/kanmer/pull/62  
Merge/implementation commit: `8f4bdc1`. Current checks ran from local `main` at `1962f02`. No stage change, merge action, host-install mutation, or ticket mutation was performed.

## Changes inspected

The five changed paths match the packet:

1. Delete `plugins/kanmer/.mcp.json`, the file Antigravity reads regardless of manifest.
2. Remove `mcpServers` from `.codex-plugin/plugin.json`, while retaining the skills declaration and explanatory comment.
3. Invert `scripts/check-plugin-sync.mjs` to assert both absences, retain the Claude/grok config rails, and assert the surviving skills/config files.
4. Amend FRD-012 R2/R6/R7 and close the MCP-016 open-work entry.
5. Reword README plugin guidance for codex and add Antigravity's skills-only/Connect path.

The diff leaves `mcp/claude.mcp.json`, Connect/provider registration, packaging, release logic, and the manual untouched as planned. Current main confirms: root `.mcp.json` absent; codex manifest has no `mcpServers` and retains `skills: "./skills/"`; Claude manifest retains `mcpServers: "./mcp/claude.mcp.json"` and its skills declaration.

## Comments and dispositions

- **No blocking implementation finding.** The file-level changes, rail inversion, user copy, and FRD-012 matrix agree with the ticket packet and current tree.
- **Existing DOC-009 follow-up confirmed, not reopened.** The packet explicitly files the stale AGENTS repo-map mention of the removed `.mcp.json` and old token form as DOC-009 rather than absorbing an AGENTS change. That is an acknowledged disposition, not a silent omission in this ticket.
- **Host-call limitation:** I did not repeat codex/agy plugin installation in this audit because that changes host/plugin state. The packet's proof records isolated codex and Connect-free agy tool calls with positive controls; current main's manifest assertions and plugin rail were independently rerun. This is an evidence limitation, not a failed check.

## Verification evidence from current main

- `npm run build`: exit 0.
- `node packages/mcp-server/src/smoke.mjs`: 184/184 pass.
- `npm run smoke:protocol`: 42/42 pass.
- `npm run smoke:discovery`: 13/13 pass.
- `npm run test:http -w @kanmer/mcp-server`: 3/3 pass.
- `npm run typecheck -w @kanmer/mcp-server`: exit 0.
- `npm run plugin:check`: pass; 30 tools, matching bundle bytes, 12 skill frontmatters, v0.3.3 manifests, isolated handshake.
- `git diff --check`: exit 0.
- Direct manifest assertions passed: root `.mcp.json` absent; codex `mcpServers` absent; both manifests retain `skills: "./skills/"`; Claude config remains present.
- Working tree remained unchanged apart from pre-existing untracked `skills-lock.json`.

## Verdict

**PASS.** The merged implementation and governing-document outcome are consistent, the plugin rail prevents re-advertising the unsupported codex/Antigravity server paths, and the current shipped bundle is synchronized. The operator's option-2 product decision is treated as the packet's governing decision rather than re-litigated here. No stage change or merge was performed.
