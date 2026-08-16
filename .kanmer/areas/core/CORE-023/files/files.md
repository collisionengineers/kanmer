# Files — CORE-023

## Files the change touches

| Path | What changes | Risk |
|---|---|---|
| `packages/core/src/staleness.ts` **(new)** | The detector: given `paths` + a bundled fingerprint, return the itemised `stale[]` list. Pure-ish, filesystem reads only, every read wrapped so a failure yields `state: "unknown"`. Belongs in core so both the server and the GUI use one implementation. | **Medium** — new module, but no existing behaviour to break. The risk is scope creep: it must not fix anything, only report. |
| `packages/core/src/staleness.test.ts` **(new)** | Vitest cases: clean repo, block drifted, skill file drifted, skills unstamped, `board.yml` missing `questions-resolved` → `compensated`, unreadable artefact → `unknown`. | Low |
| `packages/core/src/version.ts` | Add an optional `reconciledWith?: string` (product version) + `reconciledAt?` to `KanmerVersion`. Optional, so old `version.json` files stay valid and `readVersion`'s `typeof parsed.format === "number"` guard is untouched. | **Medium** — this is the field `kanmer-setup` §2 already assumes exists. Writing it is setup's job, not this ticket's; adding the field without a writer leaves it permanently absent, which must be treated as `unknown`, not `behind`. |
| `packages/core/src/index.ts` | Export the new detector + types. | Low |
| `packages/mcp-server/src/index.ts` | `get_status` handler (**lines 216-257**): add the `repo` block; extend the tool `description`. | **HIGH — conflicts with [[MCP-012]], see below.** |
| `packages/mcp-server/src/*` (build config) | Bake the bundled fingerprint (skills manifest + canonical AGENTS block hash) at build time via esbuild `define`, or generate a committed `bundled-fingerprint.json` from the source tree. | **HIGH** — `scripts/check-plugin-sync.mjs:57-76` demands byte-reproducibility. A source-derived manifest is deterministic and safe; anything time- or git-derived is not. Same rail MCP-012 is negotiating. |
| `scripts/agents-block.mjs` | Export the canonical body's hash (or let the fingerprint generator import `BLOCK_BODY`). No behaviour change. | Low — but it is the file the whole AGENTS detection anchors on, so which of the three bodies is canonical must be settled first (open question). |
| `apps/gui/src/main/index.ts` | New IPC handler exposing the same report (if the GUI ships in this ticket). | Medium — `snapshotOf` (468-477) is on the hot refresh path; add a separate handler rather than widening the snapshot. |
| `apps/gui/src/shared/ipc.ts` | Channel + result type for the above. | Low |
| `apps/gui/src/renderer/src/App.tsx` | Surface the itemised list near the existing format banner (1103-1125). | Medium — banner real-estate; must not become a permanent nag for `compensated` rows. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | `get_status` row updated. | Low — but `plugin:check` compares tool *names* only, so prose drift is not caught mechanically. |
| `AGENTS.md` §7 | Same prose update. | Low |
| `packages/mcp-server/src/smoke.mjs` | Extend the `get_status` assertions (lines ~103-200) — the only executable test of this tool; mcp-server has no vitest suite. | Medium — smoke fixtures build a sandbox board; the new fields need an AGENTS.md and a skills dir in the fixture or must degrade to `unknown` cleanly. |

## Ripple effects

- **`plugins/kanmer/mcp/kanmer-mcp.cjs` must be rebuilt and re-committed** — any
  change to `packages/mcp-server/src` invalidates it and `npm run plugin:check`
  fails until `npm run plugin:build` runs. Non-optional, and it makes the diff
  carry a 1.4 MB binary blob.
- **`scripts/release.mjs`** — if the fingerprint is a build-time define keyed on
  anything version-shaped, the release order problem MCP-012 documented
  (build/plugin:check at 149-163, bump at 184-192, no MCP rebuild after) applies
  here identically. A pure content manifest sidesteps it entirely; prefer that.
- **False-positive blast radius.** Every existing Kanmer repo has a `board.yml`
  without `questions-resolved` (finding 5). If that reports `behind` rather than
  `compensated`, every board on earth shows a warning on every `get_status`, and
  the report is dead on arrival.
- **`scripts/verify-agents-block.mjs`** asserts the block round-trips; if the
  canonical body moves or gains a hash export, this must still pass.
- **Skills prose** — `kanmer-setup` SKILL.md §2 ("apply version steps") becomes
  actionable for the first time and should name the new report. Touching skill
  prose collides with [[SKILL-013]] (carrying reconciliation rules into AGENTS.md
  and skill prose) — coordinate.
