# MCP-011 — Proof (merged `main`)

Verified at **`29bee81`** — PR #52 squash-merged 2026-08-16T23:38:59Z, confirmed
an ancestor of `origin/main`. Run in a **clean detached clone**, not a linked
worktree: MCP-007 (#48) landed while this branch was open and `plugin:check` now
refuses a worktree outright.

```
$ git log --oneline -1
29bee81 fix(plugin): make both plugin manifests express an invocation that works (MCP-011) (#52)
$ git merge-base --is-ancestor HEAD origin/main && echo "HEAD is on origin/main"
HEAD is on origin/main
```

## Rail — all four green on merged main

```
$ npm test                    EXIT=0   core 193/193 · gui 256/256
$ npm run typecheck           clean (@kanmer/core, @kanmer/ui, @kanmer/gui)
$ npm run plugin:check        plugin-sync OK — 29 tools match, bundle bytes match,
                              12 skill frontmatters parse, manifests at v0.3.2
$ npm run smoke:protocol      26/26 checks passed
```

`bundle bytes match` after a fresh `npm run build`, so the committed bundle needed
no rebuild despite rebasing across MCP-012's server changes.

### One test failed on the first full run, and it is not this change

`kanmerGit.test.ts > ensureBoardWorktree reconciliation > moves a worktree left on
the old branch onto the configured one` — `Test timed out in 5000ms`, then
`EPERM` in the `afterEach` `rmSync` of a real git worktree under `%TEMP%`. A
Windows file-lock/timing flake, aggravated by this session's own git activity and
by other agents in the shared checkout.

Established as **pre-existing**, not asserted:

```
merged main 29bee81   run 1: EXIT=0  7 passed
                      run 2: EXIT=0  7 passed
                      run 3: EXIT=0  7 passed
parent      6c3ae77   run 1: EXIT=1  1 failed, 6 passed     ← fails WITHOUT this change
                      run 2: EXIT=0  7 passed
```

It fails on the commit *before* this one and passes 3/3 on merged main. This diff
touches no git code and does not touch that file. Filed as **[[GUI-089]]**.

## Claim 1 — the "Update skills" affordance is now reachable

The ticket's stated purpose: [[GUI-080]]'s merged reconciliation (`9ac20af`, PR
#41) could never be invoked because `Settings.tsx` renders the button only on
`updateAvailable`, and `bundledSkillsVersion()` read a manifest frozen at `0.1.0`
while `installSkills()` stamped copies with that same constant.

`apps/gui/src/main/skillsVersion.test.ts` runs the **real** `skillsStatus()`
against the **real** shipped manifest:

```
$ npx vitest run src/main/skillsVersion.test.ts --root apps/gui
 ✓ equals the repo version, so an update can ever be offered
 ✓ offers an update when the installed copy is older
 ✓ offers nothing when the installed copy is already current
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

**Falsification, recorded before the fix:** the identical test on the untouched
baseline —

```
AssertionError: expected '0.1.0' to be '0.3.2'
 ❯ src/main/skillsVersion.test.ts:59:35
```

And the host agrees, on merged main:

```
$ claude plugin list
  ❯ kanmer@kanmer
      Version: 0.3.2      (was 0.1.0)
```

## Claim 2 — a plugin install reaches the board with no `--root`

Run from a scratch project outside any repo, holding only a
`.worktrees/kanmer/.kanmer` board, so **only** the plugin-installed server exists
there. This matters: in the Kanmer repo itself the project `.mcp.json` registers
a server under the same name `kanmer`, Claude Code de-duplicates by name, and the
Connect-registered one answers instead — with `rootSource: "flag"`, which would
have been a false pass. That ambiguity was caught and eliminated rather than
reported.

```
$ claude plugin marketplace add <clone> ; claude plugin install kanmer@kanmer -y
$ claude mcp list
plugin:kanmer:kanmer: node …/plugins/kanmer/mcp/kanmer-mcp.cjs - ✔ Connected
```

**The mechanism, not the listing** — the tool was called:

```
$ claude -p "Call the tool mcp__plugin_kanmer_kanmer__get_status with no arguments…"
projectRoot: …\boardproj\.worktrees\kanmer | rootSource: cwd-worktree | exists: true
counts.byType.ticket: 155
```

`rootSource: cwd-worktree` — MCP-010's `.worktrees/*/.kanmer` probe, no `--root`
anywhere in the manifest. **The ticket's first verification bullet, for Claude
Code.**

## Claim 3 — the plugin path DOES reach the Electron binary

The ticket's central question. Same install, same tool call, one env var:

```
$ $env:KANMER_NODE = "C:\Users\PC\AppData\Local\Programs\Kanmer\Kanmer.exe"
$ claude mcp list
plugin:kanmer:kanmer: C:\Users\PC\AppData\Local\Programs\Kanmer\Kanmer.exe …/kanmer-mcp.cjs - ✔ Connected
$ claude -p "Call the get_status MCP tool with no arguments…"
projectRoot: …\boardproj\.worktrees\kanmer | rootSource: cwd-worktree | exists: true
counts.byType.ticket: 155
```

Kanmer's own Electron binary, running the bundle as Node via the manifest's
`ELECTRON_RUN_AS_NODE`, serving real tool calls. During research the same probe
reported `electron: 31.7.7 / node: 20.18.0` from inside the server process.

So `"command": "node"` was an unnecessary assumption for Claude Code and grok —
established by measurement, which is what the ticket asked for. Node stays the
default; `KANMER_NODE` is the documented override, stated in FRD-012 R6.

## Claim 4 — grok not regressed

Verified pre-merge on the identical manifest (grok reads the same
`mcp/claude.mcp.json`), by calling the tool with the Electron override active:

```
$ grok plugin install <dir> --trust
$ grok -p "Call the get_status tool on the kanmer MCP server…"
C:\Users\PC\Documents\GitHub\kanmer\.worktrees\kanmer  ancestor-worktree  true  151
```

## Claim 5 — the rails hold, and were proven to fail

`plugin:check` passes on merged main. Each new assertion was demonstrated
**failing** on a deliberately broken manifest — a rail nobody has seen fail is a
rail nobody has tested:

```
version drift →  .claude-plugin/plugin.json: version "0.1.0" != package.json "0.3.2"
                 — while these disagree, skillsStatus().updateAvailable can never fire
${…} restored →  .mcp.json: contains a ${…} token; neither codex nor agy expands one,
                 and the server then silently never launches
                 .mcp.json: cwd must be "." so a relative args path resolves to the plugin root
                 .mcp.json: args[0] "${PLUGIN_ROOT}/mcp/kanmer-mcp.cjs" does not exist
--root restored → mcp/claude.mcp.json: must not pass --root — the server discovers
                 the board (ADR-0012)
```

And `release.mjs` now writes the version the check enforces — verified the reused
`bump()` regex hits both manifests (`bumped -> 9.9.9` for each).

## What is NOT proved — the codex install still gives no board

Stated here because the honest result matters more than a clean one.

```
$ codex plugin marketplace add <clone> ; codex plugin add kanmer@kanmer-plugins
Installed plugin root: C:\Users\PC\.codex\plugins\cache\kanmer-plugins\kanmer\0.3.2
$ cd <that root> && node mcp/kanmer-mcp.cjs      # exactly what the manifest says
kanmer-mcp fatal: no Kanmer board found. Tried:
  C:\Users\PC\.codex\plugins\cache\kanmer-plugins\kanmer\0.3.2\.kanmer
  C:\Users\PC\.codex\plugins\cache\kanmer-plugins\kanmer\0.3.2\.worktrees\*\.kanmer
  …
```

The server **now starts** — on the baseline manifest it never did, silently,
because codex expands no `${…}` token of any kind — but discovery then runs from
the plugin cache. Locating the script needs `cwd` = plugin root; discovering the
board needs `cwd` = the user's workspace; codex 0.147.0 expresses only one, and
does not pass an ambient `KANMER_ROOT` through either. `agy` cannot launch it at
all under any manifest content.

A loud, actionable failure replacing a silent one is a real improvement and is
the honest limit of what these two files can do. It is **not** a working codex
install, and nothing in this change should be read as claiming otherwise:
FRD-012 R6, the README, the commit message, the PR body and the
post-implementation report all say so, and **[[MCP-016]]** owns the decision on
whether to keep advertising the registration.

Also unchanged and untouched: **[[MCP-013]]** (marketplace root, the swallowed
non-zero exit, the packaged app shipping neither marketplace JSON). It did not
block this verification — `marketplace add <repo root>` works.

## Reversibility

Every install performed for this verification was reverted —
`claude plugin uninstall` / `marketplace remove`, `codex plugin remove` /
`marketplace remove`; `plugin list` on claude, codex, grok and `agy` all report no
`kanmer` entry. The scratch board project used a directory **junction** to the
real board and was removed with `.Delete()` on the junction itself, never a
recursive delete through it; the real board is intact. No repository file was
modified by verification, and no `AGENTS.md` block was written.
