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
| Antigravity | No background dispatch, and `agy` needs the folder bound — see below |

Press **Connect** on the one you use. Two things happen: Kanmer registers this
project's board with that host's agent-tool client, and it installs Kanmer's
skills for that host so the agent knows the working practices, not just the
tools. The row reports what it wrote.

Everything is written **inside this project**. Connecting does not change your
global configuration or affect your other repositories.

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
target. Kanmer does not store the tunnel id or API key and does not supervise
the tunnel process.

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

The installed app already contains everything needed for the MCP command. In
PowerShell, substitute your paths and tunnel id:

```powershell
$env:CONTROL_PLANE_API_KEY = "<runtime-api-key>"
$env:ELECTRON_RUN_AS_NODE = "1"

$tunnelClient = "C:/path/to/tunnel-client.exe"
$mcpCommand = '"C:/Users/<you>/AppData/Local/Programs/Kanmer/Kanmer.exe" "C:/Users/<you>/AppData/Local/Programs/Kanmer/resources/mcp/kanmer-mcp.cjs" --root "C:/path/to/project/.worktrees/kanmer" --repo-root "C:/path/to/project"'

& $tunnelClient init `
  --sample sample_mcp_stdio_local `
  --profile kanmer-local `
  --tunnel-id <tunnel-id> `
  --mcp-command $mcpCommand

& $tunnelClient doctor --profile kanmer-local --explain
& $tunnelClient run --profile kanmer-local
```

Use forward slashes inside `$mcpCommand`, including on Windows. Version 0.0.11's
command parser treats backslashes as escapes; a normal Windows path such as
`C:\Users\...` becomes invalid during its executable preflight. The profile
it creates under `%APPDATA%\tunnel-client` refers to the API key as
`env:CONTROL_PLANE_API_KEY`; it does not need the key written into YAML.

Keep `tunnel-client run` alive while creating the ChatGPT app and whenever the
app uses Kanmer. In ChatGPT's developer-mode app settings, choose **Tunnel** and
select the tunnel associated with that workspace. Keep the local operator UI
on its default loopback address. Restart the tunnel after a Kanmer update,
because the installed MCP process is replaced during the update.

This path was exercised successfully on Windows with `tunnel-client` 0.0.11.
Your own tunnel identifier, workspace, and credentials are private operational
state and must not be committed. The packaged MCP smoke separately verifies all
30 tools and their file mutations.

### More than one project

Use one OpenAI tunnel, one local profile, and one ChatGPT app per Kanmer
project. Reuse the installed Kanmer runtime, MCP bundle and runtime API key;
change the tunnel id, profile name, `--root`, and `--repo-root`:

```powershell
$projectRoot = "C:/Users/<you>/Documents/GitHub/another-project"
$boardRoot = "$projectRoot/.worktrees/kanmer"
$profile = "another-project"
$mcpCommand = '"C:/Users/<you>/AppData/Local/Programs/Kanmer/Kanmer.exe" "C:/Users/<you>/AppData/Local/Programs/Kanmer/resources/mcp/kanmer-mcp.cjs" --root "' + $boardRoot + '" --repo-root "' + $projectRoot + '"'

& $tunnelClient init `
  --sample sample_mcp_stdio_local `
  --profile $profile `
  --tunnel-id <another-project-tunnel-id> `
  --mcp-command $mcpCommand
```

If `.kanmer` is directly inside the project rather than the GUI-managed board
worktree, set `$boardRoot = $projectRoot`. List configured profiles with
`tunnel-client profiles list`, and select one with `run --profile <name>`.
Profiles default their local health/admin surface to `127.0.0.1:8080`, so run
one at a time or assign each profile a distinct `health.listen_addr` before
running them concurrently. Combining boards behind one tunnel is discouraged:
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

## "No background dispatch"

A host marked **· no background dispatch** connects and receives skills exactly
like the others; the one thing Kanmer cannot do is start it for you in the
background to work a ticket, so it does not appear when you dispatch a task.
Today that is Antigravity alone; the other four hosts can be dispatched to.

The badge used to read "register-only", which was wrong twice over: Antigravity
does get the skills as well as the registration, and it does not appear in the
dispatch menu for a different reason than the badge suggested — see below.

## Antigravity: bind the folder

Connecting Antigravity writes two things into your project —
`.agents/mcp_config.json` (the board) and `.agents/skills/` (the skills, the same
tree opencode reads). Both are the right files in the right places, and **`agy`
reads them only in a session bound to this folder**:

```sh
agy --add-dir /path/to/your/project     # binds for this session, stores nothing
agy --new-project                        # binds by creating a project for the folder
```

A plain `agy` started inside the project does **not** see them. It binds instead
to its own default project, which has no folder attached at all, so your working
directory makes no difference — and neither does trusting the workspace or the
folder being a git repository. Kanmer does not yet establish that binding for
you; until it does, add one of the flags above, or Antigravity will start with
neither the board nor the skills and give no sign that anything is missing.

Two ways to tell it worked, both worth knowing because the obvious check is
misleading: ask the agent to use a Kanmer tool and see whether it comes back with
real board data. Do not go looking for a tool named after Kanmer in a tool list —
a connected workspace MCP server does not appear under its own name there.

This was measured against the `agy` command-line tool, version 1.1.13. The
Antigravity IDE has not been tested, so nothing here is a claim about it.

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
