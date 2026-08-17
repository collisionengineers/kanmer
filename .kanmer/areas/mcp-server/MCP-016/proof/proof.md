# Proof — MCP-016

Verified on **merged `main` = `8f4bdc1`** ("fix(plugin): stop advertising an MCP
server on codex and Antigravity (MCP-016) (#62)"), squash-merged 2026-08-17
00:55:56Z from PR <https://github.com/collisionengineers/kanmer/pull/62>.

Everything below ran in a **clean detached clone** of merged main
(`git fetch https://github.com/collisionengineers/kanmer.git main && git reset
--hard FETCH_HEAD` → `8f4bdc1`), with its own `node_modules` and its own
`npm run build`. `plugin:check` refuses inside a linked worktree by design
(MCP-007) and the refusal is correct — the bundle-byte half is meaningless
there — so the clone is the honest place to run it and the main checkout was
never disturbed.

## 1. What actually landed

```
$ ls plugins/kanmer/.mcp.json
ls: cannot access 'plugins/kanmer/.mcp.json': No such file or directory

$ node -e "…read both manifests…"
codex  mcpServers = undefined                  | skills = "./skills/"
claude mcpServers = "./mcp/claude.mcp.json"    | skills = "./skills/"
```

The codex manifest declares no MCP config; the file `agy` reads is gone; the
Claude/grok config is intact; both manifests still declare their skills.

## 2. Rail, on merged main

| Command | Result |
|---|---|
| `npm test` | **exit 0** — vitest `11 passed (11)` / `249 passed (249)` and `24 passed (24)` / `276 passed (276)`; scripts suite `tests 46, pass 46, fail 0`. No `kanmerGit.test.ts` flake (GUI-085) in this run. |
| `npm run typecheck` | clean across `@kanmer/core`, `@kanmer/mcp-server`, `@kanmer/ui`, `@kanmer/gui` |
| `npm run plugin:check` | `marketplaces: kanmer, kanmer-plugins — both packed into the app` / `plugin-sync OK — 30 tools match, bundle bytes match, 12 skill frontmatters parse, manifests at v0.3.2` |
| `npm run check:manual` | `manual: up to date (19 chapters)` |
| `npm run verify:agents-block` | `28/28 checks passed` |

## 3. codex — the claim, established by calling a tool

The ticket's binding rule: **check by calling a tool, not by reading a config
listing.** `codex mcp list` printing `enabled` for a server that gives the agent
zero tools is the proxy that hid this defect and misled MCP-009.

A real plugin install from merged main, into a scratch `CODEX_HOME`:

```
$ CODEX_HOME=<scratch>/codexhome-main codex plugin marketplace add .
Added marketplace `kanmer-plugins` from \\?\…\railclone.
$ CODEX_HOME=<scratch>/codexhome-main codex plugin add kanmer@kanmer-plugins
Added plugin `kanmer` from marketplace `kanmer-plugins`.
Installed plugin root: …\codexhome-main\plugins\cache\kanmer-plugins\kanmer\0.3.2

$ ls -a …\kanmer\0.3.2
.claude-plugin  .codex-plugin  mcp  skills          ← no .mcp.json in the cache copy
```

**The listing** (recorded only to show it now agrees with the mechanism):

```
$ codex mcp list
No MCP servers configured yet. Try `codex mcp add my-tool -- my-command`.
```

**The mechanism** — the same install, asked to call the tool and to name its
skills:

```
$ codex exec -C C:\Users\PC\Documents\GitHub\kanmer \
    "(1) Try to call the kanmer MCP tool get_status. If no kanmer MCP tool is
     available to you, print exactly NO_KANMER_MCP_TOOL. (2) Print the count of
     skills available to you whose name starts with kanmer-, then list them."
codex
NO_KANMER_MCP_TOOL

12

kanmer-auto  kanmer-closeout  kanmer-docs   kanmer-execute  kanmer-groom
kanmer-plan  kanmer-report    kanmer-research kanmer-review kanmer-setup
kanmer-tickets  kanmer-verify
```

**No Kanmer MCP server, and all 12 skills** — the skills being the positive
control that the plugin still installs something and that the session is live.

**Before/after contrast, both by tool call.** The same probe against the parent
tree (`6dbb284`, pre-change) reported:

```
codex mcp list  →  kanmer  node  mcp/kanmer-mcp.cjs  …\kanmer\0.3.2\.  enabled
codex exec      →  NO_KANMER_MCP_TOOL
```

Same absence of tools, opposite listing. The change is that the listing stopped
lying.

## 4. `agy` — the same claim, on the host that ignores manifests

```
$ agy plugin install ./plugins/kanmer          # from merged main
  [ok]    kanmer
          ✔ skills      : 12 processed
          - mcpServers  : skipped (not found)

$ ls ~/.gemini/config/plugins/kanmer/mcp_config.json
ls: cannot access … : No such file or directory
```

Called, from a folder with **no Connect registration** (see the hazard below):

```
$ agy --add-dir <scratch>/agyprobe -p "(1) list connected MCP servers (2) call
    the kanmer server's get_status, else print NO_KANMER_MCP_SERVER (3) count
    kanmer- skills"
1. Connected MCP Servers:  `sequential-thinking`, `zzqxprobesrv`
2. NO_KANMER_MCP_SERVER
3. Count of `kanmer-` skills: 12
```

`zzqxprobesrv` is a variable-free local server in that folder — the **positive
control**: MCP loading works in that session, so `kanmer`'s absence is the
plugin's and not a dead handshake. Against the pre-change tree the same probe
produced the server *and* its failure:

```
server name kanmer failed to load:
Error: Cannot find module 'C:\…\agyprobe\mcp\kanmer-mcp.cjs'  (MODULE_NOT_FOUND)
: connection closed: calling "initialize": client is closing: EOF
```

**The hazard this probe exists to avoid.** The first `agy` probe of this ticket
ran *inside* the Kanmer repo and returned a perfectly healthy board — from
**Connect's** `.agents/mcp_config.json` server, which is *also* named `kanmer`.
Two registrations, one name; the working one wins and makes the broken one look
fine. FRD-012 R6.3 now records this trap. It is the `agy` analogue of
`codex mcp list` and it was not previously known.

## 5. The positive control for the whole exercise — Connect still answers

Default `CODEX_HOME` (the user's real one, which has **no** kanmer plugin
installed — `grep -c "mcp_servers.kanmer\|marketplaces.kanmer" ~/.codex/config.toml`
→ `0`), so only `<repo>/.codex/config.toml` can answer:

```
$ codex exec -C C:\Users\PC\Documents\GitHub\kanmer \
    "Call the kanmer MCP tool get_status and print projectRoot, exists and counts.byType."
{
  "projectRoot": "C:\\Users\\PC\\Documents\\GitHub\\kanmer\\.worktrees\\kanmer",
  "exists": true,
  "counts": { "byType": { "ticket": 162 } }
}
```

A real board, 162 tickets, through Connect's registration — the same binary and
the same tool that reports `NO_KANMER_MCP_TOOL` through the plugin. **codex users
get skills from the plugin and MCP from Connect, and the second half still
works.**

## 6. Rail assertions, each demonstrated failing before being trusted

Run on the branch tree in the same clone; restored after each.

| Reverted state | `plugin:check` |
|---|---|
| `plugins/kanmer/.mcp.json` restored | `plugins/kanmer/.mcp.json exists, and must not — antigravity/agy copies it verbatim regardless of what any manifest points at…` — exit 1 |
| `mcpServers: "./.mcp.json"` put back | `.codex-plugin/plugin.json: declares mcpServers "./.mcp.json", and must not — codex cannot run a plugin-supplied server (FRD-012 R6, MCP-016)…` — exit 1 |
| `skills` key dropped | `skills is "undefined", expected "./skills/" — the skills are what this plugin delivers on every host and must not be dropped with the server` — exit 1 |
| `mcp/claude.mcp.json` removed | `missing plugins/kanmer/mcp/claude.mcp.json — Claude Code and grok DO run a plugin-supplied server and this is the file that gives it to them` — exit 1 |

## 7. Machine state — touched, restored, restore verified

| State | Before | After |
|---|---|---|
| `~/.gemini/config` | snapshotted (412 files across config+skills) | `diff -r` vs snapshot → **empty** |
| `~/.gemini/skills` | snapshotted | `diff -r` vs snapshot → **empty** |
| `agy plugin list` | `No imported plugins.` | `No imported plugins.` |
| `~/.codex/config.toml` | no kanmer MCP or marketplace entry | `grep -c` → `0`, unchanged; every codex probe ran in a scratch `CODEX_HOME` |
| main checkout | on `main`, clean | never switched, never edited; `git diff AGENTS.md` empty before the commit |

## 8. The ticket's own verification boxes

- **A decision recorded, with the option chosen and why** — option 2, in
  `plan.md` §Approach (including the four alternatives and why each was
  rejected) and amended into FRD-012 R6.2 with its three-part reasoning.
- **Checked by calling a tool on the host in question, not a config listing** —
  §3, §4 and §5 above; the one listing that appears is labelled as the proxy and
  is never the claim.
- **FRD-012 R6 updated to match** — matrix rows for codex and `agy` now read
  *"n/a — no server is advertised (MCP-016). Skills only"*, with the establishing
  command in each row; R2's two bullets and R7's scope corrected; the "Open work"
  line closed.

**Verdict: verified.** The plugin advertises no Kanmer MCP server on codex or
Antigravity, both hosts still receive all 12 skills, Claude Code and grok are
untouched, and Connect's registration answers a real tool call.
