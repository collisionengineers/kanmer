---
status: accepted
---

# ADR-0012 — The MCP server discovers the board; not finding one is fatal

- **Status:** accepted
- **Date:** 2026-08-16

## Context

`resolveProjectRoot` (`packages/mcp-server/src/root.ts:12-17`) is exactly
`--root` → `KANMER_ROOT` → `process.cwd()`. Its docstring calls the cwd fallback
"the common case" on ADR-0007's reasoning: a project-scoped codex config points
`cwd` at the right folder. That reasoning never covered a board on its own
branch.

Kanmer's own product creates exactly that layout. `ensureBoardWorktree`
(`apps/gui/src/main/kanmerGit.ts:113-166`) puts the board at
`<repo>/.worktrees/kanmer`, and this repo has **no `<repo>/.kanmer` at all**.
`resolvePaths` (`packages/core/src/paths.ts:47-66`) unconditionally joins
`<root>/.kanmer` and nothing validates it exists; `store.exists()`
(`store.ts:219-221`) merely *reports* absence and never reacts to it. So a
server rooted at the repo boots clean, answers every read successfully, and
reports an empty board that is not the user's board.

Measured on this repo before the change, invoked exactly as
`plugins/kanmer/.mcp.json` does — `node …/dist/index.js`, no `--root`, cwd at
the repo root:

```
stderr: kanmer-mcp ready — root: C:\Users\PC\Documents\GitHub\kanmer
get_status: { "projectRoot": "…\\kanmer", "kanmerDir": "…\\kanmer\\.kanmer",
              "exists": false, "boardSource": "default",
              counts: all zero }
```

A 128-ticket board sat at `…\kanmer\.worktrees\kanmer\.kanmer` and was never
mentioned. `deriveRepoRoot` (`paths.ts:31-37`) maps board → repo; there is **no
repo → board inverse anywhere in the codebase**. Every entry into Kanmer except
the desktop app's Connect button hits this: both plugin manifests pass no
`--root`, a `.mcpb` install has no project context, and hand-registration
usually omits it. Absolute paths are not the fix either — they do not survive a
different machine or user account.

A decision is needed now because MCP-011 (fix the manifests) and MCP-012
(surface which board is in use) are both queued directly behind it and both
consume the shape this decision fixes.

## Decision

**1. The resolution order gains a discovery step.**

```
--root <path> / --root=<path>      → how: "flag"
KANMER_ROOT                        → how: "env"
discovery, from cwd upwards        → how: "cwd" | "cwd-worktree"
                                          | "ancestor" | "ancestor-worktree"
--init / KANMER_INIT=1, board at cwd → how: "init"
otherwise                          → fatal
```

Discovery walks from `process.cwd()` upwards. At **each** level `L`, in order:

1. `<L>/.kanmer` — a colocated board.
2. `<L>/.worktrees/*/.kanmer` — the layout `ensureBoardWorktree` creates.

**2. Probe each level before applying the boundary, never the reverse.** The
repo root is simultaneously the level that holds `.git` and the level that holds
`.worktrees/`. Boundary-first would skip precisely the level that has the board.

**3. The hard boundary is a `.git` DIRECTORY only. A `.git` FILE is traversed.**
The walk also stops at the filesystem root.

**4. `.worktrees/*` tie-break: exact leaf name `kanmer` wins; otherwise
lexicographically first.** Every candidate examined is named in `tried`, so an
ambiguous pick is visible rather than silent. `.worktrees/kanmer` is a
convention, not an invariant — `kanmerGit.ts:119-122` adopts a board worktree
already checked out at any path.

**5. Discovery returns the BOARD root, never the repo root.** `resolvePaths:54`
feeds `deriveRepoRoot`, which recovers `<repo>` from `<repo>/.worktrees/<name>`;
returning the repo root instead would break governing-doc `refs` resolution.

**6. The resolver is `discoverBoardRoot` in `packages/core/src/discover.ts`**,
pure over injected `existsSync` and `readdirSync` (both defaulting to `node:fs`,
matching the `renameWithRetry` seam at `io.ts:68-72`), exported from the core
barrel. `readdirSync` is required as well as `existsSync` because the
`.worktrees/*` step is a glob and `existsSync` cannot enumerate.
`packages/mcp-server/src/root.ts` stays thin composition. The resolver lives in
core because it is the exact inverse of `deriveRepoRoot`, which already lives
there — and because `packages/mcp-server` has no test runner, an absence
FRD-022:48-49 records as deliberate. **No test runner is added to
`packages/mcp-server` by this decision.**

