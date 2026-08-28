Kanmer is most useful when your coding agent can read and move tickets itself,
rather than you relaying between a chat window and a board. Connecting an agent
takes one click per host.

## Doing it

Open **Settings → Connect**. You will see a row per supported host, each with a
**Connect** button:

| Host | Notes |
|---|---|
| Codex | |
| Claude Code | |
| opencode | |
| Grok CLI | |
| Antigravity | User-scoped native plugin; background sessions use `--add-dir` — see below |

Press **Connect** on the one you use. Two things happen: Kanmer registers this
project's board with that host's agent-tool client, and it installs Kanmer's
skills for that host so the agent knows the working practices, not just the
tools. The row reports what it wrote.

Grok and Antigravity use native `kanmer` plugins installed in the user's host
profile, so each affects every workspace for that user. Connect warns before
this user-scoped change, preflights the CLI/runtime, validates the plugin,
requires a functional host proof before migration cleanup, and then retires
only legacy Kanmer project state. Other providers keep their project-scoped
registration or skill paths; connecting them does not change your global
configuration.

## Restart the agent afterwards

Kanmer will not remind you, so remember it here: an agent that was already
running started before the registration existed and will not see it. Quit the
agent and start it again in the same project.

The same is true after Kanmer updates itself. An agent holding a connection is
running the version it started with; restart it or it keeps reading your board
with the old code.

## Connect a private board to ChatGPT

OpenAI Secure MCP Tunnel can let a ChatGPT developer-mode app reach Kanmer
without a public MCP endpoint or an inbound firewall rule. The separate
`tunnel-client` process connects
outbound to OpenAI and starts Kanmer's existing stdio server as its private MCP
target. Kanmer never stores the API key. The GUI has a separate **Settings →
OpenAI tunnel** surface that stores non-secret profile metadata and manages the
same long-lived runtime alias used by the manual commands below.

You need an OpenAI tunnel associated with the intended Platform organization
and ChatGPT workspace, a runtime API key whose principal has **Tunnels Read +
Use**, ChatGPT developer-mode access, and outbound HTTPS access to
`api.openai.com:443`. Download `tunnel-client` from the link in Platform tunnel
settings or OpenAI's current release; keep the API key out of project files.

Create the runtime key at **OpenAI Platform → Organization settings → API
keys**, in the same organization as the tunnel. This is a normal organization
API key whose principal has **Tunnels Read + Use**, not an Admin API key. Admin
keys are needed only for programmatic tunnel creation, editing and deletion.
The Platform shows a new key once: put it in the process environment, never in
the profile, a command committed to source control, or a chat message. Revoke
and replace a key immediately if it is exposed.

The installed app already contains a stable launcher at
`%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd`. Point the tunnel at that launcher,
not at a versioned `Kanmer.exe` or bundle path: the installer keeps the launcher
stable while replacing the runtime behind it. Because tunnel-client 0.0.11
parses a Windows command string before it starts MCP, use a small
operator-private PowerShell wrapper to preserve the project working directory.
For example, save this outside the project as `kanmer-tunnel-mcp.ps1`:

```powershell
$env:KANMER_PROVIDER_CWD = "C:/path/to/project"
$env:KANMER_BOARD_BRANCH = "<saved-board-branch>"
& "$env:LOCALAPPDATA\Kanmer\bin\kanmer-mcp.cmd"
exit $LASTEXITCODE
```

Substitute the project path and the exact board branch saved in **Settings →
Git** (the default is `kanmer-board`). Then substitute your paths, profile,
alias, environment-variable name and tunnel id:

```powershell
$env:CONTROL_PLANE_API_KEY = "<runtime-api-key>"

$tunnelClient = "C:/path/to/tunnel-client.exe"
$mcpCommand = 'powershell.exe -NoProfile -NonInteractive -File "C:/private/path/kanmer-tunnel-mcp.ps1"'

& $tunnelClient runtimes connect `
  --alias kanmer-board `
  --profile kanmer-local `
  --tunnel-id <tunnel-id> `
  --runtime-api-key env:CONTROL_PLANE_API_KEY `
  --mcp-command $mcpCommand `
  --tunnel-client-bin $tunnelClient

& $tunnelClient doctor --profile kanmer-local --explain
& $tunnelClient runtimes status kanmer-board --json
```

`runtimes connect` is the supported long-lived local supervisor. Do not report
the tunnel ready from `doctor` alone: status must say the process is running,
healthy and ready. Use the corresponding runtime stop/remove command before
retiring an alias; do not kill an unrelated process or delete the remote tunnel.

