## Raw evidence log (2026-08-16)

**Headless / plain-Node test — the decisive one.**
Copied `packages/mcp-server/dist/standalone/kanmer-mcp.cjs` to a scratch dir with
no reachable `node_modules` for its externalised optional requires
(`ajv-formats`, `esprima`, `fsevents` all confirmed NOT RESOLVABLE from there),
then ran the existing smoke harness against it under plain Node v24:

```
KANMER_SERVER=<scratch>/kanmer-mcp.cjs node packages/mcp-server/src/smoke.mjs
→ 120/120 checks passed
```

Same run against the in-repo bundle: also 120/120. So the standalone bundle is a
single self-sufficient file under plain Node. Windows only — macOS untested.

**Grep for Electron in `packages/`** returns only comments and the `smoke*.mjs`
`KANMER_NODE` opt-in. Zero `import`/`require` of `electron` in any package.

**Dependency graph.** `@kanmer/mcp-server` → `@kanmer/core`, `@modelcontextprotocol/sdk`,
`zod`. `@kanmer/core` → `chokidar@3`, `gray-matter`, `yaml`, `zod`. All pure JS;
the only native thing anywhere is chokidar's *optional* `fsevents` (darwin only).

**Externalised requires left in the bundle** (tsup `noExternal: [/.*/]` still
leaves dynamic ones): `fsevents`, `esprima`, `ajv/dist/runtime/*`,
`ajv-formats/dist/formats`. All are optional/guarded — proven by the isolated run.

**Watcher is lazy.** `watchKanmer` is only called from `ensureSubscriptionWatcher()`
(`index.ts:1010-1013`), reached only on an MCP `resources/subscribe`. So chokidar
(and therefore fsevents) is not even loaded unless a client subscribes.

**No GUI coupling.** No `child_process`, no git, no IPC, no port, no lockfile in
`packages/core/src` or `packages/mcp-server/src` — the server is plain fs I/O
over `.kanmer/`. `git`/`spawn` live only in `apps/gui/src/main/kanmerGit.ts`.

**Already-plain-Node invocation in the repo:** root `package.json` `inspect`
script runs `node packages/mcp-server/dist/index.js --root ./sandbox`.

**MCPB docs consulted** — see research/mcpb-format.md for URLs.

**Release rail:** no `.github/` at all; `scripts/release.mjs` + electron-builder
`publish: github` is the only artifact pipeline. `scripts/build-plugin.mjs` is
the existing "copy the standalone bundle into a distributable" precedent, and
`scripts/check-plugin-sync.mjs` byte-compares the copy against a fresh build.
