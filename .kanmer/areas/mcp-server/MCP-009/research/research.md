# MCP-009 — Research: plugin install parity across five providers

## The question

Does each of the five providers (codex, claude, opencode, grok, antigravity)
have a working, documented install path — and is every "provider X cannot do Y"
claim in this repo backed by a command run against the real binary?

## Method (the deliverable, per the ticket body)

Every capability statement below cites the **exact command run and its output**.
Where a config file is the interface, a **real file the tool itself wrote** was
read, not a documented example. No capability is inferred from silence; where a
capability was found absent, the probe that established the absence is named,
and where possible a **positive control** proves the probe would have detected
the capability if present.

Environment: Windows 11, `C:\Users\PC\Documents\GitHub\kanmer`, 2026-08-16.

### Which CLIs are installed — none were unchecked

```powershell
foreach ($c in 'claude','codex','opencode','grok','agy','antigravity','gemini') {
  $g = Get-Command $c -ErrorAction SilentlyContinue
  if ($g) { "FOUND $c -> $($g.Source)" } else { "MISSING $c" } }
```
```
FOUND claude   -> C:\Users\PC\.local\bin\claude.exe
FOUND codex    -> C:\Users\PC\AppData\Roaming\npm\codex.ps1
FOUND opencode -> C:\Users\PC\AppData\Roaming\npm\opencode.ps1
FOUND grok     -> C:\Users\PC\.grok\bin\grok.exe
FOUND agy      -> C:\Users\PC\AppData\Local\agy\bin\agy.exe
MISSING antigravity
MISSING gemini
```

**All five providers were checked against a real binary.** There is no
"unchecked CLI" finding for this ticket. Antigravity's CLI is `agy` (there is no
`antigravity` executable); `agy --version` → `1.1.13`.

Versions used throughout: `claude` 2.1.233, `codex-cli` 0.147.0, `opencode`
1.2.25, `grok` 0.2.111, `agy` 1.1.13.

---

## Finding 1 (BLOCKER) — Claude's shipped install command fails outright

`connect.ts:148` calls `provider.install.marketplaceCommands(pluginRoot())`, and
`pluginRoot()` (`connect.ts:55-58`) is `<repo>/plugins/kanmer`. That is the
directory `providers.ts:330-333` hands to `claude plugin marketplace add`. Run it:

```powershell
claude plugin marketplace add C:\Users\PC\Documents\GitHub\kanmer\plugins\kanmer
```
```
Adding marketplace…
✘ Failed to add marketplace: Marketplace file not found at
  C:\Users\PC\Documents\GitHub\kanmer\plugins\kanmer\.claude-plugin\marketplace.json
EXIT=1
```

The marketplace manifest lives at the **repo root**, not inside the plugin.
Given the correct directory it works end to end:

```powershell
claude plugin marketplace add C:\Users\PC\Documents\GitHub\kanmer
claude plugin install kanmer@kanmer -y
```
```
✔ Successfully added marketplace: kanmer (declared in user settings)   EXIT=0
✔ Successfully installed plugin: kanmer@kanmer (scope: user)           EXIT=0
```

`connect.ts:152-154` catches the failure and reports `plugin cmd skipped (…)`,
so **Connect has been silently doing nothing for Claude Code**, and the second
command (`claude plugin install kanmer@kanmer`) then fails too because the
marketplace was never registered.

### Why the packaged build cannot be fixed by passing the repo root

`apps/gui/electron-builder.yml:17-23`:

```yaml
extraResources:
  - from: ../../packages/mcp-server/dist/standalone/kanmer-mcp.cjs
    to: mcp/kanmer-mcp.cjs
  # The plugin (skills + marketplace source) so Connect can install skills and
  # register a local marketplace for the packaged app.
  - from: ../../plugins/kanmer
    to: plugins/kanmer
```