In the GUI, open **Settings → OpenAI tunnel**, enter the runtime alias, profile name, tunnel id,
`tunnel-client` path, credential environment-variable name, and loopback health
address, then save. The address is a validated, non-secret expectation; the GUI
does not rewrite `tunnel-client`'s profile file or claim a live listener, so
distinct ports must still be configured in the client profile by the operator.
The GUI uses `runtimes connect`, `runtimes status`, `runtimes stop`, and
`runtimes rm`. The runtime alias and client profile may have different names.
**Connect runtime** creates or reuses the alias and **Check
status** reports ready only when the managed process is running, healthy, and
ready. The credential is passed as `--runtime-api-key env:<NAME>`, so its value
is never persisted or rendered by Kanmer. A downloaded app update marks a ready
runtime for reconnect; quitting Kanmer leaves the long-lived managed runtime
running. Stop and remove affect only the local alias and never delete the remote
tunnel. In ChatGPT select the discovered Tunnel app. Do not use Custom
Connector: that screen requests OAuth endpoints Kanmer does not implement.
Cloudflare settings are a different provider path and are not used here.

Disabling a saved profile stops and confirms its managed runtime first. Project
identity reconciliation removes the old local alias before transferring the
profile, after which Connect binds a new runtime to the current board and source
roots. Check status can inspect an existing runtime without the runtime API key;
the key is required when connecting or reconnecting.

Use forward slashes inside `$mcpCommand`, including on Windows. Version 0.0.11's
command parser treats backslashes as escapes; a normal Windows path such as
`C:\Users\...` becomes invalid during its executable preflight. The profile
it creates under `%APPDATA%\tunnel-client` refers to the API key as an
`env:<NAME>` reference; it does not need the key written into YAML.

Keep the managed runtime connected while creating the ChatGPT app and whenever
the app uses Kanmer. In ChatGPT's developer-mode app settings, choose **Tunnel** and
select the tunnel associated with that workspace. Keep the local operator UI
on its default loopback address. Restart the tunnel after a Kanmer update,
because the installed MCP process is replaced during the update.

This path was exercised successfully on Windows with `tunnel-client` 0.0.11.
Your own tunnel identifier, workspace, and credentials are private operational
state and must not be committed. The packaged MCP smoke separately verifies all
40 tools and their file mutations, including the policy-bound dispatch/list/cancel surface when an operator explicitly enables it.

### More than one project

Use one OpenAI tunnel, one local profile, one private wrapper, one runtime alias,
and one ChatGPT app per Kanmer project. Reuse the installed stable launcher and
runtime API key; change the tunnel id, profile name, wrapper project path and
alias:

```powershell
$profile = "another-project"
$alias = "another-project"
$mcpCommand = 'powershell.exe -NoProfile -NonInteractive -File "C:/private/path/another-project-kanmer-mcp.ps1"'

& $tunnelClient runtimes connect `
  --alias $alias `
  --profile $profile `
  --tunnel-id <another-project-tunnel-id> `
  --runtime-api-key env:CONTROL_PLANE_API_KEY `
  --mcp-command $mcpCommand `
  --tunnel-client-bin $tunnelClient
```

Each wrapper sets its own `KANMER_PROVIDER_CWD` and `KANMER_BOARD_BRANCH`. The stable launcher discovers
either a direct `.kanmer` folder or the GUI-managed board worktree from that
project root. List configured profiles with `tunnel-client profiles list` and
managed aliases with `tunnel-client runtimes list --json`.
Profiles default their local health/admin surface to `127.0.0.1:8080`, so run
one at a time or assign each profile a distinct `health.listen_addr` before
running them concurrently.

#### Named endpoint registry

Every Kanmer MCP process serves exactly one project — the board it was started
with — and no request can point it at another path. To keep an eye on several
projects at once, name their endpoints in a small registry file and any of
those servers will report all of them through the read-only `list_projects`
tool:

```json
{
  "schema": 1,
  "endpoints": {
    "kanmer": { "boardRoot": "C:/path/to/kanmer/.worktrees/kanmer", "repoRoot": "C:/path/to/kanmer", "boardBranch": "kanmer-board", "policy": "main-only" },
    "another-project": { "boardRoot": "C:/path/to/another/.worktrees/kanmer" }
  }
}
```

