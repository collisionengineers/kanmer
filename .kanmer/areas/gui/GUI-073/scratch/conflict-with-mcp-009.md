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

## ADJUDICATION VERDICT — 2026-08-16 — settled by measurement

**GUI-073's finding survives. MCP-009's was a real observation with the wrong
conclusion.** Ten runs on one throwaway tree, positive controls in every run,
corroborated by the probe MCP server's own log (written by the server process,
not by a model).

### What is now established fact

`.agents/skills/` and `.agents/mcp_config.json` at the workspace root **ARE** read
by `agy` 1.1.13 — not merely listed, but functionally live: the skill body
executed and the MCP server was genuinely spawned and its tool returned a value.

**The gate is a bound workspace folder**, and nothing else:

- bare `agy` binds to `default-cli-project`, whose record is literally
  `"projectResources": {}` — **no folder at all**, so there is no workspace root
  to read `.agents/` from. cwd is irrelevant.
- `--new-project` works. `--project <id>` works where the record carries a
  `folderUri`. And **`--add-dir <path>` works and persists nothing** — a finding
  neither prior agent reported, and the cheapest binding available.

### Four things BOTH prior agents got wrong or never tested

1. **Workspace trust is not the gate.** The probe dir was never in
   `trustedWorkspaces` and everything loaded anyway.
2. **A git repository root does not auto-bind.** Tested explicitly: `git init` +
   commit, `git rev-parse --show-toplevel` = the probe dir, bare `agy` → nothing.
3. **Project *existence* does not help.** Bare `agy` in the same folder *after*
   the project record existed returned byte-identical output to the first bare
   run. The flag is what binds, not the record.
4. **The MCP server never surfaces as a named top-level tool.** It appears as
   `call_mcp_tool` / `list_resources` / `read_resource`. **A probe that greps a
   tool list for the server's own tool name reads as a false negative even when
   the server is connected.** This is very likely what produced MCP-009's
   negative result, and it will produce the same false negative for anyone else.

### The consequence — larger than this ticket described

**A user who clicks Connect for Antigravity and then runs `agy` normally gets
neither the skills nor the MCP server.**

The files Kanmer writes are **correct** — the probe proves `.agents/skills/` and
`.agents/mcp_config.json` are exactly the right paths. But nothing in Kanmer ever
establishes a binding: `providers.ts:373-388` sets `dispatch: false` with no
`dispatchCli`/`dispatchArgs`, so `dispatchTicket` throws before reaching the spawn
at `dispatch.ts:115`, and a grep across `apps/` and `packages/` for `--project`,
`--new-project`, `--add-dir` or any `agy` invocation returns **nothing**.

So GUI-073's third verification item ("still writes `.agents/skills`") **PASSES** —
that was never the defect. The defect is that correct files are written into a
session shape that never reads them.

### Scope split

- **GUI-073 (this ticket)** corrects what is *said*: the register-only label, the
  stale `dispatch: false`, `Settings.tsx:405-416`'s blurb and badge, and FRD-012's
  install matrix. It must **record the binding requirement** as the reason the
  current install is inert, and name [[MCP-015]] as the ticket that fixes it.
  Do not attempt the binding here.
- **[[MCP-015]]** implements the plugin path and the binding, and decides how
  Connect or dispatch supplies it (`--add-dir` is the cheapest candidate — no
  persisted state).
- **[[MCP-009]]** may now write its ADR-0009 sentence: the convergence claim
  **HOLDS** — one project-scoped write to `.agents/skills/` does serve both
  opencode and Antigravity. It must NOT ship the drafted text saying Antigravity
  is excluded. Add the binding caveat instead.

### Untested, named rather than assumed

Whether the Antigravity **IDE** (`~/.gemini/antigravity/`, a separate tree from
`~/.gemini/antigravity-cli/`) picks up the same files when it opens the folder as
a project. Do not assume it behaves like the CLI in either direction.
