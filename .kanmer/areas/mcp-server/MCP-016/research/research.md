# Research — MCP-016

**Question.** The decision is already made by the operator: **option 2 — stop
advertising an MCP server on the hosts where the plugin cannot deliver one
(codex and Antigravity/`agy`).** Research is therefore not re-opening it; it
answers the two questions that decide *how* to implement it and *how* to prove
it:

1. Which file does each host actually read, so that removing the advertisement
   removes it for both?
2. What does a trustworthy "advertises no Kanmer MCP server" check look like on
   each host, given that `codex mcp list` is a known-lying proxy?

Everything below was established against the installed binaries — `codex-cli
0.147.0`, `agy 1.1.13`, `node v24.14.0` — on 2026-08-17, at repo commit
`6dbb284`, i.e. **before** any change in this ticket. Per ADR-0009's method
clause: the mechanism, not a proxy.

---

## Finding 1 — codex: `.codex-plugin/plugin.json` → `./.mcp.json`, and the
listing lies

A real plugin install into an isolated `CODEX_HOME`:

```
$ CODEX_HOME=<scratch>/codexhome-before codex plugin marketplace add .
Added marketplace `kanmer-plugins` from \\?\C:\Users\PC\Documents\GitHub\kanmer.
$ CODEX_HOME=<scratch>/codexhome-before codex plugin add kanmer@kanmer-plugins
Added plugin `kanmer` from marketplace `kanmer-plugins`.
Installed plugin root: …\codexhome-before\plugins\cache\kanmer-plugins\kanmer\0.3.2
```

The cache copy carries `.mcp.json` at the plugin root, plus `.codex-plugin/`,
`.claude-plugin/`, `mcp/` and 12 skill folders.

**The proxy** — `codex mcp list`:

```
Name    Command  Args                Env                         Cwd                                    Status   Auth
kanmer  node     mcp/kanmer-mcp.cjs  ELECTRON_RUN_AS_NODE=*****  …\kanmer-plugins\kanmer\0.3.2\.        enabled  Unsupported
```

`enabled`. **The mechanism** — the same install, asked to call the tool:

```
$ codex exec -C C:\Users\PC\Documents\GitHub\kanmer \
    "Call the kanmer MCP tool get_status and print its raw JSON result verbatim.
     If no kanmer MCP tool is available to you, print exactly NO_KANMER_MCP_TOOL and stop."
codex
NO_KANMER_MCP_TOOL
```

The agent has **no** kanmer tool. This is the exact discrepancy MCP-011 recorded
and that misled MCP-009: the listing reports a registration, not a running
server. Any check of this ticket's outcome that reads `codex mcp list` proves
nothing.

The 12 skills are present in the same install
(`…\kanmer\0.3.2\skills` → `kanmer-auto … kanmer-verify`), which is the half that
must survive.

## Finding 2 — `agy` reads the plugin-root `.mcp.json` regardless of the manifest, so the manifest key alone is not enough

```
$ agy plugin install ./plugins/kanmer
  [ok]    kanmer
          ✔ skills      : 12 processed
          - agents      : skipped (not found)
          - commands    : skipped (not found)
          ✔ mcpServers  : 1 processed
          - hooks       : skipped (not found)
```

`agy plugin list` records `"source": "claude-code"` — i.e. it resolved
`.claude-plugin/plugin.json`, whose `mcpServers` key points at
`./mcp/claude.mcp.json`. And yet what it wrote to
`~/.gemini/config/plugins/kanmer/mcp_config.json` is the content of the **root
`.mcp.json`**, verbatim:

```json
{ "mcpServers": { "kanmer": {
  "command": "node", "args": ["mcp/kanmer-mcp.cjs"], "cwd": ".",
  "env": { "ELECTRON_RUN_AS_NODE": "1" } } } }
```

(`mcp/claude.mcp.json` says `"command": "${KANMER_NODE:-node}"` and
`"args": ["${CLAUDE_PLUGIN_ROOT}/mcp/kanmer-mcp.cjs"]` — not what landed.)

**Implication, and it is the load-bearing one for the implementation:** deleting
`mcpServers` from `.codex-plugin/plugin.json` stops codex, but `agy` would keep
advertising the server because it never consulted a manifest for it. **The file
`plugins/kanmer/.mcp.json` itself has to go.** Confirms MCP-011's finding by
direct measurement rather than by citation.

## Finding 3 — the `agy` failure, called rather than listed

Bound to a scratch folder with no Connect registration:

```
$ agy --add-dir <scratch>/agyprobe -p "…attempt to call the kanmer server's get_status tool…"
Encountered error … server name kanmer failed to load:
Error: Cannot find module 'C:\…\scratchpad\agyprobe\mcp\kanmer-mcp.cjs'
  code: 'MODULE_NOT_FOUND'
: connection closed: calling "initialize": client is closing: EOF
```

