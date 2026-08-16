# MCP-011 — Research: what the two plugin manifests can actually express

Deliberately deferred until [[MCP-010]] merged, because the `--root` question is
downstream of board discovery. MCP-010 landed as `741ef81` (PR #40).

## The question

Three sub-questions, each answered against the installed binary, never the docs
([[MCP-009]]'s rule, endorsed by the operator):

1. Can a **plugin-installed** MCP server reach the Electron binary, or must the
   manifest assume Node on PATH?
2. Is dropping `--root` now correct — confirmed by running it?
3. What rail check stops the `plugin.json` versions drifting again?

## Method

Every claim below carries the command and its output. Per the adjudication
recorded on MCP-009, **the mechanism is verified, not a proxy**: a tool-list grep
is a proxy; *calling the tool* is the mechanism. Each probe carries a positive
control, and where a capability was found absent the control proves the probe
would have seen it.

A throwaway probe plugin was built in scratch — its own marketplace, its own
minimal MCP stdio server (`probe.cjs`) that appends `process.execPath`,
`process.versions.electron`, `argv`, `cwd` and selected env to a log on every
start and on every `tools/call`. So "did this manifest launch, and on which
runtime" is answered by the launched process itself, not by a listing.

Environment: Windows 11, 2026-08-16. `claude` 2.1.233, `codex` 0.147.0,
`grok` 0.2.111, `agy` 1.1.13, `node` v24.14.0 (`C:\Program Files\nodejs\node.exe`),
Kanmer desktop at `C:\Users\PC\AppData\Local\Programs\Kanmer\Kanmer.exe`.

**Positive control for the probe itself** — piped JSON-RPC straight into it:

```
$ printf '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}\n{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"probe_runtime"}}\n' | node probe.cjs
{"jsonrpc":"2.0","id":1,"result":{...,"serverInfo":{"name":"probe","version":"0.0.1"}}}
{"jsonrpc":"2.0","id":2,"result":{"content":[{"type":"text","text":"PROBE_RESULT {\"execPath\":\"C:\\\\Program Files\\\\nodejs\\\\node.exe\",\"electron\":null,...}"}]}}
```

---

## Finding 1 — Claude Code CAN reach the Electron binary from a plugin install

`connect.ts:36-52` uses `process.execPath` + `ELECTRON_RUN_AS_NODE=1` precisely
so the target machine needs no separate Node. The plugin manifests contradict
that with `"command": "node"`. The ticket asks which is actually true. **Both
are achievable — the plugin path is not limited to Node.**

A plugin manifest cannot *statically* name the Electron binary: it is installed
into the host's own cache with no knowledge of where (or whether) the Kanmer
desktop app exists. So the question becomes whether the manifest can express an
**override**. It can, and Claude Code expands the shell-style default form:

Manifest under test (`mcp/claude.mcp.json`):

```json
{ "mcpServers": { "probe": {
  "command": "${PROBE_CMD:-node}",
  "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/probe.cjs"],
  "env": { "ELECTRON_RUN_AS_NODE": "1" } } } }
```

Installed for real:

```
$ claude plugin marketplace add <scratch>\probe-mp
✔ Successfully added marketplace: probe-mp (declared in user settings)   EXIT=0
$ claude plugin install probe@probe-mp -y
✔ Successfully installed plugin: probe@probe-mp (scope: user)            EXIT=0
```

**(a) `PROBE_CMD` unset → falls back to `node`.** So `${VAR:-default}` is
expanded, not passed through literally:

```
$ claude mcp list
plugin:probe:probe: node C:/.../probe-mp/plugins/probe/mcp/probe.cjs - ✔ Connected
```
probe log: `"execPath":"C:\\Program Files\\nodejs\\node.exe"`,
`"ELECTRON_RUN_AS_NODE":"1"` (set from the manifest; plain Node ignores it),
`"versions_electron":null`.

**(b) `PROBE_CMD` set to the Kanmer binary → Electron runs the bundle as Node:**

```
$ $env:PROBE_CMD = "C:\Users\PC\AppData\Local\Programs\Kanmer\Kanmer.exe"
$ claude mcp list
plugin:probe:probe: C:\Users\PC\AppData\Local\Programs\Kanmer\Kanmer.exe C:/.../probe.cjs - ✔ Connected
```

**(c) The mechanism, not the listing — the tool was actually called:**

```
$ claude -p "Call the probe_runtime MCP tool (server 'probe') with no arguments
             and print its text result verbatim, nothing else." --dangerously-skip-permissions
PROBE_RESULT {"execPath":"C:\\Users\\PC\\AppData\\Local\\Programs\\Kanmer\\Kanmer.exe",
              "electron":"31.7.7","node":"20.18.0","ELECTRON_RUN_AS_NODE":"1"}
EXIT=0
```

Electron 31.7.7 / Node 20.18.0 — the desktop app's own runtime, serving MCP
tool calls to a plugin-installed server. **Answer to sub-question 1, for Claude:
the plugin path reaches Electron, via an env override the manifest declares.**

## Finding 2 — grok behaves identically, including the Electron override

grok reads `.claude-plugin/plugin.json` → `mcp/claude.mcp.json`.

```
$ grok plugin install <scratch>\probe-mp\plugins\probe --trust
Installed 1 plugin(s): probe
$ $env:PROBE_CMD = "C:\...\Kanmer.exe"
$ grok -p "Call probe_runtime on each of p_ship, p_plain, p_cwddot, p_control..." --always-approve
p_ship    → PROBE_RESULT {"execPath":"C:\\...\\Kanmer.exe","electron":"31.7.7","node":"20.18.0","ELECTRON_RUN_AS_NODE":"1"}
p_plain   → PROBE_RESULT {"execPath":"C:\\Program Files\\nodejs\\node.exe","electron":null}
p_control → PROBE_RESULT {...node.exe...}
```

`p_ship` is the exact shape this ticket intends to ship. grok expands both
`${CLAUDE_PLUGIN_ROOT}` and `${VAR:-default}`, and reached Electron.

## Finding 3 (BLOCKER, new) — codex expands NOTHING, so `.mcp.json` has never worked

`plugins/kanmer/.mcp.json` uses `${PLUGIN_ROOT}`. MCP-009 Finding 2 recorded that
`codex mcp list` displays the token unexpanded and moved on. That listing is a
proxy. Exercised as a mechanism, **the server never launches at all** — silently,
with no error surfaced to the user.

Five entries installed at once, only one of which is variable-free:

| server | `command` | `args` | launched? |
|---|---|---|---|
| `p_pluginroot` | `node` | `${PLUGIN_ROOT}/mcp/probe.cjs` | **no** |
| `p_codexroot` | `node` | `${CODEX_PLUGIN_ROOT}/mcp/probe.cjs` | **no** |
| `p_clauderoot` | `node` | `${CLAUDE_PLUGIN_ROOT}/mcp/probe.cjs` | **no** |
| `p_cmddefault` | `${PROBE_CMD:-node}` | *(absolute path)* | **no** |
| `p_control` | `node` | *(absolute path)* | **yes** |

```
$ codex exec --skip-git-repo-check --dangerously-bypass-approvals-and-sandbox \
    "List the names of every MCP tool available to you that contains the word 'probe'."
mcp__p_control__probe_runtime
```
probe log, servers that actually started: `CONTROL` only.

The control is what makes this evidence of absence rather than absence of
evidence: plugin-supplied MCP servers *do* load under `codex exec`, and the tool
*is* callable — but only when the invocation contains no `${…}` at all.

Tested twice more to close the gap:

- **Not a token-name problem.** Pointing `.codex-plugin/plugin.json`'s
  `mcpServers` at `./mcp/claude.mcp.json` (codex's claude-compat path) and
  offering `${CLAUDE_PLUGIN_ROOT}` and `${PLUGIN_ROOT}` side by side with the
  control: again only `CONTROL` launched.
- **Not an env-var handoff either.** The probe logs every env key matching
  `/PLUGIN|CODEX|AGENT/i`. For the launched server: `"pluginEnv":{}`. codex hands
  the child no `PLUGIN_ROOT`.

(`codex.exe` does contain the strings `PLUGIN_ROOT`, `PLUGIN_DATA`,
`CLAUDE_PLUGIN_ROOT` — so the concept exists in the binary, but it is not applied
to a plugin's MCP server invocation on 0.147.0.)

### The fix codex does accept: a relative `cwd`

```json
{ "command": "node", "args": ["mcp/probe.cjs"], "cwd": "." }
```

```
$ codex exec ... "List the names of every MCP tool available to you containing 'probe'."
mcp__p_control__probe_runtime
mcp__p_cwddot__probe_runtime
mcp__p_cwdempty__probe_runtime
```
probe log for `p_cwddot`:
```
"argv":["C:\\Program Files\\nodejs\\node.exe",
        "C:\\Users\\PC\\.codex\\plugins\\cache\\probe-plugins\\probe\\0.0.7\\mcp\\probe.cjs"],
"cwd":"C:\\Users\\PC\\.codex\\plugins\\cache\\probe-plugins\\probe\\0.0.7"
```

`cwd: "."` (and `cwd: ""`) resolve against **the installed plugin root**, so a
relative `args` path lands on the plugin's own copy of the bundle. No variable
required. All three launched; all three were callable.

This also confirms live that **codex's cache path is keyed by the manifest
version** (`…\probe\0.0.7`), the consequence MCP-009 Finding 6 flagged.

## Finding 4 — `cwd: "."` breaks grok, so the two files must stay different

The same `cwd: "."` entry, installed into grok:

```
p_cwddot → MCP server 'p_cwddot' handshake failed: Send message error
           Transport [xai_grok_mcp::servers::SafeTokioChildProcess] error:
           The pipe is being closed. (os error 232), when send initialize request
```

So there is **no single invocation that satisfies both** codex and
claude/grok. The repo already ships two files for two hosts; that split is
load-bearing and must stay:

| file | consumed by | working form |
|---|---|---|
| `mcp/claude.mcp.json` | claude, grok | `${CLAUDE_PLUGIN_ROOT}` + `${VAR:-default}` |
| `.mcp.json` | codex, agy | relative `args` + `cwd: "."`, **no variables** |

## Finding 5 — agy reads `.mcp.json`, not `mcp/claude.mcp.json` (corrects MCP-009)

MCP-009 Finding 4a reported agy consuming `.claude-plugin/plugin.json`. That is
true for *skills*; for MCP servers agy reads the plugin root's **`.mcp.json`**.
Proof: with `.mcp.json` holding `p_rel`/`p_cwdvar`/`p_control` while
`mcp/claude.mcp.json` held a different four, `agy plugin install` reported
`mcpServers: 3 processed` and the generated
`~/.gemini/config/plugins/probe/mcp_config.json` contained exactly the
`.mcp.json` three — copied **verbatim**, `"cwd": "${PLUGIN_ROOT}"` and all.

agy expands nothing, and resolves a relative path against the *session* cwd, not
the plugin root. The failure is loud and unambiguous:

```
$ agy -p "...call probe_runtime on p_cwddot, p_pluginroot, p_control..." \
      --dangerously-skip-permissions --add-dir <scratch>\proj --print-timeout 180s
Error: Cannot find module
  'C:\...\scratchpad\proj\${PLUGIN_ROOT}\mcp\probe.cjs'   ← literal token, joined to session cwd
p_control → PROBE_RESULT {...}                            ← control launched
```

Only `CONTROL` started. agy does copy the whole plugin tree (`mcp/probe.cjs` is
present under `~/.gemini/config/plugins/probe/`), so the file is *there* — agy
simply cannot be told where. **No committed manifest can make agy's
plugin-supplied MCP server launch.** It is broken today and stays broken under
either form, so `cwd: "."` is a strict improvement (fixes codex, no regression
for agy). agy's skills still install, and Kanmer's Connect registers agy's server
separately with an absolute path. Recorded for a follow-up ticket, not fixed here.

## Finding 6 — the runtime dependency, stated

| install path | reaches Electron? | evidence |
|---|---|---|
| Desktop **Connect** | yes, always | `connect.ts:36-52`, `process.execPath` + `ELECTRON_RUN_AS_NODE=1` |
| **claude** plugin | **yes, on opt-in** | Finding 1c — tool called on Electron 31.7.7 |
| **grok** plugin | **yes, on opt-in** | Finding 2 — same |
| **codex** plugin | **no** — Node on PATH is a hard dependency | Finding 3: no `${…}` of any form expands, so no override can be expressed |
| **agy** plugin | n/a — server cannot launch at all | Finding 5 |

So the honest answer is *both*, split by host, and the ticket's instruction —
"or, if the plugin path genuinely cannot reach the Electron binary, state that
dependency explicitly" — applies to codex only.

Chosen shapes:

- `mcp/claude.mcp.json`: `"command": "${KANMER_NODE:-node}"` with
  `"env": { "ELECTRON_RUN_AS_NODE": "1" }`. Node on PATH remains the default;
  `KANMER_NODE` is a documented, *verified* escape hatch to the Kanmer binary.
  Setting `ELECTRON_RUN_AS_NODE` unconditionally is safe — Finding 1a shows plain
  Node receives it and ignores it (`versions_electron: null`).
- `.mcp.json`: `"command": "node"`, `"args": ["mcp/kanmer-mcp.cjs"]`,
  `"cwd": "."`. **Node on PATH is a hard dependency for codex**, because codex
  expands nothing and therefore no override is expressible. Stated, not implied.

## Finding 7 — the version freeze, and what it costs

`package.json` → `0.3.2`; both `plugin.json` → `0.1.0`. Confirmed:

```
$ node -p "require('./package.json').version"
0.3.2
$ cat plugins/kanmer/.claude-plugin/plugin.json | grep version    → "0.1.0"
$ cat plugins/kanmer/.codex-plugin/plugin.json  | grep version    → "0.1.0"
```

`bundledSkillsVersion()` (`connect.ts:61-70`) reads `.claude-plugin/plugin.json`;
`skillsStatus()` (`connect.ts:188-210`) sets
`updateAvailable = installedVersion !== null && isNewerVersion(bundledVersion, installedVersion)`.
`installSkills()` (`connect.ts:166`) stamps the copy with **that same
`bundledSkillsVersion()`**. So installed and bundled are written from one
constant and `isNewerVersion` can never be true — the flag is not merely stale,
it is unreachable by construction. `Settings.tsx` renders the "Update skills"
button only when `updateAvailable` is true, so [[GUI-080]]'s merged
reconciliation (`9ac20af`, PR #41) has no way to be invoked. GUI-080's own proof
says so.

Second cost, measured in Finding 3: codex's cache path is
`…\cache\<marketplace>\<plugin>\<version>`. A frozen version means every rebuild
overwrites `0.1.0` in place rather than landing in a new directory, and
marketplace hosts that prune by version directory have nothing to prune.

## Finding 8 — `--root` is now safe to omit (to be confirmed by running it)

`packages/core/src/discover.ts` (MCP-010, `741ef81`) probes `<L>/.kanmer` then
`<L>/.worktrees/*/.kanmer` at each level, with a `.git` **directory** as a hard
boundary and a `.git` **file** traversed (linked worktrees). Neither manifest
passes `--root` today, which was wrong before MCP-010 and is right after it.
Requirement: confirm by installing the real plugin and calling `get_status`
through it — planned as the execute-phase verification, not asserted here.

## Out of scope — recorded, referenced, not fixed

[[MCP-013]] owns the marketplace root problem, all of which this research
re-encountered and worked around by passing the repo root by hand:
`pluginRoot()` (`connect.ts:55-58`) points at `plugins/kanmer` while
`.claude-plugin/marketplace.json` is at the repo root; `connect.ts:152` swallows
the non-zero exit; the packaged app ships neither marketplace JSON; and the two
marketplaces have different names (`kanmer` vs `kanmer-plugins`).

MCP-013 does **not** block this ticket's verification: `claude plugin marketplace
add <repo root>` works (MCP-009 Finding 1, re-confirmed here with the probe), so
the install can be exercised for real.

## Reversibility

Every probe install was reverted — `claude plugin uninstall` / `marketplace
remove`, `codex plugin remove` / `marketplace remove`, `grok plugin uninstall`,
`agy plugin uninstall`, each returning success, and a follow-up `plugin list` on
all four CLIs shows no `probe` entry. `git status --porcelain` shows no file
modified by this research.