**7. Explicit `--root` / `KANMER_ROOT` remain unvalidated assertions.** They are
answers, not questions. `npm run inspect` (`package.json:27`) and `smoke.mjs`
(`:13,31`) both deliberately point `--root` at directories with no `.kanmer`.

**8. Provenance, not a string.** The resolver returns `{ root, how, tried }`.
`tried` is the ordered list of every path probed; it is both the body of the
not-found error and the diagnostic field. One source, two surfaces. `how` is
surfaced by `get_status` as **`rootSource`**. MCP-012 reports this vocabulary;
it does not rename it.

**9. Not finding a board is FATAL**, with the error naming every path tried and
all three recoveries:

```
Error: no Kanmer board found. Tried:
  C:\proj\.kanmer
  C:\proj\.worktrees\*\.kanmer
  C:\.kanmer
 Pass --root <board>, set KANMER_ROOT,
 or pass --init to create one here.
```

**10. Bootstrapping survives only behind an explicit opt-in: `--init` (or
`KANMER_INIT=1`).** Today `write()` → `ensureInit()` → `store.init()`
(`index.ts:58-74`) lazily creates `<cwd>/.kanmer` on the first write; that is how
`kanmer-setup` onboards a board-less repo. Lazy creation is kept, but it is
reachable only when a root was asserted (`--root`/`KANMER_ROOT`) or `--init` was
passed — never as a side effect of a mis-rooted session.

**11. Root resolution moves inside `main()`.** It happens today at module scope
(`index.ts:33-35`), so a throw there never reaches `main().catch`
(`index.ts:1104-1107`) and the host reports only "server failed to start". A
diagnostic nobody sees is the same invisibility this decision exists to end.
stdout is the MCP transport, so stderr is the only legal channel.

## Corrected premise — this ADR contradicts the wording it came from

The approved plan for this work said the ancestor walk "stops at a filesystem
root or a **`.git` boundary**", without distinguishing a `.git` file from a
`.git` directory. **That wording is wrong and is superseded here**, and it is
recorded rather than quietly fixed, because a silently corrected premise is how
the same mistake returns.

Verified on disk: `<repo>/.worktrees/kanmer/.git` is a **66-byte file**
containing `gitdir: …`, which is what *every* git linked worktree looks like.
`kanmer-execute` (`SKILL.md:37-54`) instructs every implementing agent to
`git worktree add .worktrees/<id>` and work inside it, and `kanmer-auto` and
`kanmer-closeout` assume the same layout. A boundary of "stop where `.git`
exists" therefore halts at `<repo>/.worktrees/<ticket-id>`, never reaches
`<repo>`, and never finds `<repo>/.worktrees/kanmer/.kanmer` — breaking
discovery for the majority real case, and for exactly the agents this change
exists to serve.

The original intent survives intact: an unrelated nested repository has a real
`.git` **directory**, so a deep subdirectory still cannot latch onto an
unrelated parent board.

## Alternatives considered

**(a) Boot degraded: report `found: false` plus the tried list from
`get_status`, and throw only on the first write.** Keeps bootstrapping with no
new flags. **Rejected by the operator.** It preserves a silent-by-default boot,
and silence on a mis-rooted session is the defect being fixed. Retained here as
the fallback had the operator wanted zero new flags.

**(b) Keep the cwd fallback and fix only the manifests (MCP-011 alone).**
Cheapest. Rejected: absolute roots in a manifest do not survive another machine
or user account — `pegasus/.mcp.json` on this machine hardcodes `C:\Users\Alex\…`
under a `C:\Users\PC` profile and is inert. It also leaves hand-registration and
`.mcpb` installs broken.

**(c) `--root <repo>` auto-redirects to `<repo>/.worktrees/*/.kanmer`.**
Rejected: it makes an explicit assertion silently non-literal, which is the
exact class of surprise this decision removes. Parked on MCP-010.

**(d) Put the resolver in `packages/mcp-server`.** Where it is used. Rejected:
that package has no vitest, no `test` script and no test files, and FRD-022:48-49
records that as a deliberate decision — overturning an approved doc as a side
effect of a bug fix is not warranted when core is the better home on design
grounds anyway.

