---
status: approved
covers: shipped server (backfill) + v3 tool delta (groups, profiles, removals)
---

# FRD-022 — MCP server surface

The agent-facing contract. Local stdio server; root resolved `--root` → `KANMER_ROOT` → **board discovery from cwd upwards** → `--init`, and otherwise **fatal** (ADR-0012); **reads never create `.kanmer/`** — only an actual write does, and only where a root was asserted or `--init` was passed.

- R1. **Tool inventory (end-state), by category.** Read: get_status, list_board, list_items, get_item, get_ticket_doc, search_items, get_links, get_activity, get_doc_gates, **get_group, list_groups, get_group_doc**. Write: create_item, create_items (cap 50), update_item, move_item, take_ticket, set_ticket_doc, append_scratch, link_items, link_doc, migrate_board, **create_group, update_group, set_group_doc**, column tools (kind: **area only** — status and priority kinds removed per FRD-007/008). Destructive: delete_item, remove_column.
- R2. Annotations are honest: `readOnlyHint` on every read, `destructiveHint` only where true — this is what makes host approval modes work.
- R3. Descriptions are a contract layer (ADR-0009): they teach profiles, gates, the read-everything duty, and group context in-line; `get_doc_gates` is named as the orientation call before any move; parameter docs never contradict the core.
- R4. Actor attribution via `_meta` client identity feeds the activity log; MRTR elicitation guards destructive ops where the host supports it; resources/subscriptions and prompts remain; the take-ticket prompt text is core-SSOT shared with dispatch (FRD-010 R2).
- R5. `list_board`/`get_status` surface: the fixed stages, areas, group kinds, profiles, proof types, deployment envs, doc-type vocabulary — everything a skill needs without bespoke calls.
- R5a. **`list_items` filters by `group`.** Filters are AND-composed, and an unknown group id returns nothing rather than erroring — a filter asks a question, it does not assert one (ids are validated on write instead, FRD-001 G3). This is the supported way to build a working roster from an epic or horizon: summaries carry `profile`, `taken` and `docs`, which the derived member list from `get_group` does not, and which kanmer-auto needs for its drop rules and profile partitioning (FRD-023 R2). It is also the MCP-side counterpart of the group filter FRD-001 G8/AC4 already requires of every GUI view.
- R5b. **`get_status` answers *which board* and *which server*.** Board: `projectRoot` with `rootSource` (ADR-0012's seven-value vocabulary), and `repoRoot` with `repoRootSource` (`flag`/`env`/`derived`) — the root governing-doc `refs` resolve against, which differs silently between hosts because `.codex/config.toml` passes `--repo-root` and `.mcp.json` does not. Server: a `server` block — release `version` (build-time `define`), the resolved `path`, a runtime `sha256`/`sha256Short` of the running script's own bytes, `mtime`, `size`, and the `build` shape (`packaged`/`plugin`/`dev-standalone`/`dev-esm`/`unknown`) derived from the path. The failure this closes is not that builds differ — a released app and a working checkout always will — but that the difference was **unobservable from inside a session**: two hosts on one board ran bundles that enforced different gates and `get_status` returned identical output for both. Constraints: the stamp is a **pure function of the source tree** (no timestamp, no git sha — R6's byte comparison forbids both); the hash is computed at runtime, lazily, cached per process; every field degrades to `null` rather than failing the orientation call. Detection is **one-sided**: pre-0.3.3 servers omit the block, and that absence is the signal.
- R5c. **The release commit carries the bump and the artifacts derived from it.** Because the version is compiled into the bundle, `scripts/release.mjs` rebuilds the standalone bundle and refreshes the committed plugin bundle *after* the bump and *before* the pack, then re-runs `plugin:check`. Without it a release would ship a bundle reporting the previous version and leave `plugin:check` red on main.
- R6. The release rail binds this surface to the skills: `tool-reference.md` rows must match tool names (`plugin:check`), the bundled `kanmer-mcp.cjs` must be byte-current (`plugin:build`), and `smoke.mjs` exercises every tool over real stdio. The byte comparison is what forces R5b's determinism rule, and R5c is what keeps it satisfiable once a version is compiled in. It is also only meaningful **where the artifact was built**, so `plugin:check` refuses to run from a linked git worktree instead of reporting a pass it cannot support (MCP-007) — a worktree has no `node_modules`, both sides are then built against the main checkout's core, and they agree for the wrong reason. `release.mjs` runs the check from the repo root, so the rail is unaffected.

**Acceptance:** smoke green across the full inventory incl. group tools, profile-gated moves, nested doc paths, proof warnings, and migrate_board dry-run; plugin:check passes at the final count.

Related: FRD-001/002/003/006/007/008 · ADR-0009 · **ADR-0012 (root resolution / board discovery)** · AGENTS.md §7.

## Verified against code — Phase 0.2

`packages/mcp-server/src/index.ts` is the only file in the repo calling `registerTool`.

- Root resolution *was* exactly `--root` → `KANMER_ROOT` → `cwd`. **Superseded by ADR-0012**
  (MCP-010): the bare cwd fallback found no board on the layout Kanmer's own desktop app
  creates (`<repo>/.worktrees/kanmer`), and reported an empty board instead of saying so.
  The order is now `--root` → `KANMER_ROOT` → **discovery** → `--init`, else a fatal error
  naming every path tried; the resolver returns `{ root, how, tried }` and `get_status`
  surfaces `how` as `rootSource`. Resolution is applied once, **inside `main()`** so a
  not-found throw reaches the fatal handler, and echoed to stderr with its provenance.
  Reads still never create `.kanmer/`: `init` is lazy and only the `write()` wrapper calls
  `ensureInit()` — `--init` governs whether that write is permitted to create a board, it
  does not make a read create one.
- R1 — **30 tools registered** (recounted from `registerTool` call sites, MCP-006): the 12 reads
  listed, 16 writes, and 2 destructive. The count reached the end state via the six group tools —
  the five above plus **`update_group`** (MCP-006), which is what makes FRD-001 G4's
  archive-as-retirement performable and closes the gap where `list_groups` and `set_group_doc`
  described operations no tool offered. The Phase 3 column-tool delta is **done**: `kind` is
  `z.literal("area")` (`index.ts:215`), so the status and priority kinds are gone.
  `create_items` caps at 50.
- R2 — every read carries `readOnlyHint: true`; `destructiveHint: true` appears on exactly two,
  `remove_column` `index.ts:744` and `delete_item` `index.ts:800`.
- R3 — descriptions are hand-authored prose in each `registerTool` call, with per-field
  `.describe()`. **There is no generator**, and `plugin:check` compares tool *names* only
  (`scripts/check-plugin-sync.mjs:39-45`, which deliberately stops reading at `## Field
  semantics`) — so description drift is currently unguarded. Worth fixing in Phase 3.
- R4 — actor from `_meta` client identity `index.ts:62,80-88`; elicitation guard
  `confirmDestructive` `index.ts:96-114`; resources `kanmer://board` `index.ts:829` and
  `kanmer://items/{id}` `index.ts:848-873` with subscriptions `index.ts:895-904`; prompts `standup`
  `index.ts:910` and `take-ticket` `index.ts:935`, the latter sharing `takeTicketPromptText` with
  the GUI's dispatch (`apps/gui/src/main/dispatch.ts:98`) — the SSOT R4 claims, confirmed.
- R6 — the rail is real: `plugin:check` passes at 24 tools with matching bundle bytes, and
  `smoke.mjs` covers the surface at 85 checks, `smoke-protocol.mjs` at 26.

Note `packages/mcp-server` has **no unit tests** — the `.mjs` smoke scripts are its entire
automated coverage, which is why Phase 3 extends them rather than adding vitest. Still true
after MCP-010: board discovery is covered by a third smoke script (`smoke-discovery.mjs`,
`npm run smoke:discovery`), and the resolver's unit tests live in `@kanmer/core`
(`discover.test.ts`) precisely so this decision did not have to be overturned.
