# MCP-011 — Post-implementation report

Branch `mcp-011-fix-plugin-manifests`, worktree `.worktrees/mcp-011`, off
`origin/main` @ `c81063e`. One commit: `d9b0429`.

## What shipped, and why each piece

### 1. `plugins/kanmer/mcp/claude.mcp.json` — read by Claude Code and grok

`"command": "node"` → `"command": "${KANMER_NODE:-node}"`, plus
`"env": {"ELECTRON_RUN_AS_NODE": "1"}`. `${CLAUDE_PLUGIN_ROOT}` args and the
absence of `--root` are unchanged and now pinned by the rail.

The ticket asked whether the plugin path can reach the Electron binary or must
assume Node. **It can**, and that was established by calling a tool, not by
reading docs: with `KANMER_NODE` pointed at `Kanmer.exe`, a plugin-installed
Kanmer server answered `get_status` while reporting `electron: 31.7.7`. A static
manifest cannot *name* the binary — the plugin is copied into the host's own
cache with no idea where Kanmer lives — so the achievable form is an override,
and both hosts that read this file expand the `${VAR:-default}` shape.
`ELECTRON_RUN_AS_NODE` is unconditional because plain Node receives it and
ignores it (`versions_electron: null`).

### 2. `plugins/kanmer/.mcp.json` — read by codex and by `agy`

`${PLUGIN_ROOT}` removed entirely; now `"args": ["mcp/kanmer-mcp.cjs"]` with
`"cwd": "."`.

**This file has never worked, on any release.** codex 0.147.0 expands no `${…}`
token anywhere in a plugin's MCP config — `${PLUGIN_ROOT}`,
`${CODEX_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_ROOT}` and `${VAR:-default}` were each
installed alongside a variable-free control that *did* launch, and only the
control started — and it hands the child no `PLUGIN_ROOT` env var
(`pluginEnv: {}`). MCP-009 had seen `codex mcp list` print the token unexpanded
and moved on; that listing is the proxy the adjudication warns about. Exercised
as a mechanism, the server simply never started.

A relative `cwd` *is* resolved against the installed plugin root, which is the
one lever codex offers, so the invocation is expressed that way.

### 3. Both `plugin.json` → `0.3.2`

`bundledSkillsVersion()` reads `.claude-plugin/plugin.json`, and `installSkills()`
stamps every copied skill set with that same number. So while the manifest
disagreed with `package.json`, installed and bundled were written from **one
constant** and `isNewerVersion(bundled, installed)` could never be true — the
affordance was not stale, it was unreachable by construction. `Settings.tsx`
renders "Update skills" only on `updateAvailable`, so [[GUI-080]]'s merged
reconciliation (`9ac20af`) had no way to be invoked. Its proof said so; this is
the ticket that makes it reachable.

### 4. Rails — one that detects, one that prevents

`scripts/check-plugin-sync.mjs` gained a manifest section: both versions equal
`package.json`; each `plugin.json`'s `mcpServers` pointer resolves; the
`${CLAUDE_PLUGIN_ROOT}` script exists; `.mcp.json` contains no `${…}` and has
`cwd: "."` with an existing relative script; neither file passes `--root`.

`scripts/release.mjs` now `bump()`s both manifests alongside the two
`package.json` files. Detection alone would have caught this drift and then let
the next release recreate it — the release script is where it was born.

### 5. `apps/gui/src/main/skillsVersion.test.ts` (new)

Runs the **real** `skillsStatus()` against the **real** shipped manifest.
`connect.test.ts` deliberately mocks `getAppPath` to `"/unused"`, so it cannot
see this class of bug at all; this file points the mock at the real `apps/gui`
instead, in its own file so the existing suite's seam is untouched.

### 6. Documents

FRD-012 gains **R6** (the plugin-runtime matrix, each row with the command that
established it) and **R7** (neither manifest pins a board). R2's codex bullet and
the closing open-work line are corrected. README documents `KANMER_NODE` and
tells codex users plainly that the plugin gives them skills only.

## Before and after, both shown