The file lives at `~/.kanmer/endpoints.json`, or wherever
`KANMER_ENDPOINT_REGISTRY` (an absolute path in the server's environment) says
— an operator or the Kanmer app decides that when the server is started, never
an agent request. Names are lowercase (`a-z`, `0-9`, `.`, `_`, `-`); paths must
be absolute. For each name the tool reports the project's logical identity,
where it physically is, its board sync state, the declared `policy`, health
(`ok`, `unassigned` for a board that has not received its identity yet,
`missing-board`, or `invalid` for a malformed entry — never silently dropped),
and the controllers and workspaces currently holding tickets there. The
answering server marks which entry is its own. Everything across projects is
observational: writing to another project means connecting to that project's
endpoint and passing its `project_id` as `expected_project`; sending another
project's id to this one is refused with `WRONG_PROJECT`. The Kanmer app reads
and edits the same file from **Settings → Projects** (see **Settings**), so a
name you add there is what `list_projects` reports. Combining boards behind one tunnel is discouraged:
each exposes the same Kanmer tool names, leaving the remote agent without a
clear board-selection boundary.

### Instructions for the remote agent

ChatGPT discovers Kanmer's tool names, schemas and descriptions through MCP,
but it does not receive the Kanmer skills installed into local coding agents.
Give the app this compact operating instruction:

> Start with `get_status`, `list_board`, and `list_items`. Keep each piece of
> work in a ticket. Before every move call `get_doc_gates`, cross at most one
> stage boundary, and write required ticket documents with `set_ticket_doc`.
> Use `append_scratch` for working notes, concurrency tokens from reads when
> updating shared state, and `archived: true` instead of permanent deletion.

Remote calls use the same tools as a local agent. `create_item` exclusively
creates the ticket's Markdown/frontmatter file; `update_item` atomically
rewrites it; `move_item` checks the configured gates before changing its
frontmatter; and `set_ticket_doc` atomically writes Markdown inside the ticket
folder. Each mutation also appends an activity entry. The GUI sees those file
changes through its existing watcher—there is no second remote database or
sync layer.

### Cloudflare does not make this tunnel provider-neutral

The OpenAI Windows client package may include `cloudflared.exe`. In the tested
0.0.11 package it is a pinned transport companion managed by `tunnel-client`:
the outer client still authenticates to OpenAI's `/v1/tunnel/*` control plane,
uses an OpenAI tunnel id, and generates the token file required by its
Cloudflare companion. It does not produce a stable MCP URL that can be pasted
into another provider.

Kanmer itself remains provider-neutral over stdio. Another provider can use the
same server if it can launch stdio MCP locally or supplies its own private-MCP
bridge. Reusing Cloudflare independently would be a separate deployment: it
would require an HTTP MCP transport, a hostname, TLS and authentication, and
must not be inferred from the presence of the bundled executable.

## Antigravity: bind the folder

Connect installs the user-scoped native Kanmer plugin (`agy plugin install`),
which owns its skills and root `mcp_config.json`. Older `.agents/mcp_config.json`
and `.agents/skills/` files are migration residue; Connect removes only Kanmer's
owned entries after a functional plugin proof.

An interactive `agy` session reads the plugin's MCP and skills only when bound to
the workspace folder:

```sh
agy --add-dir /path/to/your/project     # binds for this session, stores nothing
agy --new-project                        # binds by creating a project for the folder
```

A plain `agy` started inside the project does **not** bind it. For background
dispatch Kanmer therefore always passes `--add-dir <project> -p <prompt>`; it
never relies on cwd, creates a persistent project id, or uses `--new-project`.

Two ways to tell it worked, both worth knowing because the obvious check is
misleading: ask the agent to use a Kanmer tool and see whether it comes back with
real board data. Do not go looking for a tool named after Kanmer in a tool list —
a connected workspace MCP server does not appear under its own name there.

The read-only local CLI probe used `agy` 1.1.14: `agy plugin validate
plugins/kanmer` reported 12 skills and 1 MCP. A real install and bound
`get_status` tool call require an authorized disposable host and remain
INCONCLUSIVE when that evidence is unavailable. The Antigravity IDE has not
been tested, so nothing here is a claim about it.

## When it does not work

If Kanmer cannot complete the registration it says so and shows you what it was
trying to do, with a **Copy** button. For hosts driven by a command line, that
is the exact command — paste it into a terminal in your project and you are
connected. For hosts configured through a file, it names the file to edit.

Two host-specific things worth knowing:

- **Codex** only loads a project's configuration for folders you have told it to
  trust. If Codex ignores the registration, trust the folder explicitly; Kanmer
  warns you when it can tell this applies.
- **Skills are replaced, not merged.** Connecting, or pressing **Update skills**
  when Kanmer offers it, overwrites the Kanmer-owned skill folders in your
  project. If you have edited one by hand, that edit is discarded — and Kanmer
  names the folders it replaced so you can see what went.

## Keeping the skills current

When the copy of the skills in your project is older than the one your Kanmer
ships, the row shows both versions and an **Update skills** button. Nothing
breaks if you leave it; the newer skills simply describe the newer app.

## Disconnecting

**Disconnect** removes the registration for that host from this project. It does
not touch your board, your tickets, or anything outside the project.
