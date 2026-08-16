# Proof — GUI-079

Verified on **merged `main`** in the main checkout
(`C:\Users\PC\Documents\GitHub\kanmer`), not the feature branch.

```
$ git log --oneline -3
efdc9f3 Make server identity visible in get_status (MCP-012) (#46)
463ec04 Connect writes and deletes registrations it does not exclusively own (GUI-079) (#47)
0c4ffda Make release.mjs verify every published asset, not just latest.yml (GUI-066) (#45)

$ git merge-base --is-ancestor 463ec04 HEAD && echo yes
yes
```

PR [#47](https://github.com/collisionengineers/kanmer/pull/47), squash-merged as
`463ec04` at 2026-08-16T23:13:18Z.

## Rails

```
$ npm run typecheck
  @kanmer/core, @kanmer/mcp-server, @kanmer/ui, @kanmer/gui — all clean, no output

$ cd apps/gui && npx vitest run src/main/connect.test.ts src/main/providers.test.ts
  Test Files  2 passed (2)
       Tests  63 passed (63)

$ npm run verify:agents-block
  26/26 checks passed

$ npm run check:manual
  manual: up to date (11 chapters)

$ npm run build -w @kanmer/gui
  ✓ built in 2.65s
```

`npm test` reports **230 passed / 2 failed**, and both failures are in
`src/main/kanmerGit.test.ts` — 5-second timeouts and `EPERM` on Windows temp
directories during real `git worktree` subprocesses. **Pre-existing and
environmental, not a regression:** the whole change was stashed and that file run
against the unmodified base commit during implementation, where it failed the
same way, and the failing subset differs between runs (a different pair failed
here than on the branch), which is the signature of a timeout rather than a
defect. Nothing in it touches `connect.ts` or `providers.ts`.

## The two defects, closed

**1. grok no longer shares Claude's file.** Asserted for the whole registry, not
just grok — `providers.test.ts` walks every `configFile` provider and requires
none of them to name `.mcp.json`. Against real temporary projects,
`connect.test.ts` shows `disconnectAgent("grok", root)` leaving a
Claude-written `.mcp.json` **byte-identical** while removing only `kanmer` from
grok's own `.grok/config.toml` (a neighbouring `mcp_servers.linear` survives),
and a Claude-only `.mcp.json` no longer making grok count as a connected
copy-skills peer.

Unchanged on this machine after the merge, which is the point — Kanmer no longer
writes here for grok in either direction:

```
$ cat .mcp.json
{ "mcpServers": { "kanmer": { "type": "stdio", "command": "…Kanmer.exe", … } } }

$ ls -a .grok
no .grok in this repo
```

**2. `codex mcp remove` is formatting-safe — re-proven on merged main**, against
a synthetic `CODEX_HOME` fixture carrying every hazard the research measured: a
float field codex reads as f64, literal-quoted `[projects.'c:\…']` trust
headers, a top-of-file comment, and an unrelated MCP server.

```
$ CODEX_HOME=…/verify-codex codex mcp remove kanmer-pegasus
Removed global MCP server 'kanmer-pegasus'.

$ diff -u before.toml config.toml
@@ -11,9 +11,3 @@
 [mcp_servers.node_repl]
 command = "node"
 args = ["--experimental-repl-await"]
-
-# kanmer legacy entry
-[mcp_servers.kanmer-pegasus]
-command = 'C:\Users\PC\AppData\Local\Programs\Kanmer\Kanmer.exe'
-args = ['C:\x\kanmer-mcp.cjs', "--root", 'C:\…\pegasus\.worktrees\kanmer', "--repo-root", 'C:\…\pegasus']
-env = { ELECTRON_RUN_AS_NODE = "1" }
```

One deletion hunk. Everything else survives byte-identical:

```
$ grep -n "startup_timeout_sec\|projects\." config.toml
3:startup_timeout_sec = 120.0
5:[projects.'c:\Users\PC\Documents\GitHub\kanmer']
8:[projects.'c:\Users\PC\Documents\GitHub\pegasus']
```

The float did not collapse to `120` and the literal quoting was not rewritten —
the two mutations Kanmer's own `TOML.parse`/`stringify` round-trip was measured
to make. Second run is harmless:

```
$ CODEX_HOME=…/verify-codex codex mcp remove kanmer-pegasus
No MCP server named 'kanmer-pegasus' found.
exit=0
```

## The ticket's four verification bullets

- **Pegasus fixture — reported, never removable.** `providers.test.ts` →
  *"THE PEGASUS CASE: a project with no replacement is reported and never
  removable"*: `status: "no-replacement"`, `removable: false`,
  `recommended: false`, and the detail asserted to name the project and to say
  Connect. Synthetic, as the research required — the live reproduction is gone.
- **Second run is a no-op.** *"is a no-op on the second run, and still holds back
  what it held back"*: after the drainable entry is gone the held-back one is
  still found, still not removable; and once every project has reconnected the
  scan returns `[]`, so the panel renders nothing at all. Confirmed against the
  real machine, whose global config is already in that state:
  `grep -c "mcp_servers.kanmer-" ~/.codex/config.toml` → `0`.
- **Disconnecting grok leaves Claude's `.mcp.json` intact.** Above.
- **ADR-0007's consequences match the code.** Amended in this PR: the drain's
  real precondition is stated, the sweep is named as what drains the pile, and
  the two constraints the sweep carries (never remove a project's only
  registration; never rewrite the global TOML) are recorded there.

## Not covered by this proof

No screenshot of the sweep panel. On this machine the global config holds zero
`kanmer-*` entries, so the panel deliberately renders nothing — the screenshot
would be of an empty area, and manufacturing legacy entries in the *live*
`~/.codex/config.toml` to photograph them is exactly the class of write this
ticket exists to stop. The panel's behaviour is covered by the classifier's unit
tests; its *appearance* — specifically that a kept row cannot be mistaken for a
removable one — was reviewed by reading the JSX and CSS, not by eye. Recorded in
the review as the thing a second reviewer should push on.