| | baseline `c81063e` | after |
|---|---|---|
| codex, calling `get_status` via the plugin | `TOOL_ABSENT` | `TOOL_ABSENT` — see the limitation below |
| claude, calling `get_status` via the plugin | worked (`rootSource: ancestor-worktree`) | unchanged, plus the Electron override works |
| claude, `plugin list` version | `0.1.0` | `0.3.2` |
| `skillsVersion.test.ts` | `expected '0.1.0' to be '0.3.2'` | 3 passed |
| `plugin:check` | no manifest assertions | `manifests at v0.3.2` |

## The limitation this did NOT fix — stated plainly rather than papered over

**A codex plugin install still does not give you a working board.** With
`cwd: "."` the server now starts, but MCP-010's discovery then runs from
`~/.codex/plugins/cache/kanmer-plugins/kanmer/0.3.2` and correctly reports no
board, naming every path tried. Locating the script needs cwd = plugin root;
discovering the board needs cwd = the user's workspace; codex can express only
one. An ambient `KANMER_ROOT` does not bridge it either — the server accepts
`KANMER_ROOT` when run by hand, so codex is not passing the ambient environment
through. `agy` cannot launch it under any manifest content: it copies
`.mcp.json` verbatim and joins relative paths to the session cwd.

The change is still a strict improvement — a server that starts and prints a
precise, actionable fatal error beats one that vanishes silently, and this
ticket exists because of the silent kind. But **do not read a fixed manifest as
a fixed codex install.** FRD-012 R6 says so; **[[MCP-016]]** (filed) owns the
decision about whether to keep advertising the registration at all. That choice
— changing what a shipped plugin claims to provide — is a product call, not a
manifest fix, so it was recorded rather than taken quietly.

## How this meets the governing docs

- **FRD-012** (`refs`) — R2's install matrix said nothing about the *runtime*
  each install path assumes, which is the ticket's third verification bullet.
  R6 now states it per host with the establishing command. R2's codex bullet is
  corrected from "same wrong root" to the measured truth. R5's method clause was
  **followed, not amended**: every claim is a tool call with a positive control.
- **FRD-022** — untouched. The tool surface does not move.
- **ADR-0012** — the reason omitting `--root` is correct. Confirmed by running
  it, and R7 now pins it.
- **ADR-0009** — its method clause governs this work; unmodified.
- **No new ADR.** `${KANMER_NODE:-node}` is a manifest detail inside FRD-012's
  existing matrix. If review disagrees the runtime split deserves its own ADR,
  that is a cheap follow-up.

## Risks and follow-ups

- **codex's `0.1.0` plugin cache is orphaned** by the bump; the new install lands
  at `…\kanmer\0.3.2`. `codex plugin remove` clears the old directory. Harmless,
  and it is the same version-keyed pruning the freeze was disabling.
- **`_comment` arrays** were added to both MCP configs. Verified ignored by
  claude, codex and grok (all three registered and ran the server with them
  present). Non-standard, but these are the two files most likely to be
  hand-edited by someone who has not read the research.
- **`npm test` flaked once** on the first run — `kanmerGit.test.ts`'s `afterEach`
  `rmSync` hit a Windows file lock while tearing down a git worktree. Two
  subsequent full runs were 220/220 green. Unrelated to this change; recorded
  rather than hidden.
- **[[MCP-013]]** was re-encountered throughout and deliberately not touched:
  `pluginRoot()` still points at `plugins/kanmer` while the marketplace manifest
  is at the repo root, `connect.ts` still swallows the non-zero exit, and the
  packaged app still ships neither marketplace JSON. It did **not** block
  verification — `marketplace add <repo root>` works.

## What `kanmer-verify` should run on merged `main`

1. `npm install`, `npm run build`, then `npm test`, `npm run typecheck`,
   `npm run plugin:check`, `npm run smoke:protocol`.
2. `npx vitest run apps/gui/src/main/skillsVersion.test.ts --root apps/gui` — the
   "Update skills" reachability proof.
3. Install the plugin from merged main and **call `get_status` through it**
   (`mcp__plugin_kanmer_kanmer__get_status`, not the Connect-registered
   `mcp__kanmer__get_status` — they coexist and the wrong one answers with
   `rootSource: "flag"`). Expect `rootSource: "ancestor-worktree"` or
   `"cwd-worktree"`, `exists: true`.
4. Repeat with `KANMER_NODE=<Kanmer.exe>` and confirm it still answers.
5. Confirm `claude plugin list` reports the plugin at the repo version.
