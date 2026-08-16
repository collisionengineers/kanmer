# Research — GUI-073: what Antigravity actually supports

*Method per [[MCP-009]]: no capability is concluded from absence of evidence, and
the installed CLI is ground truth. Every claim below carries the command that
produced it and that command's output. Claims I could not put a command behind
are listed under **Unchecked** and are not ticked.*

## Question

Is `dispatch: false` / "register-only" true for Antigravity? What does it
actually support for **project-level MCP registration** and **project-level
skills**, which file or command is the interface, and therefore what should
`apps/gui/src/main/providers.ts` say instead?

## Environment (all commands run on this machine, 2026-08-16)

| Tool | Where | Version |
|---|---|---|
| `agy` (Antigravity CLI) | `C:\Users\PC\AppData\Local\agy\bin\agy.exe` | `agy --version` → **1.1.13** |
| Antigravity IDE | `C:\Users\PC\AppData\Local\Programs\antigravity\` | installed (not exercised — see Unchecked) |
| `opencode` | `C:\Users\PC\AppData\Roaming\npm\opencode` | `opencode --version` → **1.2.25** |

`agy` **is** installed, so nothing about Antigravity here is assumed.

## Findings

### F1 — `agy` has a real headless print mode

`agy --help` (exit 0), relevant lines verbatim:

```
  --disable-slash-commands        Disable slash command and skill expansion in print mode
  --new-project                   Create a new project for this session
  --output-format                 Output format for print mode (text, json, stream-json) (default text)
  -p                              Short alias for --print
  --print                         Run a single prompt non-interactively and print the response
  --print-timeout                 Timeout for print mode wait (default 5m0s)
  --project                       Project ID for the current CLI session
Available subcommands:
  agent  agents  changelog  help  install  models  plugin  plugins  update
```

Two things follow: print mode is a first-class, documented feature (it even has
its own `--disable-slash-commands` switch for *skill expansion in print mode*),
and **there is no `agy mcp` subcommand** — so a config file, not a CLI, is the
registration interface. `providers.ts` is right to use `kind: "configFile"`.

### F2 — `agy -p` works with piped stdout — `dispatch: false` is REFUTED

The in-repo justification (`providers.ts:386`, and phase-6/7 plans) is
"`agy -p` is known-broken piped (GH #318/#76) → register-only in v1", elsewhere
worded "hangs when spawned with piped stdout". Tested directly, stdout piped
through `head`/`tail` exactly as `spawn` would:

```
$ cd C:\Users\PC\Documents\GitHub\kanmer
$ echo "hi" | agy -p "Reply with exactly: PONG" --print-timeout 90s | head -30
PONG
=== piped exit 0 0 0 ===
```

Returned immediately, exit 0, no hang. Every one of the twelve probe runs below
also piped stdout and every one returned. On **agy 1.1.13** the claim behind
`dispatch: false` does not hold.

### F3 — Antigravity's own bundled docs list only two `mcp_config.json` locations

Both `agy.exe` (183 MB) and the IDE's
`resources\bin\language_server.exe` embed the Antigravity customization guide.
Extracted verbatim from `agy.exe` (offset 53538923):

```
# MCP Servers (`mcp_config.json`)
## Configuration File (`mcp_config.json`)
### Location
*   **Global Configuration**: `~/.gemini/config/mcp_config.json` (applies to all
    sessions).
*   **Plugin Configuration**: `plugins/<plugin_name>/mcp_config.json` (active
    when the plugin is enabled).
```

Schema is `{ "mcpServers": { "<name>": { command, args, env } } }` for stdio, or
`serverUrl` for SSE — which is exactly the shape `mcpServersMerge` writes.

A scan of **both** binaries for the literal `mcp_config.json` returns 13 distinct
strings; **none** is `.agents/mcp_config.json`. So the path `providers.ts` writes
is **undocumented by the vendor**. (It is not thereby wrong — see F6.)

Confirmed live: `~/.gemini/config/mcp_config.json` exists on this machine and
holds `{"mcpServers":{"sequential-thinking":{…}}}`.

### F4 — the customization system doc says workspace `.agents/` is real

Same source, the "Antigravity Customization System Guide":

```
## Customization Discovery and Locations
1.  **Workspace Customizations** (Project-Specific):
    *   Path: `.agents/` (or `.agent/`, `_agents/`, `_agent/`) at the root of
        your project.
    *   The agent walks from your current working directory up to the repository
        root (e.g., the folder containing `.git`) to find these directories.
