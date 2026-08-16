# MCP-009 — Open questions

**All questions are resolved or parked as of 2026-08-16.** Q1 and Q2 were
settled by the adjudication recorded in `scratch/adjudication.md`; Q3, Q4 and Q5
by the operator in `scratch/operator-answers.md`; Q6–Q9 are real questions that
belong to other tickets and are parked with their owners named.

## Resolved

- [x] **Q1. Antigravity and `.agents/skills/`: whose evidence wins?**
      **ANSWERED by adjudication — GUI-073's evidence wins; my conclusion was
      overturned.** Ten runs on one throwaway tree, positive controls throughout,
      corroborated by the probe MCP server's own process log. `.agents/skills/`
      and `.agents/mcp_config.json` **are** read by `agy` 1.1.13 and are
      functionally live: the skill executed, the MCP server spawned, its tool
      returned a value. The gate is a **bound workspace folder** — bare `agy`
      binds to `default-cli-project` whose record is `"projectResources": {}`, so
      there is no folder to read `.agents/` from and cwd is irrelevant.
      `--new-project`, `--project <id>` with a `folderUri`, and `--add-dir <path>`
      all bind; the last persists nothing. Explicitly tested and ruled out as
      gates: **workspace trust** (the probe dir was never trusted and everything
      loaded), a **git root** (does not auto-bind), and **project existence**
      (only the flag on the command line binds).
      My probe returned NONE for two independent reasons. It was almost certainly
      not project-bound, and — the more general trap — **a workspace MCP server
      never surfaces as a named top-level tool**; it appears as the generic
      `call_mcp_tool` / `list_resources` / `read_resource` triad, so grepping a
      tool list for the server's own tool name is a false negative even when the
      server is connected. My positive control passed while the probe still
      misread, which is why the amended ADR clause carries the sharper rule:
      **verify the mechanism you are actually testing, not a proxy for it.**
      Consequence for this ticket: ADR-0009's convergence claim **holds** and is
      shipped intact, gaining a third host (grok) and the binding caveat.

- [x] **Q2. May I contradict [[GUI-073]]'s stated premise?**
      **Moot — there is nothing to contradict.** GUI-073's third verification item
      ("Connecting Antigravity still writes `.agents/mcp_config.json` **and**
      `.agents/skills`") is correct: those files are read. The only refinement is
      that they are read solely in a workspace-bound session and Kanmer
      establishes no binding today (a grep across `apps/` and `packages/` for
      `--project`, `--new-project`, `--add-dir` or any `agy` invocation returns
      nothing), so the write is correct and currently inert. **[[MCP-015]] owns
      fixing that; [[GUI-073]] owns saying it.** GUI-073 was not edited by this
      ticket.

- [x] **Q3. Do you accept the split, or should MCP-009 land as one ticket?**
      **ANSWERED: split accepted. MCP-009 keeps the docs only** — the ADR-0009
      amendment, the FRD-012 corrections including the install matrix, and
      FRD-012 R5. Everything else is filed: **[[MCP-013]]** (marketplace root +
      packaging + the swallowed non-zero exit at `connect.ts:152` + the two
      marketplace names + the two `${…}_ROOT` variables), **[[MCP-014]]** (grok →
      plugin), **[[MCP-015]]** (Antigravity → plugin + dispatch), and the
      `.mcp.json` collision owned by **[[GUI-079]]**.

- [x] **Q4. Should the Kanmer plugin install at user scope or project scope?**
      **Routed to [[MCP-013]], which owns the install command.** The finding is
      recorded in `research` §Finding 9: `claude plugin install` defaults to
      `--scope user`, so Kanmer's 12 skills load into every project on the
      machine while everything else Kanmer writes is project-scoped per ADR-0007,
      and nobody appears to have chosen this. Not decided here.

- [x] **Q5. Is the shared `.mcp.json` between Claude Code and grok intended?**
      **ANSWERED: no.** grok moves to its own file; `.mcp.json` belongs to Claude
      alone. **[[GUI-079]]** owns and is implementing it. Recorded, not fixed
      here.

## Parked (explicitly deferred — owned elsewhere)

- **Q6. Where does the packaged marketplace root live?** Belongs to
  **[[MCP-013]]**, which owns `extraResources` and `pluginRoot()`. It must be
  verified against a real packaged build, not dev mode, because `pluginRoot()`
  takes a different branch when `!app.isPackaged`. Deferred because this ticket
  ships no code and cannot produce that evidence.
- **Q7. Does `${PLUGIN_ROOT}` / `${CLAUDE_PLUGIN_ROOT}` actually expand?**
  Answer differs per host (`claude` resolved it; `codex mcp list` and
  Antigravity's generated `mcp_config.json` both hold the token unexpanded).
  Belongs to **[[MCP-011]]** / **[[MCP-013]]** (the two `${…}_ROOT` variables are
  explicitly MCP-013's). Deferred, evidence recorded in `research` §Finding 6
  and §Finding 8.
- **Q8. Does keeping BOTH delivery paths double-load skills?** Observed once —
  with grok's plugin installed *and* a `.claude/skills/` tree present,
  `grok inspect` listed each skill twice. Belongs to **[[MCP-014]]**, which
  decides grok's delivery path. Deferred.
- **Q9. Do marketplace hosts prune a retired skill on update?** **[[GUI-080]]**
  asks it and owns it. Partial evidence recorded here: codex installs into a
  version-keyed cache directory, which implies pruning by fresh directory — but
  the frozen `0.1.0` ([[MCP-011]]) means a real bundle change would overwrite in
  place, so it was **not** proven. Deferred.
- The Antigravity **IDE** (as distinct from the `agy` CLI) — not installed on
  this machine, deliberately not investigated. *Parked, not unchecked*: the CLI,
  which is what Connect shells out to, was fully checked, and the adjudication
  re-checked it.
- Publishing to any public marketplace directory — already out of scope per
  `docs/plans/implementation-audit.md:103`.
- `grok plugin details <id>` rejects the id that `grok plugin list` prints. An
  upstream grok quirk, no impact on Kanmer.
- Whether `claude plugin install` needs `-y` under Connect's non-TTY
  `execAsync`. Belongs to **[[MCP-013]]** with the install command.