**(e) Stop the walk at any `.git`, file or directory.** The obvious rule. See
the corrected premise above: it breaks the dominant case.

## Consequences

- **A mis-rooted server can no longer look healthy.** The failure moves from
  invisible (empty board, `exists: false`, exit 0) to loud (startup error naming
  every path tried). This is the point.
- **`kanmer-setup` must pass the opt-in** when onboarding a repo with no board,
  or its first write fails. The skill is updated in the same ticket — a fatal
  resolver plus a setup flow assuming lazy creation is a broken product, not two
  tickets.
- **No GUI path is affected.** `connect.ts:47` always emits `--root <boardRoot>`,
  and explicit roots stay unvalidated, so lazy creation still works there.
  `openProject` is always given an explicit path.
- **`resolveProjectRoot`'s signature changes** from `string` to
  `{ root, how, tried }`. Its only source caller is
  `packages/mcp-server/src/index.ts:33`, but `projectRoot` is captured by ~30
  closures in that file, so moving resolution into `main()` is the widest
  mechanical edit in the change.
- **FRD-022 is amended.** Lines 8 and 26 assert the old three-step order as
  verified fact in an `approved` document. AGENTS.md:138, README.md:205 and
  `examples/codex-config.toml:16-17` say the same in prose and follow.
- **The committed bundle must be rebuilt** —
  `plugins/kanmer/mcp/kanmer-mcp.cjs` carries its own compiled copy of
  `resolveProjectRoot` and is sha256-gated by `scripts/check-plugin-sync.mjs`.
  Build it from the main checkout, never from inside a worktree (MCP-007).
- **The `.mcpb` desktop install (MCP-008) supplies context explicitly.** Its
  required `user_config.board_root` value is passed as `--root` to the same
  local stdio server. A bad selection still produces the fatal diagnostic;
  the bundle does not infer a board, create a worktree, run the GUI, sync Git,
  or add an HTTP transport.
- **A new cost on startup**: one `existsSync` plus one `readdir` per ancestor
  level, only when no root was asserted. Parked as a question on MCP-010; the
  walk terminates at the first `.git` directory in practice.

Related: ADR-0007 (codex project config — the "cwd is the common case" reasoning
this retires) · FRD-022 · MCP-010 · MCP-011 · MCP-012 · MCP-008 · MCP-007.

## Consumer constraint — installer launcher and Codex Connect (GUI-099/GUI-100)

The Windows installer-owned launcher in ADR-0018 is a consumer of this decision:
it must directly invoke the packaged MCP child while inheriting the provider's
current working directory and standard streams. It must not `cd`, use `start`,
or forward arbitrary provider arguments. The resulting discovery order and
tie-breaks above are unchanged; this simply prevents an install-directory wrapper
from defeating discovery before it begins.

GUI-100's Codex Connect consumer deliberately serializes no `--root`,
`--repo-root`, `cwd`, install path or bundle path. Its project entry invokes
`cmd.exe /d /s /c "%LOCALAPPDATA%\\Kanmer\\bin\\kanmer-mcp.cmd"`; the fixed
launcher expands the destination machine's environment and passes the provider
workspace cwd/std streams through to the MCP child. Connect probes that same
command before writing project configuration and refuses without an absolute
fallback when the installer-owned launcher is unhealthy. This names a consumer
of the discovery order, not a change to the order itself.

GUI-106 keeps that command and inherited cwd unchanged while provisioning the
Electron-as-Node executable, its mapped runtime files, and the standalone bundle
under `%LOCALAPPDATA%\\Kanmer\\mcp\\<version>`, exposed through a stable
`current` boundary. The script is staged at
`<runtime>\\resources\\mcp\\kanmer-mcp.cjs`, beside the bundled skills at
`<runtime>\\resources\\plugins\\kanmer\\skills`, so `classifyBuild()` and
`bundledSkillsDir()` continue to report the packaged identity and staleness
source. The installer rejects roots overlapping `%LOCALAPPDATA%\\Kanmer\\mcp`
and best-effort prunes unlocked stale version directories while retaining
`current` and locked live runtimes. The launcher retains the install-root payload
as a fallback for legacy registrations; neither path adds `--root`,
`--repo-root`, `cd`, or provider-specific serialization. Real
packaged-update/session-survival proof is an integration boundary and remains
INCONCLUSIVE until a disposable Windows host executes it.