Only `plugins/kanmer` ships. Neither `.claude-plugin/marketplace.json` nor
`.agents/plugins/marketplace.json` is copied into `resources/`, so the packaged
app has **no local marketplace source at all** — the comment on line 20-21
asserts one that is not there. The v2 plan explicitly required both
(`docs/plans/kanmer-v2/phase-6-agents-connect/plan.md:30`: "ship `plugins/kanmer/`
*(+ the two marketplace JSONs)* in `electron-builder.yml` `extraResources`"), so
this is a regression against a written requirement, not an oversight of scope.

---

## Finding 2 (BLOCKER) — codex registers a marketplace and never installs the plugin

`providers.ts:309-312` issues exactly one command for codex:
`codex plugin marketplace add <dir>`. There is no install step. Claude gets two
commands; codex gets one. Confirmed the subcommand exists and is *separate*:

```powershell
codex plugin --help
```
```
Commands:
  add          Install a plugin from a configured marketplace snapshot
  list         List plugins available from configured marketplace snapshots
  marketplace  Add, list, upgrade, or remove configured plugin marketplaces
  remove       Remove an installed plugin from local config and cache
```

Note the verb: codex uses **`add`**, not `install`. `codex plugin install` does
not exist —

```powershell
codex plugin install --help
```
```
error: unrecognized subcommand 'install'
  tip: a similar subcommand exists: 'list'
EXIT=2
```

Same wrong-directory defect as Finding 1, then the working path:

```powershell
codex plugin marketplace add C:\Users\PC\Documents\GitHub\kanmer\plugins\kanmer
```
```
Error: invalid marketplace file `\\?\…\plugins\kanmer`:
  marketplace root does not contain a supported manifest      EXIT=1
```
```powershell
codex plugin marketplace add C:\Users\PC\Documents\GitHub\kanmer
codex plugin add kanmer@kanmer-plugins
```
```
Added marketplace `kanmer-plugins` from \\?\C:\Users\PC\Documents\GitHub\kanmer.  EXIT=0
Added plugin `kanmer` from marketplace `kanmer-plugins`.
Installed plugin root: C:\Users\PC\.codex\plugins\cache\kanmer-plugins\kanmer\0.1.0  EXIT=0
```

`codex plugin list -m kanmer-plugins` confirmed codex reads
`.agents/plugins/marketplace.json` and takes the marketplace **name from that
file**:

```
Marketplace `kanmer-plugins`
C:\Users\PC\Documents\GitHub\kanmer\.agents\plugins\marketplace.json
PLUGIN                 STATUS         PATH
kanmer@kanmer-plugins  not installed  …\plugins\kanmer
```

So the correct second command is `codex plugin add kanmer@kanmer-plugins` —
note the marketplace name differs from Claude's (`kanmer`), see Finding 6.

After install, codex registered the MCP server from `.codex-plugin/plugin.json`:

```powershell
codex mcp list
```
```
Name    Command  Args                               Status
kanmer  node     ${PLUGIN_ROOT}/mcp/kanmer-mcp.cjs  enabled
```

The `${PLUGIN_ROOT}` token is stored unexpanded and no `--root` is passed —
that is [[MCP-011]]'s territory and is **not** fixed here.

---

## Finding 3 (MAJOR) — grok has a full plugin system; `copySkills` is an unverified fallback

`providers.ts:368` gives grok `install: { kind: "copySkills", … skillsDir: ".grok/skills" }`.
That treats grok as unable to take the plugin. It can:

```powershell
grok --help          # top-level, abridged
```
```
Commands:
  mcp     Manage MCP server configurations
  plugin  Manage plugins and marketplace sources
  inspect Show the configuration Grok discovers for this directory
```
```powershell
grok plugin --help
```
```
Commands:
  list  install  uninstall  update  enable  disable  details  validate  tag  marketplace
```

grok validates and installs this very plugin, reading `.claude-plugin/plugin.json`:

```powershell
grok plugin validate ./plugins/kanmer
```
```
Plugin manifest is valid.
  name: kanmer
  version: 0.1.0
  description: File-based kanban for AI agents: …
  components: 1 skill dir(s), 0 command dir(s), 0 agent dir(s), MCP servers
```
```powershell
grok plugin install C:\Users\PC\Documents\GitHub\kanmer\plugins\kanmer --trust
```
```
Installed 1 plugin(s) from …\plugins\kanmer: kanmer     EXIT=0
```

`grok inspect` (grok's own resolved-configuration dump — the oracle for this
host) then showed the full roster **and** the MCP server arriving via the plugin:

```
  Plugins (4)
  └ kanmer (user, enabled)          12 skills, 1 MCPs
  MCP Servers (3)
  └ kanmer (stdio)          plugin: kanmer
  Skills … kanmer-auto … kanmer-verify   plugin: kanmer
```

grok also ships two marketplace sources out of the box
(`grok plugin marketplace list` → xAI Official, `claude-plugins-official`), and
`grok plugin install` accepts a local path, a GitHub shorthand, or a git URL.

**grok reaches full parity with Claude and codex via the plugin.** The
`copySkills` path is not a necessity; whether to keep it is a design decision,
not a capability limit.

---

## Finding 4 (MAJOR) — Antigravity installs the plugin too, and is dispatchable

`providers.ts:374-388` gives Antigravity `copySkills` + `dispatch: false`. Both
claims are wrong against `agy` 1.1.13.

### 4a. `agy` has a plugin installer

```powershell
agy --help      # abridged
```
```
Available subcommands:
  agent  agents  changelog  help  install  models  plugin  plugins  update
```
```powershell
agy plugin --help
```
```
Commands:
  list  import [source]  install <target>  uninstall <name>
  enable <name>  disable <name>  validate [path]  link <mp> <target>  help
```
```powershell
agy plugin install C:\Users\PC\Documents\GitHub\kanmer\plugins\kanmer
```
```
  [ok]    kanmer
          ✔ skills      : 12 processed
          - agents      : skipped (not found)
          - commands    : skipped (not found)
          ✔ mcpServers  : 1 processed
          - hooks       : skipped (not found)
EXIT=0
```

`agy plugin list` reports it as an import of source **`claude-code`** — i.e.
Antigravity consumes `.claude-plugin/plugin.json` directly:

```json
{ "imports": [ { "name": "kanmer", "source": "claude-code",
  "importedAt": "2026-08-16T21:58:41Z", "components": ["skills","mcpServers"] } ] }
```

Quirk worth recording: `agy plugin validate ./plugins/kanmer` **fails** —
`Error: missing plugin.json: … plugins\kanmer\plugin.json` — because `validate`
expects a manifest at the plugin root while `install` happily reads
`.claude-plugin/plugin.json` and *synthesises* a root `plugin.json` on the way
in (a `plugin.json` appears in the installed copy that is absent from the
source). `validate` is therefore not a usable pre-flight check for this layout.

### 4b. `agy -p` is NOT broken — the `dispatch: false` comment is stale

`providers.ts:386` says: `// agy -p is known-broken piped (GH #318/#76) → register-only in v1.`

Piped stdin, first attempt:
```powershell
"say OK and nothing else" | agy -p --print-timeout 90s
```
```
jetski: no output produced — a tool required the "read_file" permission that
headless mode cannot prompt for, so it was auto-denied. Add an allow-rule under
permissions.allow in settings.json … Alternatively, re-run with
--dangerously-skip-permissions to auto-approve all tools.
EXIT=0
```
That is a *permissions* auto-deny with an actionable message, not a broken pipe.

Prompt as an argument — **the exact shape `dispatchArgs` would produce**:
```powershell
agy -p "Reply with exactly the word PONG and nothing else." --print-timeout 120s
```
```
PONG
EXIT=0
```

Clean stdout, exit 0. `agy --help` also documents `--output-format
(text, json, stream-json)` and `--print-timeout`. **Antigravity is dispatchable**
with `["-p", prompt]` — identical to Claude's shape. [[GUI-073]] asks this exact
question ("is `dispatch: false` still true?"); the answer is no.

### 4c. ⚠ SUPERSEDED — Antigravity DOES read project skill directories

> **OVERTURNED 2026-08-16 by adjudication** (`scratch/adjudication.md`). The
> conclusion originally drawn in this sub-finding — that `agy` reads no project
> skills directory — is **false**. Ten runs on one throwaway tree, positive
> controls in every run, corroborated by the probe MCP server's own process log,
> established that `.agents/skills/` and `.agents/mcp_config.json` **are** read
> by `agy` 1.1.13 and are functionally live: the skill executed, the MCP server
> spawned, its tool returned a value. [[GUI-073]] was right.
>
> **The gate is a bound workspace folder.** The transcripts below are kept
> because the observations were real and the *reasons* they misled are the most
> valuable thing this research produced — see §Finding 4d for the corrected
> account and the two independent causes.

The original (wrong) reasoning follows, retained for the record. It was tested
twice with a positive control.

Negative, in the real repo (which has 12 `kanmer-*` skills in `.claude/skills/`):
```powershell
agy -p "List every skill available to you whose name starts with 'kanmer-'. …
        Use only your own skill registry … If none, say NONE." \
    --dangerously-skip-permissions --print-timeout 150s
```
```
NONE
```

Also NONE in a scratch project seeded with probe skills in **all four**
candidate locations — `.agents/skills/`, `.agent/skills/` (the legacy singular),
`.claude/skills/` and `.opencode/skills/`.

**Positive control** — same question, same repo, after `agy plugin install`:
```
kanmer-auto, kanmer-closeout, kanmer-docs, kanmer-execute, kanmer-groom,
kanmer-plan, kanmer-research, kanmer-review, kanmer-setup, kanmer-tickets,
kanmer-verify
```

*(Original conclusion, now retracted: "The probe detects skills when they are
present, so the NONE results are evidence of absence rather than absence of
evidence." **This inference was wrong** — see §Finding 4d. The positive control
proved the probe could see skills delivered by `agy plugin install`; it did not
prove the probe could see skills delivered by a project tree, because the two
travel by different mechanisms and only the first was ever exercised
successfully. A control that passes on a different mechanism is not a control.)*

### 4d. The corrected account — the gate is a bound workspace folder

Established by the adjudication, all of it tested explicitly:

- `.agents/skills/` and `.agents/mcp_config.json` **are** read by `agy` 1.1.13,
  and are functionally live end to end — skill executed, MCP server spawned,
  tool returned a value.
- **Bare `agy` binds to `default-cli-project`**, whose record carries
  `"projectResources": {}`. There is no folder, so there is nothing to read
  `.agents/` from. **The working directory is irrelevant.**
- `--new-project`, `--project <id>` with a `folderUri`, and `--add-dir <path>`
  each bind a workspace folder. `--add-dir` persists nothing.
- **Workspace trust is not the gate** — the probe directory was never trusted
  and everything loaded regardless.
- **A git root does not auto-bind.**
- **Project existence is not enough** — only the flag on the command line binds.

Two independent reasons the original probe returned NONE, both worth recording
because both will catch the next person:

1. The probe session was almost certainly not workspace-bound, which is the gate.
2. **A workspace MCP server never surfaces as a named top-level tool.** It
   appears as the generic `call_mcp_tool` / `list_resources` / `read_resource`
   triad. **Grepping a tool list for the server's own tool name is a false
   negative even when the server is connected.** The tool list was a proxy;
   calling the tool is the mechanism.

The sharper rule this produced, and the one shipped into ADR-0009: a positive
control is necessary but **not sufficient** — *verify the mechanism you are
actually testing, not a proxy for it.*

Consequence: `providers.ts`'s `.agents/skills` write for Antigravity is
**correct**, ADR-0009's convergence claim **holds**, and FRD-012 AC2 is
satisfiable — but only in a workspace-bound session, and **Kanmer establishes no
binding today**. A grep across `apps/` and `packages/` for `--project`,
`--new-project`, `--add-dir` or any `agy` invocation returns nothing, so the
write is correct and currently **inert**. [[MCP-015]] owns making it live;
[[GUI-073]] owns saying it.

---

## Finding 5 — what each host actually reads: the skill-directory probe

A scratch project was seeded with an identical probe skill in four directories,
then each host's own registry dump was read.

grok (`grok inspect`, filtered to `probe-`):
```
  └ probe-grokdir      project
  └ probe-agentsdir    project
  └ probe-claudedir    project [claude]
```

opencode (`opencode debug skill` — an undocumented but real subcommand under
`opencode debug`, "list all available skills"): returned JSON containing
`probe-claudedir`, `probe-agentsdir` and `probe-opencodedir`, each with its
absolute `location`.

**The Antigravity column is corrected per the adjudication** (§4d). The original
probe was not workspace-bound, so every one of its negatives is void — not
"no", but *not established*. Only `.agents/skills/` was re-run under a binding.

| Project skills dir | claude | codex | opencode | grok | antigravity (`agy`) |
|---|---|---|---|---|---|
| `.claude/skills/` | yes (native) | not probed (plugin host) | **yes** | **yes** (`[claude]` compat) | *unestablished* |
| `.agents/skills/` | not probed | not probed | **yes** | **yes** | **yes — bound workspace only** |
| `.opencode/skills/` | — | — | **yes** | **no** | *unestablished* |
| `.grok/skills/` | — | — | **no** | **yes** (native) | *unestablished* |

Two results matter for parity:

- **`.agents/skills/` serves grok as well as opencode** — a third host, which
  ADR-0009's convergence note (opencode + Antigravity) does not mention. grok's
  `.grok/skills` setting in `providers.ts` is therefore an unnecessary second
  write. *(Unaffected by the adjudication; grok's row stands.)*
- **`.agents/skills/` serves Antigravity too, in a workspace-bound session** —
  so ADR-0009's convergence note is right and gains a third host, and the only
  correction it needs is the binding caveat. Kanmer binds nothing today
  (verified: `grep -rn -- "--new-project\|--add-dir\|--project" apps/ packages/`
  returns nothing; the only `agy` string in either tree is a stale comment in
  `providers.ts`), so the write is correct and inert. [[MCP-015]] owns it.

---

## Finding 6 — the four manifests do not agree

| File | `name` | version | skills | mcpServers | notes |
|---|---|---|---|---|---|
| `.claude-plugin/marketplace.json` | **`kanmer`** | — | — | — | `source: "./plugins/kanmer"` |
| `.agents/plugins/marketplace.json` | **`kanmer-plugins`** | — | — | — | `source: {source:"local", path:"./plugins/kanmer"}`, `policy.installation: AVAILABLE` |
| `plugins/kanmer/.claude-plugin/plugin.json` | `kanmer` | **0.1.0** | `./skills/` | `./mcp/claude.mcp.json` | no `interface` block |
| `plugins/kanmer/.codex-plugin/plugin.json` | `kanmer` | **0.1.0** | `./skills/` | `./.mcp.json` | has `interface` block |

Disagreements, in order of consequence:

1. **Two different marketplace names.** Claude's install id is `kanmer@kanmer`;
   codex's is `kanmer@kanmer-plugins`. `providers.ts:332` hardcodes
   `claude plugin install kanmer@kanmer`, which is right for Claude and would be
   wrong for codex. Both were confirmed live (Findings 1 and 2). The names can
   legitimately differ — but nothing in the repo records that they do, and any
   shared "install the plugin" copy that assumes one name is wrong for the other.
2. **Two different bundled MCP config paths** for the same server —
   `./mcp/claude.mcp.json` (`${CLAUDE_PLUGIN_ROOT}`) vs `./.mcp.json`
   (`${PLUGIN_ROOT}`). Both files exist. This is deliberate (different hosts,
   different token) but undocumented anywhere.
3. **Both `plugin.json` files say `0.1.0`; `package.json` says `0.3.2`.**
   Confirmed: `(Get-Content package.json | ConvertFrom-Json).version` → `0.3.2`;
   both manifests → `0.1.0`. `bundledSkillsVersion()` (`connect.ts:61-69`) reads
   `.claude-plugin/plugin.json`, so `skillsStatus().updateAvailable` compares
   against a constant and **can never fire**. Live proof: `claude plugin details
   kanmer` → `kanmer 0.1.0`, and codex cached the plugin at
   `…\cache\kanmer-plugins\kanmer\0.1.0`.
   **[[MCP-011]] owns this fix. Recorded here, not repaired.** One consequence
   [[MCP-011]] does not yet record: codex's cache path is keyed by that version,
   so a frozen version also freezes codex's cache — a bumped bundle would
   overwrite `0.1.0` rather than land in a new directory.
4. `.claude-plugin/marketplace.json` carries `description`/`owner`/`category`;
   `.agents/plugins/marketplace.json` carries `interface`/`policy` instead. Each
   is valid for its host; neither is a subset of the other, so "keep them in
   sync" needs a definition of which fields are shared.

Both marketplace manifests validate against their own host's validator:
`claude plugin validate .` → `✔ Validation passed` (marketplace);
`claude plugin validate ./plugins/kanmer` → `✔ Validation passed` (plugin).

---

## Finding 7 — `.mcp.json` is written by two providers with the same key

`providers.ts:363-366` registers grok by merging `mcpServers.kanmer` into the
project `.mcp.json`. `claude mcp add … -s project` writes **the same file, the
same key**:

```powershell
claude mcp add --help
```
```
  -s, --scope <scope>   Configuration scope (local, user, or project) (default: "local")
```

The repo's real `.mcp.json` — written by Claude, note the `"type": "stdio"` that
`mcpServersMerge` never emits:

```json
{ "mcpServers": { "kanmer": { "type": "stdio",
  "command": "C:\\…\\Kanmer.exe",
  "args": ["C:\\…\\plugins\\kanmer\\mcp\\kanmer-mcp.cjs", "--root", "C:\\…\\.worktrees\\kanmer"],
  "env": { "ELECTRON_RUN_AS_NODE": "1" } } } }
```

And `grok inspect` reads it: `MCP Servers (3) └ kanmer (stdio)  .mcp.json`.

Two consequences, neither documented:
- Connecting **Claude alone already registers grok**. That is convenient and is
  arguably the parity story, but it is accidental.
- Disconnecting **grok** runs `mcpServersUnmerge`, which deletes
  `mcpServers.kanmer` — **silently disconnecting Claude Code**. That is a direct
  violation of FRD-012 R4 ("Disconnect reverses exactly what connect wrote").

Also, `grok mcp list` is **not** the oracle for grok — it reported "No MCP
servers configured" while `grok inspect` showed `kanmer` active from `.mcp.json`.
`mcp list` reads only grok's own `config.toml`. Anyone re-checking this must use
`grok inspect`.

---

## Finding 8 — the claims in `providers.ts` that DO hold up

Checked by the same method, and correct:

- **`codex mcp add` has no scope flag.** `codex mcp add --help` shows
  `--env`, `--url`, `--bearer-token-env-var`, `--oauth-*` — and no
  `--scope`/`--project`. The `providers.ts:145-148` comment ("always writes the
  global `~/.codex/config.toml`") is verified; the project-file merge is
  justified (ADR-0007).
- **codex project trust is real and checkable.** `~/.codex/config.toml` contains
  a `[projects.'<path>'] trust_level = "trusted"` table with lowercased,
  single-quoted Windows paths — exactly the shape `codexTrustFromConfig`
  (`providers.ts:224-250`) parses. Caveat for the UI: `c:\users\pc\documents\github`
  is trusted but `…\github\kanmer` is not listed, so this repo resolves to
  **`maybe-via-ancestor`**, the hedged message — likely the common real-world
  answer, not the exception.
- **opencode's config-file registration is correct and necessary.**
  `opencode mcp add --help` exposes *no* flags at all (only `--help`,
  `--version`, `--print-logs`, `--log-level`) — it is an interactive wizard, so
  there is no headless CLI route. And opencode does read the project file:
  after writing an `opencode.json` with the exact shape `opencodeMerge` emits,
  `opencode debug config` showed `"kanmer": { "type": "local", "command": [...],
  "environment": { "ELECTRON_RUN_AS_NODE": "1" }, "enabled": true }` merged into
  the resolved config. **Verified — this is a genuine "cannot", correctly handled.**
- **Antigravity has no MCP CLI.** `agy --help` lists no `mcp` subcommand;
  running `agy mcp` does not error but opens an interactive session (it hung
  until killed) — i.e. `mcp` was taken as a prompt. Config-file registration is
  the only route. **Verified absence, established by a probe.**
- **Antigravity's `mcpServers` config shape is right.** Read from a real
  Antigravity-written file, `~/.gemini/config/mcp_config.json`, and from the one
  `agy plugin install` generated at
  `~/.gemini/config/plugins/kanmer/mcp_config.json`:
  `{ "mcpServers": { "kanmer": { "command": "node", "args": ["${PLUGIN_ROOT}/…"],
  "cwd": "", "env": null } } }`. A real project-level
  `.agents/mcp_config.json` (in a different repo, written by Kanmer) matches the
  same shape. Antigravity's config home is `~/.gemini/`, which is recorded
  nowhere in this repo.

---

## Finding 9 — README documents two providers of five, and its commands do work

`README.md:158-179` is headed "Install as a plugin (**Claude Code & codex**)".
opencode, grok and Antigravity have no documented install path at all — even
though (Findings 3 and 4) grok and Antigravity both take the plugin.

The two documented paths were tested against GitHub, not just locally:

```powershell
claude plugin marketplace add collisionengineers/kanmer   # ✔ EXIT=0 (clones via HTTPS)
claude plugin install kanmer@kanmer                       # ✔ EXIT=0 (scope: user)
codex plugin marketplace add collisionengineers/kanmer    # ✔ EXIT=0 → `kanmer-plugins`
```

Both work. Two gaps in the prose:
- codex's "Then install **kanmer** from `/plugins`" omits the CLI equivalent,
  which is `codex plugin add kanmer@kanmer-plugins` (not `install`, and the
  marketplace name is not `kanmer`).
- `claude plugin install` installs at **scope `user`** by default. `-s scope`
  (`user|project|local`) exists. Every other thing Kanmer writes is
  project-scoped (ADR-0007), so the plugin currently leaks Kanmer's skills into
  every project on the machine. Not a defect exactly — a decision nobody has made.

Related, and user-visible: after `claude mcp add … -s project`, `claude mcp list`
showed `kanmer: … ⏸ Pending approval (run 'claude' to approve)`. A user who
connects from Kanmer's GUI gets a registration that does nothing until they open
an interactive `claude` session and approve it. `claude mcp reset-project-choices`
exists to clear those decisions.

---

## Finding 10 — ADR-0009's staleness clause is the wrong lesson, and it propagated

`docs/architecture/adr/ADR-0009-skills-are-not-the-contract.md:19` currently reads:

> Provider install specs are **re-verified against current host documentation at
> implementation time** — this ADR's own correction is the precedent:
> skill-ecosystem facts go stale in weeks. Convergence note for Connect: one
> project-scoped write to `.agents/skills/` serves both opencode and Antigravity.

Three things are wrong with it, and this research demonstrates each:

1. **"go stale in weeks" misdiagnoses the failure.** Nothing found here went
   stale. grok's `plugin` command, Antigravity's `plugin` command and
   `codex plugin add` are all long-standing; nobody looked. The failure mode is
   assuming absence, not decay.
2. **"against current host documentation" points at the weaker source.** Every
   material finding in this document came from the binary, not from docs:
   `opencode debug skill` and `grok inspect` are not prominently documented;
   `codex plugin install` is documented-adjacent and does not exist.
3. **The convergence note is incomplete, not falsified** *(corrected 2026-08-16
   per §4d — this research first claimed it was falsified, and that claim was
   itself the wrong lesson arriving a second time)*. `.agents/skills/` serves
   opencode, **grok** and Antigravity. It gains a third host the note never
   mentioned, and one caveat: Antigravity reads it only in a workspace-bound
   session, and Kanmer binds nothing today. A clause telling readers to
   re-verify is the clause that most needs to carry a correct fact, since
   readers quote it instead of re-deriving it — which is exactly why the
   near-miss here is worth recording.

`FRD-012-connect.md:18` (R5) repeats the same instruction — "Provider facts are
re-verified against current host docs at implementation time" — so amending the
ADR alone leaves the wrong lesson standing in the FRD.

### Proposed replacement text for ADR-0009 ¶19

> Provider capability claims are established **against the installed binary, not
> the documentation**, and **never inferred from the absence of evidence**. A
> statement that a host cannot do something is only admissible with the command
> that was run and its output; "the docs do not mention it" is not a finding.
> Prefer each host's own resolved-configuration dump over its documentation and
> over its narrower subcommands — `grok inspect`, `opencode debug skill`,
> `codex plugin list`, `claude plugin details` — several of which are
> undocumented, and one of which (`grok mcp list`) reports "none configured" for
> servers `grok inspect` shows as active. Where a config file is the interface,
> read one the tool itself has written rather than a documented example. Where a
> capability appears absent, prove the probe works by finding a case where it
> reports the capability present. If a CLI is not installed, record it as
> **unchecked** — an unchecked host is a finding, never a default.
>
> This ADR's own correction is the precedent, and its lesson is **not** that
> such facts go stale. They did not: opencode and Antigravity had supported
> skills for a long time, and no host removes skill support. The premise was
> wrong because nobody checked.
>
> **A positive control is necessary but not sufficient: verify the mechanism you
> are actually testing, not a proxy for it.** *(Worked example added after the
> adjudication — see §4d. The clause as shipped carries it.)*
>
> Convergence note for Connect: one project-scoped write to `.agents/skills/`
> serves **opencode, grok and Antigravity** — a third host beyond the two
> originally noted — with one caveat for Antigravity: `agy` reads it only in a
> **workspace-bound** session, and Kanmer establishes no binding today.

**Superseded draft, retained to show the near-miss:** an earlier version of this
paragraph read *"It does **not** serve Antigravity, whose CLI (`agy`) reads no
project skills directory."* That was false, and it would have written a second
wrong lesson into the very document this ticket exists to correct — arriving
with an evidence table, which would have made it harder to dislodge than the
clause it replaced. See §4d.

`FRD-012` R5 should be replaced with a pointer to this clause rather than its
own paraphrase, so there is one statement of the rule.

---

## What this implies for the ticket

Parity is much closer than the repo believes on capability, and much further
away on correctness:

- **All five hosts can take the Kanmer plugin.** claude, codex, grok and
  antigravity were each proven to install it from a local path; opencode is the
  only one with no plugin installer (`opencode --help` lists no `plugin`
  subcommand) and genuinely needs the skills copy.
- **Two of the five install paths Connect ships are broken today** (claude:
  wrong directory; codex: missing the install step), and a third (antigravity)
  writes to a directory the host reads **only in a workspace-bound session that
  Kanmer never establishes** — so the write is correct and inert, not wrong
  (corrected per §4d; [[MCP-015]] owns the binding).
- The single highest-leverage change is **one correct marketplace root, shipped
  in `extraResources`, plus the right second command per host** — after which
  four of five hosts converge on the same mechanism.

### Recommended split — this ticket is too large as one unit

The honest conclusion is that MCP-009 should be split. It currently contains one
research deliverable, four independent code changes, two document amendments and
a packaging fix, with different risk profiles and different reviewers.

Proposed split (this research covers all of them; no re-investigation needed):

| Ticket | Scope | Why separate |
|---|---|---|
| **MCP-009** (keep) | The ADR-0009 + FRD-012 amendments (Finding 10), the corrected FRD-012 install matrix (Findings 1-9), and this research as the evidence base. Docs only. | Amending a merged ADR is the decision the ticket was written to make; it should not be gated on shipping code. |
| **MCP-009a** | Fix the marketplace root: pass the repo/resources root to `marketplaceCommands`, ship both marketplace JSONs in `electron-builder.yml` `extraResources`, add `codex plugin add kanmer@kanmer-plugins`. | The blocker. Small, mechanical, independently verifiable, and unblocks everything else. |
| **MCP-009b** | grok → plugin install (`grok plugin install <dir> --trust`); decide the fate of `.grok/skills`. | Behaviour change for a shipping provider; wants its own before/after test. |
| **MCP-009c** | Antigravity: `agy plugin install`, `dispatch: true` with `["-p", prompt]`, and stop writing the inert `.agents/skills` copy. | Contradicts [[GUI-073]]'s stated premise (see Q1) and needs the operator's ruling first. |
| **MCP-009d** | The `.mcp.json` collision between claude and grok (Finding 7) — a disconnect-time data-loss bug. | Different failure class (destructive), different test, arguably a `fix` profile. |

Explicitly **not** folded in: [[MCP-011]] (the two `plugin.json` manifests) and
[[GUI-073]] (the "register-only" label). Both are referenced above with evidence
that helps them; neither is touched here.

## Reversibility note

Every install performed for this research was reverted. `claude plugin
uninstall`/`marketplace remove`, `codex plugin remove`/`marketplace remove`,
`grok plugin uninstall`, `agy plugin uninstall` all returned success, and a
follow-up listing on each of the four CLIs shows no `kanmer` entry. The orphaned
`~\.codex\plugins\cache\kanmer-plugins` snapshot and the scratch probe project
were deleted. `git status --porcelain` in the repo shows only pre-existing
untracked paths — **no repository file was modified by this research**.

---

## Addendum (2026-08-16) — adjudication verdict, and where each finding now lives

Two things happened after this research was first written: the operator accepted
the split (`scratch/operator-answers.md`), and an adjudication overturned the
Antigravity conclusion by measurement (`scratch/adjudication.md`). **Where this
document and the adjudication disagree, the adjudication governs** — the inline
corrections above (§4c banner, §4d, §Finding 5 table, §Finding 10 point 3 and
its draft clause) carry the verdict; this addendum records the disposition so
each sibling ticket inherits the evidence without re-investigating.

### MCP-009 shipped (docs only)

The ADR-0009 ¶19 amendment, the ADR-0009 ¶9 binding caveat, the FRD-012 R2
install-matrix correction, the FRD-012 AC2 restatement and the FRD-012 R5
replacement. Nothing under `apps/` or `packages/` was touched.

### Evidence handed to [[MCP-015]] — Antigravity → plugin path + dispatch

- **The gate is a bound workspace folder.** Bare `agy` binds to
  `default-cli-project`, record `"projectResources": {}` — no folder, nothing to
  read `.agents/` from, **cwd irrelevant**. `--new-project`, `--project <id>`
  with a `folderUri`, and `--add-dir <path>` all bind; `--add-dir` persists
  nothing. Choosing between them is MCP-015's decision.
- **Three things that are NOT the gate, each tested explicitly:** workspace
  trust (probe dir untrusted, everything loaded), a git root (does not
  auto-bind), and project existence (only the flag on the command line binds).
- **Kanmer establishes no binding today** — verified in this ticket's own
  worktree: `grep -rn -- "--new-project\|--add-dir\|--project" apps/ packages/`
  returns nothing, and the only `agy` string in either tree is the stale comment
  at `providers.ts:451`. So the `.agents/skills/` write is correct and inert.
- `agy -p "<prompt>"` returns clean stdout at exit 0 (§4b), so `dispatch: false`
  is stale and `dispatchArgs: (p) => ["-p", p]` is the right shape.
- `agy plugin install` works (§4a) and is an alternative delivery path, but note
  it copies to `~/.gemini/config/plugins/<name>/skills/` — **global**, which cuts
  against ADR-0007's project scoping. Binding the workspace keeps the delivery
  project-scoped; installing the plugin does not. That trade-off is MCP-015's.
- `agy plugin validate` is not a usable pre-flight for this layout (§4a).

### Evidence handed to [[MCP-013]] — marketplace root + packaging

Findings 1, 2, 6 and 9 in full: the failing `claude plugin marketplace add`
against the plugin dir instead of the repo root; the swallowed non-zero exit at
`connect.ts:152-154` that hid it; `electron-builder.yml` shipping neither
marketplace JSON (a regression against
`docs/plans/kanmer-v2/phase-6-agents-connect/plan.md:30`); the two marketplace
names (`kanmer` for Claude, `kanmer-plugins` for codex); codex's verb being
`plugin add`, not `plugin install`; the two `${…}_ROOT` variables and their
per-host expansion behaviour; and the unchosen `--scope user` default. Open
questions Q4, Q6, Q7 and the `-y` question are parked onto it.

### Evidence handed to [[MCP-014]] — grok → plugin path

Finding 3 in full (`grok plugin install … --trust` works; `grok inspect` is the
oracle, `grok mcp list` is not), plus Finding 5's result that `.agents/skills/`
already serves grok, making `.grok/skills` a redundant second write, plus Q8's
observation that keeping both paths made `grok inspect` list every skill twice.

### Evidence handed to [[GUI-079]] — the `.mcp.json` collision

Finding 7 in full. Settled by the operator: grok moves to its own file,
`.mcp.json` belongs to Claude alone. Recorded, not fixed here.

### A probing hazard worth generalising beyond any one ticket

**A workspace MCP server does not surface as a named top-level tool.** It
appears as the generic `call_mcp_tool` / `list_resources` / `read_resource`
triad. Grepping a tool list for the server's own tool name is a **false negative
even when the server is connected** — which is how this research produced a
confident wrong answer while its positive control passed. Anyone probing MCP
connectivity on any host should call the tool, not look for its name. This is
the worked example now shipped inside ADR-0009's amended clause.