3.  **Global Configuration** (Machine-Local):
    *   Path: `~/.gemini/config/`
Loading priority (highest→lowest): Workspace Project → Declared Configurations
(`skills.json` / `plugins.json`) → Global Discovery → Built-in → Global Declared.
```

and, from the skills guide: *"A skill must be structured as a directory within a
`skills/` folder inside a customization root (e.g. `.agents/skills/`)"* — plus a
literal format string compiled into the binary:
`{workspace}/.agents/skills/{skill_name}/SKILL.md`.

Elsewhere: *"**Workspace Integration** — the **IDE** automatically discovers and
respects configurations in the `<project-root>/.agents/` folder, loading
project-specific rules, custom skills, and plugins."*

### F5 — a bare `agy -p` in a workspace sees NONE of it

Probe workspace built in a scratch dir (`git init`ed so a repo root exists),
containing `.agents/mcp_config.json` (server `zorblatt`, tool `zorblatt_ping`,
served by a 40-line local stdio MCP server), `.agents/skills/zorblatt-skill/`,
`.agent/skills/zorbsingular/`, `.gemini/skills/zorbgemini/`,
`.agents/plugins/zorbplugin/{plugin.json,mcp_config.json,skills/zorbpluginskill/}`
and `.agents/skills.json`.

```
$ agy -p "…Do you have a tool whose name contains 'zorblatt'? Reply exactly TOOL:YES or TOOL:NO."
TOOL:NO
$ agy -p "…Is a skill named 'zorblatt-skill' available to you? Reply exactly SKILL:YES or SKILL:NO."
SKILL:NO
$ agy -p "List the exact names of every skill available to you, comma-separated, nothing else."
agents-sdk, agy-customizations, antigravity-guide, cloudflare, cloudflare-email-service,
cloudflare-one, cloudflare-one-migrations, durable-objects, sandbox-sdk, turnstile-spin,
web-perf, workers-best-practices, wrangler
```

That list is exactly `~/.gemini/skills/*` (11) plus 2 built-ins — no workspace
skill from any of the four candidate layouts.

**Workspace trust is not the gate.** `~/.gemini/antigravity-cli/settings.json`
carries `trustedWorkspaces`, and the probe dir was not in it; adding it
(temporarily, then restored) changed nothing — still `TOOL:NO`, same skill list.

`agy plugin list` in the workspace → `No imported plugins.`

### F6 — control + the actual gate: the session must be bound to a project

**Control (validates the probe).** Registering the same server in the *global*
`~/.gemini/config/mcp_config.json` (temporarily; restored after):

```
$ agy -p "Do you have any tool whose name contains 'zorb'? Reply exactly TOOL:YES or TOOL:NO."
TOOL:YES
```

So the probe detects MCP tools correctly, and F5's negative is a real negative.

**The gate is `--new-project` / `--project`, not trust and not the file layout:**

```
$ agy --new-project -p "List the exact names of every skill available to you…"
agents-sdk, agy-customizations, antigravity-guide, cloudflare, …, kanmer-auto, kanmer-closeout,
kanmer-docs, kanmer-execute, kanmer-groom, kanmer-plan, kanmer-research, kanmer-review,
kanmer-setup, kanmer-tickets, kanmer-verify, sandbox-sdk, …, zorblatt-skill, zorbpluginskill,
zorbsingular

$ agy --new-project -p "List the exact names of every tool available to you that contains 'zorb'…"
zorblatt_ping
```

- `zorblatt-skill` (`.agents/skills/`) ✅, `zorbsingular` (`.agent/skills/`) ✅,
  `zorbpluginskill` (workspace plugin) ✅, `zorbgemini` (`.gemini/skills/`) ❌ —
  matching the documented customization roots exactly.
- The MCP tool appeared. **Which config supplied it is decidable**: agy caches
  each discovered server under `~/.gemini/antigravity-cli/mcp/<serverName>/`, and
  after that run the directory was `mcp/zorblatt/zorblatt_ping.json`, created
  `23:01:34` — `zorblatt` is the server name from the **workspace-root
  `.agents/mcp_config.json`**. The workspace *plugin*'s server (`zorbplug`) did
  **not** appear (plugins must be enabled). The cache dir had been deleted before
  this run, so it is not residue from the global-control run.
- Session log confirms the mechanism:
  `project.go:77] project: created project "proj" (id=f5286da2-…)` then
  `manager.go:1246] Reloading system slash commands and skills`.

Binding is **per session, by flag** — not a property the folder keeps:

```
$ agy --project f5286da2-172f-4ad9-af28-0642569abcbe -p "…TOOL=… SKILL=…"
TOOL=yes SKILL=yes
$ agy -p "…TOOL=… SKILL=…"            # same folder, project already exists, no flag
TOOL=no SKILL=no
```

**Verdict: `.agents/mcp_config.json` at the workspace root IS read by Antigravity
1.1.13, and `.agents/skills/` IS read — but only in a project-bound session.**
`providers.ts`'s register path and skills path are both correct; what is missing
is the binding condition.

### F7 — ADR-0009's convergence note: VERIFIED (both halves)

- **opencode** — no LLM needed. Its binary contains
  `const EXTERNAL_DIRS = [".claude", ".agents"];` with
  `EXTERNAL_SKILL_PATTERN = "skills/**/SKILL.md"` (`src/skill/skill.ts`), and
  `opencode debug skill` run in the probe workspace listed, first:
  ```json
  { "name": "zorblatt-skill",
    "location": "…\\proj\\.agents\\skills\\zorblatt-skill\\SKILL.md" }
  ```
