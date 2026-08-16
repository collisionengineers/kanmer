# Proof — MCP-012

Verified on **merged `main`**, commit `efdc9f3` (PR #46, squash), in a
**clean detached checkout with fresh `node_modules`** —
`.worktrees/verify-mcp012`, `git worktree add --detach … efdc9f3`, `npm install`
from scratch. Not the feature branch, and not the contended main checkout;
`realpathSync("node_modules/@kanmer/core")` confirmed resolving to that
checkout's own `packages/core` before anything was built.

## The claim being proved

Two hosts pointed at one board can run different server builds that enforce
different gates. Before this change that was **unobservable from inside a
session**. The proof is the same two commands run before and after.

## 1. The falsifying case — BEFORE

Two provably different bundles:

```
…\Programs\Kanmer\resources\mcp\kanmer-mcp.cjs
  sha256 e92a26793f712a8f…  1 465 172 B  grep -c questions-resolved = 0
…\kanmer\plugins\kanmer\mcp\kanmer-mcp.cjs
  sha256 96fe9f8ae7b305e3…  1 467 810 B  grep -c questions-resolved = 1
```

One enforces the `questions-resolved` gate, one does not. Spawned over real
stdio against the same board with each registration's own arguments
(`.codex/config.toml` passes `--repo-root`, `.mcp.json` does not), `get_status`
returned **byte-identical JSON — every field the same**:

```json
{ "projectRoot": "…\\.worktrees\\kanmer", "kanmerDir": "…", "exists": true,
  "format": 3, "boardSource": "file", "deploymentTracking": false,
  "counts": { … identical … }, "warningsCount": 0 }
```

Full transcript: `scratch/falsification.md`.

## 2. AFTER — the same two commands, on merged main

**Old installed build**, codex args:

```json
{ "projectRoot": "…\\.worktrees\\kanmer", "kanmerDir": "…",
  "exists": true, "format": 3, … }
```

No `server`. No `repoRoot`. No `rootSource`. **That absence is the signal** —
detection is one-sided by design; a pre-0.3.3 binary cannot be made to talk,
and the tool description and FRD-022 R5b both say so.

**Merged-main build**, `.mcp.json` args:

```json
{ "projectRoot": "C:\\Users\\PC\\Documents\\GitHub\\kanmer\\.worktrees\\kanmer",
  "repoRoot":    "C:\\Users\\PC\\Documents\\GitHub\\kanmer",
  "rootSource":  "flag",
  "repoRootSource": "derived",
  "server": {
    "version": "0.3.2",
    "path": "…\\plugins\\kanmer\\mcp\\kanmer-mcp.cjs",
    "sha256": "97f6ca41472d5eb8bc1efe67e523fdb33d0dc4f19181ffb325f2dd4b939fbd34",
    "sha256Short": "97f6ca41",
    "mtime": "2026-08-16T23:14:28.747Z",
    "size": 1474730,
    "build": "plugin" } }
```

| | before | after |
|---|---|---|
| old installed build | indistinguishable | **block absent** → "pre-0.3.3" |
| current build | indistinguishable | `97f6ca41`, `build: plugin`, v0.3.2 |
| `refs` resolution base | invisible | `repoRoot` + `repoRootSource: derived` |

Both ticket acceptance criteria 1 and 2 met.

## 3. Survives packaging — acceptance criterion 3

The real pack (`npm run dist`, exit 0), driven by `smoke.mjs` through the
**actual packaged `Kanmer.exe`** as node (`KANMER_SERVER` + `KANMER_NODE`,
`ELECTRON_RUN_AS_NODE=1`) at
`apps\gui\release\win-unpacked\resources\mcp\kanmer-mcp.cjs`:

```
server.build classifies the shape                      — packaged
server.path is the script the smoke test spawned       — …\win-unpacked\resources\mcp\kanmer-mcp.cjs
server.sha256 is the real hash of that file's bytes    — 97f6ca41…
packed sha == committed plugin bundle sha              — 97f6ca41…
133/133 checks passed
```

A packaged app reports the packaged bundle, not a dev path. The same bytes
correctly report `packaged` from the app and `plugin` from a checkout — the
shape comes from where it was launched, the hash from what it is.

## 4. Determinism — the constraint the design bends around

`check-plugin-sync.mjs` compares the committed bundle byte-for-byte with a
fresh build, so the version `define` must not cause per-build churn.

On merged main, in the clean checkout, built twice:

```
plugin:check (1st)  plugin-sync OK — 29 tools match, bundle bytes match, 12 skill frontmatters parse
npm run build
plugin:check (2nd)  plugin-sync OK — 29 tools match, bundle bytes match, 12 skill frontmatters parse
committed bundle    97f6ca41472d5eb8bc1efe67e523fdb33d0dc4f19181ffb325f2dd4b939fbd34
```

The bundle reproduces to **the same hash in two independent checkouts with
independent `node_modules`** — `97f6ca41` in `.worktrees/mcp-012` and again in
`.worktrees/verify-mcp012`.

Pre-merge, the *intended* churn was also demonstrated: bumping the root version
0.3.2→0.3.3 changed the bytes to `142de977…` and `plugin:check` **failed**;
restoring returned `97f6ca41…` and green. That is the empirical case for
`release.mjs` step 5b — without a rebuild after the bump, v0.3.3 would ship a
bundle reporting 0.3.2 *and* leave `plugin:check` red on main.

## 5. Full rail on merged main

```
npm install (fresh)      clean
npm run build            ok
npm run plugin:check     29 tools match, bundle bytes match, 12 skill frontmatters parse
npm run typecheck        clean (all workspaces)
npm test                 core 193/193 · gui 232/232
npm run smoke:protocol   26/26
npm run smoke:discovery  13/13   (incl. rootSource=init — ADR-0012's 7th value)
smoke.mjs                133/133 (was 85 pre-MCP-010; +13 identity checks here)
```

The 13 identity checks are not shape assertions: `server.sha256` is compared
against a `node:crypto` hash of the spawned file **recomputed inside the test**,
so a server returning a constant would fail them.

The GUI flake seen intermittently during implementation
(`kanmerGit.test.ts > ensureBoardWorktree reconciliation`, 5s timeout + EPERM on
Windows temp dirs under load) did **not** occur here: 232/232.

## 6. Governing doc

`docs/functional/frd/FRD-022-mcp-server-surface.md` — R5 and R6 met; R5b and
R5c added, the release-rail half explicitly operator-authorised
(`scratch/operator-answers.md`). No new ADR: ADR-0012 already owns root
resolution, and `RootSource` is imported from `@kanmer/core` rather than
re-declared, so the seven-value vocabulary (including `init`) cannot drift.
