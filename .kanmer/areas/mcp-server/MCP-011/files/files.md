# MCP-011 — Files this change touches

Baseline: `origin/main` at `c81063e` (which already carries `741ef81` MCP-010 and
`9ac20af` GUI-080).

## Changed

| File | Change | Risk |
|---|---|---|
| `plugins/kanmer/mcp/claude.mcp.json` | `command` → `${KANMER_NODE:-node}`; add `"env": {"ELECTRON_RUN_AS_NODE": "1"}`. Keep `${CLAUDE_PLUGIN_ROOT}` args and no `--root`. | **Low-medium.** Serves claude *and* grok. Both verified to expand `${VAR:-default}` (research F1, F2). If a future host reads this file without that support, the command becomes a literal and the server fails to start — which is why the rail check pins the shape. |
| `plugins/kanmer/.mcp.json` | `command` → `node` (unchanged), `args` → `["mcp/kanmer-mcp.cjs"]` (relative), add `"cwd": "."`, add `"env": {"ELECTRON_RUN_AS_NODE": "1"}`. **Remove `${PLUGIN_ROOT}`.** | **Medium.** This is the file that has never worked (research F3). `cwd: "."` is verified on codex and verified *not* to work on grok — so the two files must not be unified. agy also reads this file (F5) and remains broken either way; no regression. |
| `plugins/kanmer/.claude-plugin/plugin.json` | `version` `0.1.0` → repo version | Low. Unblocks `bundledSkillsVersion()`. |
| `plugins/kanmer/.codex-plugin/plugin.json` | `version` `0.1.0` → repo version | Low. Changes codex's cache directory (`…/kanmer/<version>`) — intended. |
| `scripts/check-plugin-sync.mjs` | New rail: both `plugin.json` versions equal `package.json`; each manifest's invocation *resolves* to a real file under `plugins/kanmer`; `.mcp.json` contains no `${…}` token (no host expands one). | Low. Additive; the script is already a rail (`npm run plugin:check`). |
| `scripts/release.mjs` | `bump()` the two `plugin.json` files alongside the two `package.json` files | **Low but load-bearing** — this is what stops the drift recurring rather than just detecting it. `bump()`'s regex targets the first `"version": "…"`; both plugin manifests have `version` as their second key with no earlier `version` string, so the existing helper works unmodified. |
| `apps/gui/src/main/connect.test.ts` | Add a test that runs the **real** `skillsStatus()` against the **real** `plugins/kanmer` manifest: bundled version equals `package.json`, and an older stamp yields `updateAvailable: true`. | Low. Needs `getAppPath` mocked to the real repo path (today `"/unused"`) — do it in a separate `describe` with its own `vi.mock` seam rather than changing the existing global mock, which other tests rely on. |
| `docs/functional/frd/FRD-012-connect.md` | New **R6**: the plugin-runtime matrix — which install paths reach the Electron binary and which hard-depend on Node on PATH, each with the command that established it. Update the R2 codex bullet (its plugin MCP registration has never launched) and the closing open-work line (MCP-011 is no longer just "frozen at 0.1.0"). | Low; doc is `draft`. |

## Ripple effects

- **`bundledSkillsVersion()` / `skillsStatus()` / `Settings.tsx:392-412`** — not
  edited, but their behaviour changes: this is the whole point. The bump is what
  makes [[GUI-080]]'s merged reconciliation reachable.
- **codex plugin cache path** moves from `…\kanmer-plugins\kanmer\0.1.0` to
  `…\0.3.x`. Anyone with the old cache keeps a stale directory; `codex plugin
  remove` clears it. Worth a line in the post-implementation report.
- **`npm run plugin:check` now requires `npm run build` first** (already true —
  the byte-comparison rail added that). The new assertions are file-only and add
  no build dependency of their own.
- **The committed bundle** `plugins/kanmer/mcp/kanmer-mcp.cjs` is byte-compared
  against a fresh build. This change does not touch server source, so no rebuild
  should be needed — but [[MCP-007]] records that worktree module resolution has
  bitten twice. `npm install` inside the worktree first.
- **README** install section documents claude + codex only. The `KANMER_NODE`
  escape hatch needs a line somewhere a user will find it; FRD-012 R6 is the
  requirement, README is the user-facing statement. Small addition.

## Deliberately out of scope

- **[[MCP-013]]** — the marketplace root (`pluginRoot()` vs the repo-root
  manifest), the swallowed non-zero exit at `connect.ts`, the packaged app
  shipping neither marketplace JSON, the two marketplace names, the two
  `${…}_ROOT` variables. Re-encountered throughout the research; worked around by
  passing the repo root by hand. **Does not block this ticket's verification.**
- **agy's plugin-supplied MCP server cannot launch** (research F5) — a new
  finding, upstream-limited, needs its own ticket. Not repairable from these two
  files.
- **[[MCP-014]]** grok's install path, **[[MCP-015]]** Antigravity binding,
  **GUI-079** the `.mcp.json` key collision. Untouched.
- Changing which file each host reads, or unifying the two manifests. Research F4
  proves they cannot be unified.

## Context files — read before touching this

| File | What it tells you |
|---|---|
| `apps/gui/src/main/connect.ts:36-52` | `serverInvocation` — why Connect uses `process.execPath` + `ELECTRON_RUN_AS_NODE=1`. The contradiction this ticket resolves. |
| `apps/gui/src/main/connect.ts:64-72, 332-357` | `bundledSkillsVersion` / `skillsStatus` — the exact reason the version freeze kills the update affordance. Both installed and bundled versions come from one constant. |
| `packages/core/src/discover.ts` | MCP-010's resolver. The `.git` **file** vs **directory** distinction is the non-obvious part and is what makes omitting `--root` safe from inside a linked worktree. |
| `scripts/check-plugin-sync.mjs` | The rail's existing shape, and its comment explaining why it needs a prior `npm run build`. |
| `.kanmer/…/MCP-009/research/research.md` | The provider-by-provider evidence base. Finding 6's manifest table is this ticket's starting point; Finding 2's `codex mcp list` line is the proxy that research F3 overturns. |
| `.kanmer/…/MCP-009/scratch/adjudication.md` | "Verify the mechanism, not a proxy for it." The reason every claim here is a tool call, not a listing. |
| `AGENTS.md` §10 | Verification checklist — and the warning that Connect writes a stale v2 block into this repo. Check `git status` after running Connect. |
