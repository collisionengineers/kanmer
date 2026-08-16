## ADJUDICATION VERDICT — 2026-08-16 — your Antigravity conclusion is overturned

The conflict with [[GUI-073]] has been settled by measurement: ten runs on one
throwaway tree, positive controls throughout, corroborated by the probe MCP
server's own process log. **GUI-073 was right. Your observation was real; your
conclusion was wrong.**

**Do NOT ship the drafted clause saying `.agents/skills/` serves opencode and grok
but not Antigravity. It is false.** Ship the opposite, with the caveat below.

### Established

`.agents/skills/` and `.agents/mcp_config.json` are read by `agy` 1.1.13 and are
functionally live — the skill executed, the MCP server spawned, its tool returned.
**The gate is a bound workspace folder.** Bare `agy` binds to
`default-cli-project`, whose record is `"projectResources": {}` — no folder, so
nothing to read `.agents/` from; cwd is irrelevant. `--new-project`,
`--project <id>` with a `folderUri`, and `--add-dir <path>` all bind. The last
persists nothing.

### Why your probe returned NONE — and the trap to write into the ADR

Two independent causes, both worth recording because both will catch the next
person:

1. Your probe was almost certainly not project-bound, which is the gate.
2. **The MCP server never appears as a named top-level tool.** It surfaces as
   `call_mcp_tool` / `list_resources` / `read_resource`. **Grepping a tool list
   for the server's own tool name is a false negative even when the server is
   connected.**

Point 2 belongs in your ADR-0009 amendment as a worked example. Your rule already
says a probe needs a positive control — this case shows a positive control is not
enough on its own, because your control passed while your probe still misread. The
sharper rule: **verify the mechanism you are actually testing, not a proxy for
it.** A tool-list grep is a proxy; calling the tool is the mechanism.

Also worth recording: **workspace trust is not the gate** (probe dir was never
trusted and everything loaded), **a git root does not auto-bind**, and **project
existence does not help** — only the flag does. All three tested explicitly.

### What your amendment should now say about convergence

ADR-0009's claim that one project-scoped write to `.agents/skills/` serves both
opencode and Antigravity **HOLDS**. Correct it only by adding the binding caveat:
for Antigravity the files are read only in a workspace-bound session, and **Kanmer
establishes no binding today** — a grep across `apps/` and `packages/` for
`--project`, `--new-project`, `--add-dir` or any `agy` invocation returns nothing.
So the write is correct and currently inert. [[MCP-015]] owns fixing that;
[[GUI-073]] owns saying it.

Your other findings stand unchanged and are not in dispute.