The relative `args[0]` is joined to the **session cwd**, not the plugin root —
`agy` honours neither the manifest's location nor `"cwd": "."`. No committed
manifest content can fix this, which is why "stop advertising" is the only move
available on this host.

## Finding 4 — the verification hazard: Connect's `kanmer` shadows the plugin's `kanmer`

The first `agy` probe was run **inside the Kanmer repo** and reported a healthy
board:

```
"projectRoot": "…\.worktrees\kanmer", "exists": true, "format": 3,
"counts": { "byStage": { "backlog": 25, … "done": 131 } }
```

That is **not** the plugin's server. The repo carries Connect's Antigravity
registration at `.agents/mcp_config.json`, whose entry is *also* named `kanmer`
and uses absolute paths plus `--root …\.worktrees\kanmer` — matching the
`projectRoot` returned. Two registrations, one name; the working one wins and
makes the broken one look fine.

**Any `agy` check for this ticket must run from a directory with no Connect
registration**, or it measures Connect and reports it as the plugin. Finding 3
was re-run that way, which is how the real failure surfaced. This is a new trap,
not one MCP-011 recorded, and it is the `agy` analogue of `codex mcp list`.

## Finding 5 — nothing in the repo but `plugin:check` reads `plugins/kanmer/.mcp.json`

```
$ grep -rn "codex-plugin|plugins/kanmer/\.mcp" --include=*.ts --include=*.mjs --include=*.yml --include=*.md .
AGENTS.md:149                     # repo map (documentation only)
docs/architecture/adr/ADR-0012…:28 # historical prose
scripts/check-plugin-sync.mjs:221 # the rail
scripts/release.mjs:45            # bumps .codex-plugin/plugin.json's *version*
```

- `connect.ts` / `providers.ts` never read it; no provider writes `.mcp.json`
  (`providers.test.ts:87` asserts precisely that).
- `electron-builder.yml` packs `plugins/kanmer` **wholesale** as one
  `extraResources` entry, so removing a file inside it needs no packaging change;
  `check-updater-package.mjs` and `verify-release-assets.mjs` mention neither
  `.mcp.json` nor `mcpServers`.
- `release.mjs` bumps `.codex-plugin/plugin.json`'s `version` and is indifferent
  to its `mcpServers` key.

So the blast radius is: two plugin files, one rail script, plus documentation.

## Finding 6 — the user-facing copy is already almost right, and the manual needs nothing

- `README.md` §"Install as a plugin" already says *"For codex the plugin delivers
  the **skills only** … Register the board the ordinary way instead (the Kanmer
  desktop app's **Connect** button does it for you, or `codex mcp add`)."* Its
  framing is still "codex cannot start it", which after this ticket becomes
  "Kanmer no longer ships one for codex" — a wording correction, not new copy.
  Antigravity is absent from that section entirely and needs one sentence.
- **DOC-007's manual mentions plugins nowhere** — `grep -rn "plugin" docs/manual/*.md`
  returns no hits across all chapters. The manual's codex path is
  `connect.md`, which already tells every host's user to press **Connect**, and
  `troubleshooting.md`, which covers codex folder trust. Nothing there says or
  implies the plugin supplies codex's board, so **no manual change is warranted**;
  adding one would duplicate the README into a document that deliberately does
  not discuss plugin installs.

## Finding 7 — `AGENTS.md`'s repo map will be left stale, deliberately

`AGENTS.md:149` describes `.mcp.json` as *"codex companion ({"mcpServers":…} +
`${PLUGIN_ROOT}`) — must live at plugin root"*. That line is **already** stale —
MCP-011 replaced `${PLUGIN_ROOT}` with `"cwd": "."` and did not update it — and
deleting the file makes it describe something absent. This ticket is under a
standing instruction not to commit any `AGENTS.md` change, so it is left alone
and filed as a follow-up rather than absorbed.

---

## What this implies for the ticket

1. **Two edits, not one**: remove `mcpServers` from `.codex-plugin/plugin.json`
   *and* delete `plugins/kanmer/.mcp.json`. Either alone leaves one host still
   advertising a server that cannot run (Finding 2).
2. `mcp/claude.mcp.json` is untouched, and `plugin:check`'s rules for it stay
   exactly as they are.
3. The rail inverts: where `plugin:check` asserted `.mcp.json`'s shape, it must
   now assert its **absence** and the absence of an `mcpServers` key in the codex
   manifest, with the reason inline so a future edit that re-adds either is a
   deliberate act.
4. Verification is: **codex** — `codex exec` through a fresh plugin install must
   report no kanmer tool *and* the 12 skills; **agy** — `agy plugin install` must
   report `mcpServers: skipped (not found)` and a session bound to a
   Connect-free folder must find no `kanmer` server; **Connect** — the project
   `.codex/config.toml` registration must still answer a real `get_status` call.
   Machine state (`~/.gemini/config`, `~/.gemini/skills`) is snapshotted before
   and diffed after.
