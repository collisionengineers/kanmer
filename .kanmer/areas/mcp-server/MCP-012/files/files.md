# Files — MCP-012

Surveyed read-only, 2026-08-16. Everything is in `packages/mcp-server` plus the
build/release/doc rails; **`packages/core` is not touched**.

## Where the change lands

| Path | What changes | Risk |
|---|---|---|
| `packages/mcp-server/src/identity.ts` *(new)* | New module: resolve the running script's own path, lazily sha256 its bytes (cached for the process), read its mtime and size, classify the build shape (`packaged` / `plugin` / `dev-standalone` / `dev-esm`) from the path + format, and expose the build-time-injected version constant. All failures degrade to `null`. | **Medium** — must compile correctly in *both* tsup outputs (ESM `dist/index.js`, CJS `dist/standalone/kanmer-mcp.cjs`). `import.meta.url` vs `__filename` is the trap; neither config sets `shims` today. |
| `packages/mcp-server/src/index.ts` | `get_status` handler (216-257) gains a `server` block (version, resolved path, sha256 + short prefix, mtime, size, build shape) and root provenance (`repoRoot`, and how each root was resolved). Tool description (220-221) updated to say what the block means and that its *absence* means a pre-0.3.3 build. `new McpServer({ version: "0.1.0" })` (line 210) switches to the injected version. | **Medium** — result-shape change on the most-called tool; `smoke.mjs` asserts on this shape. Handler must stay cheap and must not throw. |
| `packages/mcp-server/tsup.standalone.config.ts` | Add `define` injecting the version (read from the root `package.json`); possibly `shims: true`. | **Medium** — this file decides the committed bundle's bytes, which `plugin:check` compares exactly. Nothing non-deterministic (no build time, **no git sha**) may go in here. |
| `packages/mcp-server/tsup.config.ts` | Same `define` so the ESM dev build reports the same version. | Low |
| `packages/mcp-server/src/smoke.mjs` | New checks: `get_status.server` exists; its `path` is the script the smoke test actually spawned; its `sha256` equals a `node:crypto` hash of that file computed in the test. This is the regression test — mcp-server has no vitest suite. | Low — but it is the only executable proof, so it has to be written properly rather than asserting `typeof === "string"`. |
| `scripts/release.mjs` | After the version bump (184-192) and before packing (200-201): rebuild the MCP standalone bundle and refresh `plugins/kanmer/mcp/kanmer-mcp.cjs`, so the packaged app ships a bundle stamped with the *new* version and `plugin:check` still passes afterwards. Contradicts the comment at 151-152. | **HIGH** — release rail. A mistake here ships a broken or mis-stamped release. Gated on an operator decision (see open-questions). |
| `scripts/check-plugin-sync.mjs` | Likely no code change; its comment at 12-16 about reproducibility should record that the version define is the one intentional source of byte churn and that it moves only at release. Change only if the release-rail decision goes the other way. | Low |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | Regenerated committed artifact (`npm run plugin:build`). Must land in the same commit as the source change or `plugin:check` fails. | Low, but non-negotiable — a ~1.4 MB diff, easy to forget. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | The `get_status` row (line 10) must describe the new `server` block and root provenance. `plugin:check` compares tool *names* only, so this prose is not mechanically protected. | Low |
| `AGENTS.md` | §7 tool surface / `get_status` description; if the release rail changes, §6's command table and the `plugin:build`/`plugin:check` pairing note need the new step. | Low — but note `AGENTS.md`'s managed block is generated (`scripts/agents-block.mjs`, verified by `npm run verify:agents-block`); edit the right half. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` | R5 extended: the surface now includes server identity. Governing doc for this ticket. | Low |
| `packages/mcp-server/package.json` | Only if the decision is to make its `version` the source of truth (today `0.1.0`, never bumped) — otherwise untouched and its staleness is documented instead. | Low |
| `packages/mcp-server/src/root.ts` | Only if the resolver is made to return *how* the root was found. **MCP-010 rewrites this whole file**, so touching it here is a direct collision. | **HIGH (coordination)** — see Ripple effects. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `scripts/check-plugin-sync.mjs` (esp. 12-16, 57-76) | The committed plugin bundle is compared **byte-for-byte** with a fresh build. This is the single hardest constraint on the design: a build timestamp makes it fail every build, a git sha makes it fail every commit (the bundle is committed, so the embedded sha is always the parent's). Read this before choosing what goes in the stamp. |
| `scripts/release.mjs` 149-202 | The gate order that breaks a naive build-time version: `npm run build` → `plugin:check` → **bump** → `npm run build -w @kanmer/gui` → pack. The MCP bundle is never rebuilt after the bump, so the packaged app would ship the previous version. The comment at 151-152 argues *against* running `plugin:build` mid-release — that argument is what has to be revisited. |
| `apps/gui/src/main/connect.ts` 36-52 | The three paths the server is launched from (packaged `resourcesPath/mcp`, dev `dist/standalone`, dev `dist/index.js`), and that it runs as Electron-as-Node with `ELECTRON_RUN_AS_NODE=1`. Tells you how to classify the build shape from the resolved path, and that `process.execPath` is `Kanmer.exe`, not `node`. |
| `apps/gui/electron-builder.yml` 15-23 | `extraResources` copies exactly one file — `dist/standalone/kanmer-mcp.cjs` → `resources/mcp/kanmer-mcp.cjs`. There is **no `package.json` beside the bundle at runtime**, which is why the version cannot simply be `require`d. |
| `packages/core/src/paths.ts` 22-54 | `repoRoot` is what governing-doc `refs` resolve against and is *derived* from a `.worktrees/<name>` board path when not passed. This is the second silent divergence: `.codex/config.toml` passes `--repo-root`, `.mcp.json` does not. |
| `packages/mcp-server/src/root.ts` | Current resolution order (`--root` → `KANMER_ROOT` → cwd; `--repo-root` → `KANMER_REPO_ROOT` → undefined). Read it to know what "how the root was resolved" can honestly say **before** MCP-010 lands. |
| `packages/mcp-server/src/smoke.mjs` 103-200 | How `get_status` is currently asserted, and that `KANMER_SERVER` / `KANMER_NODE` env vars point the smoke test at an arbitrary bundle — this is how you prove the stamp survives packaging against `apps/gui/release/win-unpacked` without cutting a release (AGENTS.md §6). |
| `packages/mcp-server/src/index.ts` 37-74 | `ok()` / `guard()` / lazy-init conventions. `get_status` is a read and must never trigger `.kanmer` creation; a hash failure must return `null` fields, not an `isError` result. |
| `docs/functional/frd/FRD-022-mcp-server-surface.md` R5/R6 | The requirement being extended, and the release rail (tool-reference rows, byte-current bundle, smoke over real stdio) that any surface change must keep green. |
| `.codex/config.toml` and `.mcp.json` (repo root, untracked) | The two live registrations that produced the measured drift. The reproduction case is literally these two files. |
| `.kanmer/areas/mcp-server/MCP-012/scratch/research.md` | The re-measured shas, counts, sizes and mtimes, so the falsifying case does not have to be re-derived. |

## Ripple effects

- **`plugin:check` / the committed bundle.** Any source change here changes
  `plugins/kanmer/mcp/kanmer-mcp.cjs`; `npm run plugin:build` must run and the
  artifact must be committed together with the source.
- **The release rail.** With a build-time version define, `npm run release`
  needs a rebuild step after the bump or it ships a mis-stamped bundle *and*
  leaves `plugin:check` failing. This is the ripple that makes the ticket bigger
  than its handler diff.
- **`smoke.mjs` and `smoke-protocol.mjs`.** Both run in the release gate.
  `smoke.mjs` gets new assertions; `smoke-protocol.mjs` should stay green
  untouched — verify, don't assume.
- **Documentation triple.** `tool-reference.md`, `AGENTS.md` §7, and FRD-022 R5
  all describe the `get_status` surface. Only the tool *name* is machine-checked.
- **MCP-010 collision.** MCP-010 ("Resolve the board when no `--root` is given",
  also in Preparing, same area, same group HZN-003) rewrites
  `packages/mcp-server/src/root.ts` and says explicitly *"Return the discovered
  root and how it was found, so MCP-012 can surface it."* These two must not run
  as concurrent lanes. Sequence MCP-010 first, or ship MCP-012 reporting only
  what today's resolver knows and let MCP-010 enrich the field.
- **CORE-023 cross-reference.** CORE-023 detects a stale *repo*; this detects a
  stale *binary*. They should reference each other's output, not share code.
- **No GUI ripple.** The Electron app reads `.kanmer` directly and never calls
  `get_status`; `apps/gui/src/main/mcp-sessions.ts` inspects running processes by
  command line and is unaffected.
- **No manual ripple.** `scripts/build-manual.mjs` curates nine FRDs and
  FRD-022 is not among them.
- **One-sided detection.** Older installed servers omit the new block entirely,
  so consumers (skills, humans) must read *absence* as "pre-0.3.3", not as an
  error.

## Out of scope

- **CORE-023** — repo/skill staleness. Deliberately not folded in.
- **MCP-010's discovery algorithm itself.** MCP-012 only *reports* provenance.
- **Acting on drift.** No warning, no refusal, no auto-update prompt: report the
  identity, let the reader compare. Any "your server is stale" verdict needs a
  known-good reference and belongs with CORE-023.
- **Surfacing identity in the GUI** (e.g. in the Sessions/Connect panels).
- **Realigning `packages/mcp-server/package.json` and
  `plugins/kanmer/.claude-plugin/plugin.json` (both `0.1.0`) with the release
  version.** A real inconsistency, but a separate chore unless the version
  decision forces it.
- **Adding a vitest suite to `packages/mcp-server`.** It has none; `smoke.mjs`
  stays the test vehicle for this ticket.
