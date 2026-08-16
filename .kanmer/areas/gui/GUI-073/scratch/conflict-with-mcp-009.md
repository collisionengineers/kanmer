## CONFLICT WITH MCP-009 — must be settled before either ticket plans

**Two research agents ran the same tool and reached opposite conclusions about
whether Antigravity reads `.agents/skills/`.** Neither is being taken at face
value. This note records the disagreement precisely so it is settled by evidence.

**GUI-073's finding:** `.agents/mcp_config.json` and `.agents/skills/` ARE read —
but only in a **project-bound** session. Bare `agy -p` in the workspace gave
`TOOL:NO, SKILL:NO`; `agy --new-project -p …` surfaced skills from
`.agents/skills/`, `.agent/skills/` and a workspace plugin, and the MCP tool
appeared. The cache path `~/.gemini/antigravity-cli/mcp/zorblatt/` named the
server from the **workspace-root `.agents/mcp_config.json`**, not the plugin's.
`--project <id>` → `TOOL=yes SKILL=yes`; bare, same folder → `TOOL=no SKILL=no`.

**MCP-009's finding:** probes at `.agents/skills/`, `.agent/skills/`,
`.claude/skills/`, `.opencode/skills/` all returned `NONE`, and only
`agy plugin install <dir>` made the 12 skills appear. It concluded Kanmer's
`.agents/skills` write for Antigravity is **inert** and that FRD-012 AC2 cannot
pass — and drafted an ADR-0009 amendment saying `.agents/skills/` serves
opencode and grok but **not** Antigravity.

**Why this matters and cannot be split the difference:** MCP-009 proposes to
write that conclusion into ADR-0009, the document with the most authority in this
area — the same document MCP-009 exists to correct for having recorded a wrong
lesson. Writing a second wrong lesson into it would be worse than the first,
because it would arrive carrying an evidence table.

**The likely reconciliation, stated as a hypothesis and NOT as a finding:**
MCP-009's probe was probably not project-bound, which is exactly the condition
GUI-073 identified as the gate. If so, both observations are real and GUI-073's
is the more complete explanation — MCP-009 measured the true negative that
GUI-073 also measured, and stopped one step earlier.

**This must be tested, not reasoned about.** An adjudication agent has been
dispatched to run both procedures back to back on the same tree, with a positive
control, and record the exact commands and output. Whichever way it lands:

- If project binding is the gate, ADR-0009's convergence claim SURVIVES with a
  binding caveat, and the real defect is that Kanmer's Connect flow never
  establishes a project binding — which is a different and larger ticket than
  either GUI-073 or MCP-009 currently describes.
- If `.agents/skills/` is genuinely inert for `agy` under all conditions,
  GUI-073's third verification item cannot pass and must be rewritten, and
  MCP-009's amendment is correct as drafted.

**Neither ticket plans until this returns.** MCP-009's Q2 asked whether it could
contradict GUI-073's premise; the answer is that neither ticket gets to overwrite
the other's finding — the tool decides.

**MCP-009's other findings are NOT in dispute and stand:** `agy plugin install`
works and processes 12 skills and 1 MCP server; `agy -p` piped correctly on
1.1.13, so `dispatch: false` is refuted (both agents agree here, independently);
grok has a full plugin system; Claude's shipped marketplace command fails because
`pluginRoot()` points at `plugins/kanmer` while the manifest is at the repo root.