- **Antigravity** — F6: the same tree loads (`zorblatt-skill`), given project
  binding.

So *"one project-scoped write to `.agents/skills/` serves both opencode and
Antigravity"* holds. (ADR-0009's separate **staleness clause** is still the wrong
lesson — [[MCP-009]] owns amending it; nothing here changes that.)

### F8 — Antigravity already has a plugin install path, and it is in use here

`agy plugin --help`:

```
  list / import [source] (Import plugins from gemini or claude) / install <target>
  (supports plugin@marketplace) / uninstall / enable / disable / validate / link <mp> <target>
```

And this machine already has `~/.gemini/config/plugins/kanmer/` containing
`plugin.json` (`{"name":"kanmer"}`), `mcp_config.json`
(`{"mcpServers":{"kanmer":{"command":"node","args":["${PLUGIN_ROOT}/mcp/kanmer-mcp.cjs"]}}}`),
`skills/`, `.claude-plugin/`, `.codex-plugin/`. Directly relevant to [[MCP-009]]:
Antigravity is not restricted to copy-skills.

### F9 — adjacent defect: one Kanmer skill fails Antigravity's YAML parser

From the same session log:

```
E0816 23:00:58.994115 skills.go:101] Failed to parse skill file
C:\Users\PC\.gemini\config\plugins\kanmer\skills\kanmer-report\SKILL.md:
failed to parse frontmatter: yaml: line 2: mapping values are not allowed in this context
```

Consistent with the skill list in F6: **11 of the 12 `kanmer-*` skills loaded;
`kanmer-report` did not.** Cause is in the repo file
`plugins/kanmer/skills/kanmer-report/SKILL.md:3` — an unquoted YAML plain scalar
containing `": "`:
`description: Report a Kanmer board's state or history — a standup ("now": in flight/…`.
Claude Code tolerates it; agy's parser does not. Not GUI-073's to fix; recorded
in open-questions as a ticket candidate for [[MCP-009]].

### F10 — where the repo says the wrong thing

