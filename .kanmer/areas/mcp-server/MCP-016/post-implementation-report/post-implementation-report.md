# Post-implementation report — MCP-016

**Shipped:** option 2 — the plugin stops advertising an MCP server on codex and
Antigravity (`agy`). Skills continue to ship to both. Claude Code and grok are
untouched.

**Profile shipped under: `fix`, changed from `spike`.** `spike` reaches Done on
`research` alone; this ticket ships a deleted file, a manifest key, an inverted
rail assertion, an amended requirement and changed README copy, so `spike` would
have let it reach Done with **no `proof`** — and a command log from calling a
tool on the host is precisely what this ticket's own verification rule demands.
`fix` is stricter on both boundaries, not looser, so this is a gate added rather
than dodged. Argued in `plan.md` §Profile.

## File changes

| File | Change | Why |
|---|---|---|
| `plugins/kanmer/.mcp.json` | **deleted** | The file `agy` reads for MCP at the plugin root, **regardless of any manifest**. Removing only the codex manifest key would leave Antigravity still advertising it. |
| `plugins/kanmer/.codex-plugin/plugin.json` | `mcpServers` key removed; a `_comment` array added saying skills-only and why | codex follows this key. The comment is where a future contributor lands first, so the reasoning and the ticket id live in the file, not only in the FRD. Empirically harmless: `codex plugin add` accepted the manifest with it. |
| `scripts/check-plugin-sync.mjs` | rail inverted for the codex side; `mcp/claude.mcp.json` rules kept and one added | Four assertions, each demonstrated failing (below). |
| `docs/functional/frd/FRD-012-connect.md` | R2 (codex + Antigravity bullets), **R6** (matrix rows + the reasoning, now three numbered consequences), R7 (narrowed to the one surviving config, and explicitly *not* a constraint on Connect's registrations), and the closing "Open work" line | The governing requirement. |
| `README.md` | §"Install as a plugin": lead paragraph, codex paragraph reworded, Antigravity paragraph added, the "either plugin or manual registration" note qualified per host | A codex or Antigravity user must read "skills from the plugin, board from Connect" as the intended setup, not as a limitation. |

**Not changed, deliberately:** `plugins/kanmer/mcp/claude.mcp.json` (works for
Claude Code and grok — MCP-011 proved it by a `get_status` answering from
`electron: 31.7.7`); `docs/manual/` (19 chapters, and `grep -rn "plugin"` over
all of them returns **nothing** — the manual's codex path is `connect.md`, which
already says press Connect, so there was nothing stale to fix and adding a
plugin discussion would duplicate the README into a document that deliberately
does not have one); `AGENTS.md` (`git diff AGENTS.md` empty — its repo-map line
goes stale and is filed as **DOC-009**).

## Rail assertions, each demonstrated failing

Run in a clean detached clone with its own `node_modules` and its own
`npm run build` — `plugin:check` refuses inside a linked worktree by design
(MCP-007), and the refusal is right: the bundle-byte half is meaningless there.

| Reverted state | `plugin:check` says |
|---|---|
| `plugins/kanmer/.mcp.json` restored | `plugins/kanmer/.mcp.json exists, and must not — antigravity/agy copies it verbatim regardless of what any manifest points at…` — exit 1 |
| `mcpServers: "./.mcp.json"` put back in the codex manifest | `.codex-plugin/plugin.json: declares mcpServers "./.mcp.json", and must not…` — exit 1 |
| `skills` key dropped from the codex manifest | `skills is "undefined", expected "./skills/" — the skills are what this plugin delivers on every host and must not be dropped with the server` — exit 1 |
| `mcp/claude.mcp.json` removed | `missing plugins/kanmer/mcp/claude.mcp.json — Claude Code and grok DO run a plugin-supplied server…` — exit 1 |

Restored after each; the clean tree passes:
`plugin-sync OK — 30 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.2`.

The last two are new safety in the other direction: with the codex side now
asserted *absent*, nothing else was left asserting that the plugin still
delivers what it does deliver.

## Host verification — by calling a tool, never a listing

`codex mcp list` reporting `enabled` for a server that gives the agent zero
tools is the proxy that hid this defect and misled MCP-009. Every claim below is
a tool call.

**codex, before** (isolated `CODEX_HOME`, real marketplace + plugin install off
`6dbb284`):

```
codex mcp list  →  kanmer  node  mcp/kanmer-mcp.cjs  …\kanmer\0.3.2\.  enabled
codex exec "…call get_status… else print NO_KANMER_MCP_TOOL"  →  NO_KANMER_MCP_TOOL
```

**codex, after** (fresh `CODEX_HOME`, installed from this branch's tree):

```
codex mcp list  →  No MCP servers configured yet.
codex exec  →  NO_KANMER_MCP_TOOL
               kanmer-auto … kanmer-verify   Count: 12
```

The listing now agrees with the mechanism, which is itself the change; the 12
skills are the positive control that the plugin still installs something.

**`agy`, before** → `✔ mcpServers : 1 processed`, and the server, *called* from a
Connect-free folder: `Cannot find module '<session cwd>\mcp\kanmer-mcp.cjs'`.
**`agy`, after** → `✔ skills : 12 processed` / `- mcpServers : skipped (not
found)`, and in the same folder: `NO_KANMER_MCP_SERVER`, 12 kanmer skills, with
the pre-existing variable-free control server `zzqxprobesrv` still connected —
so the absence is the plugin's, not a dead session.

**Connect still answers** (the positive control for the whole exercise —
default `CODEX_HOME`, no plugin installed there, so only
`<repo>/.codex/config.toml` can answer):

```
codex exec "Call the kanmer MCP tool get_status…"
→ { "projectRoot": "…\.worktrees\kanmer", "exists": true, "format": 3,
    "counts": { "byType": { "ticket": 161 } }, … }
```

**Machine state restored and the restore verified:** `~/.gemini/config` and
`~/.gemini/skills` snapshotted before the `agy` installs; after `agy plugin
uninstall kanmer`, `diff -r` against both snapshots is **empty** and `agy plugin
list` reports `No imported plugins.` The codex probes ran entirely in scratch
`CODEX_HOME` directories; `~/.codex/config.toml` holds no kanmer marketplace or
MCP entry, exactly as before.

## Governing docs

- **FRD-012 R6** — amended, as the ticket required. The matrix rows for codex
  and `agy` now read *"n/a — no server is advertised (MCP-016). Skills only"*,
  each with the command that established it. The three consequences are: one
  bundled MCP config rather than two; the decision with its three-part reasoning
  (no `${…}` expansion on either host; unrescuable, because locating the script
  and finding the board need mutually exclusive working directories; **redundant
  in principle**, because Connect already writes the working codex registration);
  and a tool listing is not a launched server — including the new `agy` trap
  (below), which R6 now names.
- **FRD-012 R2** — the codex bullet's "MCP-016 owns whether the plugin should
  keep advertising that server at all" replaced by the outcome; the Antigravity
  bullet gains the same.
- **FRD-012 R7** — narrowed to `mcp/claude.mcp.json`, with a sentence making
  explicit that it constrains what a plugin copied into a *global* host cache may
  assume, and says nothing about Connect's project-scoped, correctly
  `--root`-pinned registrations. Prevents the obvious misreading now that only
  one config remains.
- **ADR-0009** — method clause *followed*, not amended: established against the
  installed binaries, positive control present, mechanism verified rather than a
  proxy.
- **No new ADR.** What changed is *what the product ships on which host* — a
  requirement, whose home is the R6 matrix it amends. The principle ("the plugin
  does not advertise what it cannot deliver") is ADR-0009's evidence rule applied
  to R6's measurements, not a new axis of decision; MCP-011 made the same call
  for the same reason. Also avoids `check-doc-numbering`, which has caught three
  ADR collisions today — a benefit, not the reason.

## Discovered, and worth more than the change itself

**On `agy`, the plugin's server and Connect's are both named `kanmer`.** The
first probe ran inside this repo, where Connect's `.agents/mcp_config.json`
entry exists, and returned a perfectly healthy board — from *Connect's* server,
with `projectRoot` pointing at `.worktrees/kanmer` and absolute paths. The
broken plugin registration looked like it worked. This is the `agy` analogue of
`codex mcp list` and it is **not** something MCP-011 recorded. Every `agy` probe
here was re-run from a Connect-free folder, and FRD-012 R6.3 now states the trap
so the next person does not measure Connect and report the plugin.

## Risks and follow-ups

- **DOC-009** (filed) — `AGENTS.md`'s repo map still names the deleted
  `.mcp.json` and still shows `${PLUGIN_ROOT}`, stale since MCP-011.
- **Reversibility** — restoring the entry is two small edits, and the rail's own
  failure messages name the ticket to re-decide. R6 states what a host would have
  to gain for it to be worth doing: expansion of a plugin-root token in `args`
  *while* leaving the working directory at the workspace.
- **`kanmerGit.test.ts`** (GUI-085) did not flake in this run; `npm test` exited
  0 with 46/46 in the scripts suite and every workspace green.
- **MCP-013** merged as `f5c370e` before this work started. `git fetch && git
  rebase origin/main` reported *"Current branch … is up to date"* at `b653a33`
  on `6dbb284`; both plugin manifests and both marketplace manifests re-read
  post-rebase, and `plugin:check`'s marketplace section passes
  (`marketplaces: kanmer, kanmer-plugins — both packed into the app`).

## What `kanmer-verify` should run on merged main

1. `npm run plugin:check` from the **main checkout** (not a worktree).
2. Confirm `plugins/kanmer/.mcp.json` is absent and `.codex-plugin/plugin.json`
   has no `mcpServers` key on merged main.
3. Re-run the codex probe against merged main in a scratch `CODEX_HOME`:
   `codex mcp list` empty, `codex exec` → `NO_KANMER_MCP_TOOL` **and** 12 skills.
4. The positive control: `codex exec` with the default `CODEX_HOME` in the repo
   → `get_status` answers with a real board.
