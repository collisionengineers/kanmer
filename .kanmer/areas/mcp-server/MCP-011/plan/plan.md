# MCP-011 — Plan

Built from `research` and `files`. Baseline `origin/main` @ `c81063e`.

## Chosen approach

**Fix each manifest for the hosts that actually read it, keep them separate, and
make the version parity a rail in two places — one that detects drift and one
that prevents it.**

### 1. Runtime — differentiated, because the hosts differ

`mcp/claude.mcp.json` (claude, grok):

```json
{ "mcpServers": { "kanmer": {
  "command": "${KANMER_NODE:-node}",
  "args": ["${CLAUDE_PLUGIN_ROOT}/mcp/kanmer-mcp.cjs"],
  "env": { "ELECTRON_RUN_AS_NODE": "1" } } } }
```

`.mcp.json` (codex, agy):

```json
{ "mcpServers": { "kanmer": {
  "command": "node",
  "args": ["mcp/kanmer-mcp.cjs"],
  "cwd": ".",
  "env": { "ELECTRON_RUN_AS_NODE": "1" } } } }
```

**Why this beat the alternatives:**

- *Keep `"command": "node"` everywhere and just document it.* Rejected for
  claude/grok: research F1c and F2 show the plugin path **can** reach Electron —
  a tool call served by Electron 31.7.7 — so "it must assume Node" would be the
  assumption the ticket exists to stop. Accepted for codex, where it is the
  measured truth rather than a default.
- *One manifest for all hosts.* Provably impossible. `cwd: "."` is required by
  codex and collapses grok's handshake (F4).
- *Ship a launcher script that finds Electron.* A launcher needs a runtime to
  run, and a single `command` cannot branch across `.cmd`/`.sh`. It also cannot
  locate an app whose install path is machine-specific. An env override is the
  only expressible form, and it is the one that measurably works.
- *Drop `mcpServers` from `.codex-plugin/plugin.json`* — the honest response to
  "this has never worked" — became unnecessary once `cwd: "."` was found to
  resolve against the installed plugin root (F3).

`${KANMER_NODE:-node}` keeps the default behaviour identical to today for anyone
who has Node, and gives a Node-less machine a one-variable route to the Electron
binary. `ELECTRON_RUN_AS_NODE: "1"` is unconditional because plain Node ignores
it (F1a).

### 2. `--root` stays absent

Correct as of MCP-010. **Confirmed by running the installed plugin and calling
`get_status` through it**, not by reading `discover.ts` — the ticket says so
explicitly and MCP-009's rule requires it.

### 3. Version parity — detect *and* prevent

- Both `plugin.json` → the repo version (`0.3.2`).
- `scripts/check-plugin-sync.mjs` gains assertions (detect).
- `scripts/release.mjs` `bump()`s both manifests with the two `package.json`
  files (prevent). Detection alone would have caught this drift and then let the
  next release recreate it; the release script is where the drift was born.

## Steps

1. Worktree `.worktrees/mcp-011`, branch `mcp-011-fix-plugin-manifests` off
   `origin/main`; `npm install` inside it (MCP-007's trap).
2. **Falsification first.** On the untouched baseline, install the plugin for
   real and record that codex never launches the server and that
   `updateAvailable` cannot fire. Before and after, both shown — MCP-010's
   pattern.
3. Rewrite `plugins/kanmer/mcp/claude.mcp.json`.
4. Rewrite `plugins/kanmer/.mcp.json`.
5. Bump both `plugin.json` versions to `0.3.2`.
6. Extend `scripts/check-plugin-sync.mjs`: version parity against
   `package.json`; each manifest's invocation resolves to a real file under
   `plugins/kanmer`; `.mcp.json` carries no `${…}` token.
7. Extend `scripts/release.mjs` `bump()` over both plugin manifests.
8. Add the `connect.test.ts` case running the **real** `skillsStatus()` against
   the **real** manifest.
9. FRD-012: new **R6** runtime matrix with the establishing commands; correct the
   R2 codex bullet and the closing open-work line. README: the `KANMER_NODE` line.
10. File the follow-up ticket for agy's unlaunchable plugin server.
11. Rail + the live install proof.

## How proof is produced

Every claim is a command and its output, and the mechanism is the tool call.

| Claim | How |
|---|---|
| Manifests fixed for claude | `claude plugin marketplace add <repo root>` + `install kanmer@kanmer`, then `claude -p` **calling `get_status`** — must report this repo's board |
| `--root` omission is correct | the same `get_status` result: `exists: true`, non-zero ticket count, `rootSource` from discovery |
| Electron reachable | rerun with `KANMER_NODE=<Kanmer.exe>`; the tool must still answer |
| codex fixed | `codex plugin marketplace add` + `plugin add kanmer@kanmer-plugins`, then `codex exec` **calling the tool**; before = never launches |
| grok not regressed | `grok plugin install … --trust`, then `grok -p` calling the tool |
| "Update skills" reachable | the new `connect.test.ts` case against the real manifest, plus the same test failing on baseline |
| Rail holds | `npm test`, `npm run typecheck`, `npm run plugin:check`, `npm run smoke:protocol` |

`plugin:check` settles in a **dedicated clean detached checkout of the merge
commit** if the shared main checkout is contended — MCP-010's remedy.

## Risks

| Risk | Mitigation |
|---|---|
| Rebuilding the committed bundle fights the contended main checkout | Don't. `npm install` in the worktree; settle `plugin:check` in a clean detached checkout. No server source changes, so a rebuild should not be needed at all. |
| `${KANMER_NODE:-node}` unsupported by some future reader of `claude.mcp.json` | Verified on both current readers (F1, F2); the rail pins the shape so a change is deliberate. |
| Version bump orphans codex's `0.1.0` cache | Expected and named in the report; `codex plugin remove` clears it. |
| Connect writes a stale v2 AGENTS.md block during testing | `git status` after any Connect run; revert. Never commit an `AGENTS.md` change. |
| MCP-013's broken marketplace root blocks verification | It does not — `marketplace add <repo root>` works. If that changes, say so plainly rather than substituting a weaker claim. |

## Governing docs

`refs`: `docs/functional/frd/FRD-012-connect.md`,
`docs/functional/frd/FRD-022-mcp-server-surface.md`.

- **FRD-012** — R2's install matrix is the single description of how each host
  gets Kanmer, and it currently says nothing about the *runtime* each install
  path assumes. This plan adds **R6** stating it, with the establishing commands,
  which is exactly the ticket's third verification bullet. R2's codex bullet is
  corrected: its plugin MCP registration has never launched, not merely "same
  wrong root". The closing open-work line for MCP-011 ("frozen at `0.1.0`") is
  widened to the registration itself. R5's method clause is *followed* here, not
  amended. **These are additions and corrections to a `draft` FRD that the
  ticket's own Verification section asks for — not a change of decision.**
- **FRD-022** — unchanged. The manifests are consumers of the server surface;
  nothing about the tool surface moves.
- **ADR-0009** — its method clause governs every claim made here. Followed,
  not modified.
- **No new ADR.** `${KANMER_NODE:-node}` is a manifest detail inside FRD-012's
  existing matrix, not a cross-cutting decision. ADR-0012 already fixes board
  discovery, which is what makes omitting `--root` correct. If review disagrees
  that the runtime split deserves an ADR, that is a cheap follow-up.