- `apps/gui/src/main/providers.ts:50` — `/** … antigravity is register-only. */`
- `apps/gui/src/main/providers.ts:386` — `// \`agy -p\` is known-broken piped (GH #318/#76) → register-only in v1.` (F2)
- `apps/gui/src/main/providers.ts:387` — `dispatch: false` (F2)
- `apps/gui/src/renderer/src/components/Settings.tsx:416` — renders `· register-only` from `!p.dispatch`
- `apps/gui/src/renderer/src/components/Settings.tsx:405-410` — the panel blurb still says skills go via *"the shared AGENTS.md block for hosts that only read skills globally (opencode, Antigravity)"*. Both hosts read a **project** tree (F7); the copy contradicts `providers.ts:353/385` as well as reality.
- `apps/gui/src/main/providers.test.ts:79` — `it("antigravity is register-only (no dispatch)")` locks the wrong claim into the test suite.
- `docs/functional/frd/FRD-012-connect.md:14` (R1) — "Antigravity — config file (as shipped)" is **incomplete, not wrong**: it omits that the write only takes effect in a project-bound session (F6), and never names the path.
- `docs/functional/frd/FRD-012-connect.md:23` (AC2) — *"Connect opencode and Antigravity: both discover the roster from one `.agents/skills/` tree; `/skills`-style listings show them"* is **true for opencode, and true for Antigravity only under a project-bound session**; as written the acceptance test would fail against a bare `agy` invocation.
- `docs/functional/frd/FRD-012-connect.md:18` (R5) — "provider facts re-verified … at implementation time" is the staleness framing MCP-009 replaces; flagged, not this ticket's to change.

## Implications for this ticket

1. **"register-only" is wrong in both directions.** It denies project support
   Antigravity has (F6/F7), and it asserts a dispatch limitation that no longer
   exists (F2). Renaming the badge to "no background dispatch" would fix the
   first error and preserve the second.
2. The badge is derived from `dispatch` alone, so the copy cannot be fixed
   independently of deciding what `dispatch` should now be. Evidence supports
   `dispatch: true` with `dispatchCli: "agy"`; **but** F6 means the naive
   `["-p", prompt]` is not enough — `dispatch.ts:115` spawns with `cwd: root` and
   no project binding, so a dispatched agy would run in a session that cannot see
   the kanmer MCP server Connect just registered. A working invocation needs
   `--new-project` (or a stored `--project <id>`). That is a design decision, and
   it overlaps [[GUI-075]].
3. `listProviders()` exposing one boolean is the root cause of the mislabelling:
   the UI has to *interpret* `dispatch`, and it interprets it as a capability
   tier. Exposing what a host does support (register / skills / dispatch, plus a
   per-host caveat string) removes the interpretation step. The caveat string has
   a real first customer: Antigravity's project-binding condition, which is
   exactly the shape of the codex "folder must be trusted" caveat already
   surfaced by `codexTrustWarning` (`providers.ts:255-263`).
4. The Settings panel blurb (F10) is stale in the same panel and about the same
   two hosts. Fixing the badge while leaving the blurb saying Antigravity "only
   reads skills globally" would leave the ticket's stated goal unmet.

## Unchecked — named, not assumed

- **The Antigravity IDE was not exercised.** All Antigravity behaviour above is
  `agy` CLI 1.1.13. The IDE binds a project whenever a folder is open, so the
  project-binding caveat is expected not to apply there — *expected, not
  verified*: it is a GUI and cannot be driven headlessly here. The docs quoted in
  F3/F4 are byte-identical in the IDE's `language_server.exe`, which is the
  strongest evidence available without driving the app.
- **GH issues #318/#76 were not fetched** (no network lookup performed). The
  claim they support was tested against the binary instead (F2), which is the
  stronger check; whether the issues are still open is unknown.
- **Other Antigravity versions.** Everything here is 1.1.13 on Windows. Whether
  1.0.x behaved as `providers.ts` describes is unknown and untested.
- **claude / codex / grok CLIs were not exercised** — out of scope here;
  [[MCP-009]] owns the five-provider audit.
- **`.agents/hooks.json`, `.agents/rules/`, `skills.json` inheritance** were not
  probed beyond the single `skills.json` file in F5 (which was inert in an
  unbound session and redundant in a bound one).

## Machine state

All probes were reversible and were reversed: the temporary entry in
`~/.gemini/config/mcp_config.json`, the temporary `trustedWorkspaces` entry in
`~/.gemini/antigravity-cli/settings.json`, the two `~/.gemini/config/projects/*.json`
created by `--new-project`, the `~/.gemini/antigravity-cli/mcp/zorblatt/` cache,
and the scratch probe workspace were all removed and the originals verified byte-equivalent.
No file in the repository was modified.