- **`apps/gui/src/main/agentsBlock.ts` is stale v2 text and is what Connect
  writes** (research finding 4). Any detector comparing against the canonical
  body will immediately flag every repo the current GUI has connected. That is
  correct behaviour and a genuine bug surfaced — but it means the fix to
  `agentsBlock.ts` should land *before or with* the detector, or the first thing
  the feature does is report a fault of Kanmer's own making.

## File overlap with MCP-012 — read this before scheduling

Both tickets edit **`packages/mcp-server/src/index.ts`, the `get_status` handler,
lines 216-257** — the same ~40-line span, both adding a top-level block to the
same returned object and both rewriting the same tool `description` string.

- MCP-012 adds `server: { version, path, sha256, buildShape }` — *which binary is answering*.
- CORE-023 adds `repo: { upToDate, stale[] }` — *whether this repo's artefacts are current*.

They are semantically independent and textually adjacent. Consequences:

- **Running them in parallel guarantees a merge conflict** in that handler and in
  the tool description, plus a second one in
  `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`, plus a
  third in the regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs` bundle (a binary
  blob — unmergeable, must be rebuilt by hand on whichever lands second).
- **They also share the build-rail decision**: both want something baked into the
  standalone bundle, and both are constrained by
  `scripts/check-plugin-sync.mjs`'s byte-reproducibility requirement. Two
  independent answers to that question would be worse than one.
- **Recommendation: sequence them, MCP-012 first** (it is already through
  research and its research settled the build-rail constraints this ticket
  inherits). CORE-023 then adds `repo` alongside an existing `server` block and
  rebuilds the bundle once.
- MCP-012 additionally conflicts with MCP-010 (both edit `root.ts` + `index.ts`),
  per its own research — so the whole `index.ts` lane is single-file serialised.

## Deliberately out of scope

- **Fixing** anything. No auto-migration, no auto-refresh of the block, no skill
  re-copy. `get_status` stays `readOnlyHint: true`; FRD-013 / `kanmer-setup` is
  the repair path.
- The stale-binary question — [[MCP-012]].
- Repairing `apps/gui/src/main/agentsBlock.ts`'s v2 body (see open-questions —
  likely its own ticket).
- Bumping `plugin.json` / `mcp-server/package.json` / `release.mjs`'s version
  handling. The detector is designed to need none of it.
- Removing skills that Kanmer has since deleted — [[GUI-080]].
- Provider MCP registration drift (row 8 of the enumeration) beyond *reporting*
  it; reconciling registrations is Connect's job.

## Context files — read these before implementing

| Path | What it tells you |
|---|---|
| `packages/core/src/board.ts:46-106` | Why `board.yml` staleness is "compensated" not "broken", and the explicit trade-off comment saying the file no longer lists every effective requirement. The single biggest false-positive trap. |
| `packages/core/src/store.ts:161-192` | `detectFormat` and *why* it re-stats: the GUI migrates underneath a live MCP server. Any cached staleness result inherits this hazard. |
| `packages/core/src/paths.ts:19-54` | `repoRoot` vs `projectRoot`. AGENTS.md and `.claude/skills/` are under `repoRoot`; the board is under `projectRoot`. Getting this backwards makes the detector report `unknown` on every worktree board. |
| `apps/gui/src/main/connect.ts:36-70, 144-210` | The three bundle layouts, `bundledSkillsVersion()` reading the never-bumped `plugin.json`, and the existing (inert) stamp comparison. |
| `apps/gui/src/main/agentsBlock.ts:1-24` | The stale v2 block body that Connect actually writes, and the "Phase 8 reconciles the two" comment that never happened. |
| `scripts/agents-block.mjs:1-38` | The canonical body, and the hand-maintained KEEP-IN-STEP contract with `kanmer-setup/SKILL.md`. |
| `scripts/check-plugin-sync.mjs:57-76` | The byte-reproducibility rail. Anything baked into the bundle must be a pure function of the source tree. |
| `packages/mcp-server/src/index.ts:216-257` | The handler both this ticket and MCP-012 edit. |
| `.kanmer` ticket `MCP-012` → `research` | Already-done analysis of the build/release rails, the three-shapes problem, and the "absence of the block is itself the signal" convention. Do not re-derive it. |
| `apps/gui/src/renderer/src/App.tsx:1103-1125` | The existing format banner — the precedent for how staleness is shown to a human, and the place a second banner would compete with. |
