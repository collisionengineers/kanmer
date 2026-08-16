# Research — half 1: can the board run headless?

## The question

The ticket says the MCP server "already runs without a window" because Connect
registers it as `Kanmer.exe <script>` with `ELECTRON_RUN_AS_NODE=1`, and asks us
to establish what "run the board headless" actually requires. The sharper form
of that question — and the one that decides how much work this ticket is — is:

> Does `packages/mcp-server` need Electron **at all**, or is the Electron binary
> only being used as a Node interpreter that happens to be on the machine?

## Answer: it needs no Electron. This is a significant simplification.

The Electron binary is used **purely as a Node interpreter**. `serverInvocation`
(`apps/gui/src/main/connect.ts:36-52`) says so in its own doc comment — "via the
Electron binary as Node (`ELECTRON_RUN_AS_NODE=1`), so the target machine needs
no separate Node". The choice is about *runtime availability*, not about any
Electron API the server consumes. Four independent lines of evidence:

### F1 — Nothing in `packages/` imports Electron

A case-insensitive grep for `electron` across `packages/` returns only prose:
comments in `packages/core/src/store.ts:120`, `packages/ui/src/*`, the
`tsup.standalone.config.ts` header, and the `KANMER_NODE` opt-in in the two
`smoke*.mjs` harnesses. **Zero `import`/`require` of `electron`.** The split is
clean: every Electron-dependent thing (git worktree, dispatch, IPC, windows)
lives in `apps/gui/src/main/`.

### F2 — The dependency graph is pure JS

- `@kanmer/mcp-server` → `@kanmer/core`, `@modelcontextprotocol/sdk@^1.30`, `zod@^3`
- `@kanmer/core` → `chokidar@^3.6`, `gray-matter@^4`, `yaml@^2.5`, `zod@^3`

No native modules, no node-gyp, no better-sqlite3/keytar. The one native-adjacent
thing is chokidar 3's **optional** `fsevents` (darwin-only, `require`d in a
try/catch; chokidar falls back to `fs.watch`/polling).

### F3 — The standalone bundle already runs under plain Node, in isolation

`packages/mcp-server/tsup.standalone.config.ts` emits one CJS file with
`noExternal: [/.*/]`, `platform: "node"`, `target: "node20"`. tsup still leaves a
handful of *dynamic* requires external — `fsevents`, `esprima`,
`ajv/dist/runtime/*`, `ajv-formats/dist/formats` — so "self-contained" needed
testing rather than assuming.

Test run (2026-08-16, Windows 11, Node v24.14.0):

1. Copied `dist/standalone/kanmer-mcp.cjs` (1.47 MB) to a scratch directory.
2. Confirmed from that directory `ajv-formats`, `esprima` and `fsevents` are
   **NOT RESOLVABLE** — i.e. the exact condition inside an installed `.mcpb`.
3. Ran the existing harness against it with plain Node, no Electron, no
   `ELECTRON_RUN_AS_NODE`:

```
KANMER_SERVER=<scratch>/kanmer-mcp.cjs node packages/mcp-server/src/smoke.mjs
→ 120/120 checks passed
```

That covers the whole tool surface over real stdio — reads, writes, gate
evaluation, group derivation, doc round-trips, `delete_item`. **Headless board
access under plain Node is not a feature to build; it is a fact to test, document
and defend.**

### F4 — The repo already invokes it that way

Root `package.json`: `"inspect": "... npx @modelcontextprotocol/inspector node
packages/mcp-server/dist/index.js --root ./sandbox"`. Plain `node`, no Electron.
Both `plugins/kanmer/mcp/claude.mcp.json` and `plugins/kanmer/.mcp.json` also
register `"command": "node"` — MCP-011 flags that as a defect only because it
reintroduces a *Node-on-PATH* assumption, not because the server needs Electron.

## What headless actually requires, then

Not a code change to the server. It requires:

