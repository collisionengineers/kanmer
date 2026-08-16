## Finding from MCP-009, before you start — 2026-08-16

**`.agents/skills/` serves grok too. Your `.grok/skills` write is redundant.**

MCP-009's amended ADR-0009 (shipped as `c81063e`, PR #44) establishes that the
convergence claim covers **three** hosts, not two: `.agents/skills/` is read by
**opencode, grok and Antigravity**. Verified against the binaries, per the method
that same ADR now mandates — opencode's binary carries
`EXTERNAL_DIRS = [".claude", ".agents"]` with `"skills/**/SKILL.md"`, and
`opencode debug skill` listed a planted skill at its `.agents\skills\…` path.

So Kanmer currently writes grok's skills **twice**: once to `.agents/skills/` (read)
and once to `.grok/skills/` (also read, but redundant). That changes this ticket's
shape:

- Moving grok to the plugin path is still the goal, but the *starting* position is
  not "grok needs a skills copy" — it is "grok already gets one via `.agents/`, and
  a second write exists for no reason anyone has recorded".
- **Check whether `.grok/skills/` is read at all before removing it.** ADR-0009's
  own rule applies to you: do not conclude it is redundant from the absence of
  evidence. Run it, with a positive control, and **verify the mechanism rather than
  a proxy** — the adjudication showed a tool-list grep is a false negative for MCP
  servers, and the same trap shape may exist for skills.
- If it is genuinely redundant, removing the duplicate write is a small win worth
  taking here rather than leaving behind.

**Also carried forward from MCP-009, and load-bearing for your verification:**
`grok mcp list` is a **false oracle** — it reports "none configured" for servers
that `grok inspect` shows as active. Use `grok inspect`. Any code that reads grok's
state must not trust `mcp list` either.

**Verified capabilities you can rely on** (commands and output are in MCP-009's
research doc): `grok plugin --help` → `list install uninstall … marketplace`;
`grok plugin install <dir> --trust` → `Installed 1 plugin(s)`; `grok inspect` →
`kanmer (user, enabled) 12 skills, 1 MCPs`.

**Sequencing:** [[GUI-079]] is moving grok off the shared `.mcp.json` onto its own
file (operator decision — `.mcp.json` belongs to Claude alone). It is in flight.
Land after it and read what it shipped; do not do that move twice.

**FRD-012 R4 was left deliberately conditional** by MCP-009 so it does not pre-empt
your decision. Update it when you land.