| Requirement | Status today |
|---|---|
| A Node-capable runtime on the box | Provided three different ways: the Electron binary (`ELECTRON_RUN_AS_NODE`), a system Node, or — for `.mcpb` — Claude Desktop's own bundled Node |
| A self-contained server payload | Exists: `dist/standalone/kanmer-mcp.cjs`, verified in isolation (F3) |
| The board root, told to it | `--root` → `KANMER_ROOT` → cwd (`packages/mcp-server/src/root.ts:12-17`). This is the whole difficulty, and it is where MCP-010 and the `.mcpb` half meet |
| The board worktree to already exist | Out of scope by the ticket's own framing ("works once set up") |
| FRD-022 to say so | Missing. FRD-022 documents the surface but never states no-GUI as a supported mode |

## No coupling to the running app

There is no IPC, port, named pipe, lockfile or handshake between server and GUI.
Neither `packages/core/src/*.ts` nor `packages/mcp-server/src/*.ts` contains
`child_process`, `spawn`, `execSync` or any git call — the only hits are two
comments in `io.ts` about `git add` racing a write. Every git operation lives in
`apps/gui/src/main/kanmerGit.ts`. README states the model explicitly: "Neither
talks to the other — they sync through the files."

So with the app closed, the ONLY thing that stops happening is what the GUI owns:

1. **Git auto-sync** (FRD-020 R3) — `syncBoard` runs on a timer in the main
   process. The ticket already rules a headless committer out of scope; the
   consequence is that a headless session accumulates uncommitted board changes
   on the `kanmer-board` branch until the app is next opened, or the user commits
   by hand. That is the "unsynced board" edge FRD-022 must state.
2. **Worktree creation** — `ensureBoardWorktree`. Out of scope: precondition.
3. **The live-reload UI** — irrelevant with no window.

Notably the server's own file watcher is **lazy**: `watchKanmer` is called only
from `ensureSubscriptionWatcher()` (`index.ts:1010-1013`), reached only on an MCP
`resources/subscribe`. A headless session that never subscribes never loads
chokidar at all — which also caps the fsevents risk (see the macOS question).

## What this assumes about MCP-005 (blocking)

MCP-005 decides **where the server payload lives for the desktop app's own
registrations**. This research deliberately does not pre-empt it. What it does
establish is a fact MCP-005 may find useful and that this ticket depends on
either way:

- **Assumed:** MCP-005 keeps shipping *some* self-contained payload built from
  `packages/mcp-server` — the standalone CJS bundle or an equivalent single
  artefact. Everything above holds for any such payload.
- **Assumed:** MCP-005 keeps honouring its own stated constraint, "a machine with
  no Node installed can still run the MCP server." F1-F3 show that constraint is
  about the *interpreter*, not about Electron, which widens MCP-005's option
  space (a bundled runtime, a shim, an Electron re-exec are all still live) but
  does not choose among them.
- **NOT assumed:** any particular directory. This ticket must read the payload
  location from whatever MCP-005 lands rather than hardcoding
  `process.resourcesPath/mcp/` — and the `.mcpb` half is insulated from the
  decision anyway (see `research/mcpb-format.md` §"Relationship to MCP-005").
- **Sequencing:** the headless half touches no path at all if it lands as
  FRD-022 wording + tests; it is only the `.mcpb` **build target** — which must
  source a payload from somewhere — that has to wait for or align with MCP-005.

## Relationship to MCP-010 (not a blocker, does not solve this)

MCP-010 adds discovery when `--root` is absent: `<cwd>/.kanmer`, then
`<cwd>/.worktrees/*/.kanmer`, then an ancestor walk. For a **CLI agent started in
a project directory** that removes the precondition this ticket would otherwise
inherit — the caller no longer has to know the `.worktrees/kanmer` path.

**It does not solve the desktop case.** Every step of MCP-010's ladder is rooted
at `process.cwd()`, and a server launched by Claude Desktop from an extension
directory has a cwd that is an artefact of how the app was started — the
extensions folder, `/`, or `C:\Windows\System32`. It bears no relation to any
project the user cares about, so walking up from it finds nothing, or worse finds
something arbitrary. A desktop install has no project context to infer from, and
no amount of discovery invents one. The board must be **supplied**, not inferred
— which is exactly what `.mcpb` `user_config` exists for.

MCP-010 does still *improve* the desktop story in one concrete way, covered in
the other research file: it decides whether the user must pick
`<repo>/.worktrees/kanmer` or may pick `<repo>`.
