# Post-implementation report — CORE-023

## Summary

`get_status` now answers a third question beside MCP-012's two. `server` says
*which binary is answering*; the new `repo` block says *whether what that binary
left behind in this repo kept up* — `{ upToDate, stale: [{ artefact, state,
detail, fix }] }`, itemised, never a bare boolean. It covers the artefacts
migration does not touch: the AGENTS.md managed block, the installed skills trees
and their `.kanmer-skills-version` stamps, `board.yml`, and the provider MCP
registrations. Comparison is by **content hash**, because every version string in
reach is stale — `version.json` records no product version and `plugin.json` was
frozen at `0.1.0`, which is exactly why the shipped "Update skills" comparison
could never fire for any release ever published. Detection only: `get_status`
stays `readOnlyHint: true` and every `fix` points at `kanmer-setup` (FRD-013).
On this repo the call takes 36 ms and reports `.claude/skills` 3 files behind,
`.agents/skills` 17 behind and unstamped, `board.yml` `compensated` — and no row
for the user's own `run-kanmer` skill or the correctly-rooted `.mcp.json`.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/core/src/staleness.ts` | added (≈600 lines incl. comments) | The detector. `detectStaleness({paths, board, boardSource, format, bundledSkillsDir})` → `{upToDate, stale[]}`. Lives in core so the GUI follow-up shares one implementation. Every read individually wrapped: a failure becomes `state: "unknown"` for that artefact and never breaks the orientation call. **Not cached** — the obvious next move after reading the report is `kanmer-setup`, and a cached answer would survive its own fix; same hazard `store.detectFormat()` re-stats for (`store.ts:167-171`). |
| `packages/core/src/staleness.test.ts` | added, **34 tests** | Half of them assert a row is *absent*. That is the point: the failure mode this feature dies of is warning about a healthy repo. Includes "a skill the user wrote is not drift", "board.yml omitting `questions-resolved` is `compensated` and `upToDate` stays true", and "move the bundle's canonical body and a clean repo goes `behind`" — the property that lets SKILL-013 rewrite the block text with no change here. |
| `packages/core/src/index.ts` | modified (+1) | Export the detector and its types. |
| `packages/mcp-server/src/bundled.ts` | added | `bundledSkillsDir()` — the known-good reference, resolved from `serverIdentity()`'s already-computed `path` and `build`. One case per shape, `null` (→ `unknown`) for anything else. Consumes MCP-012's values; re-derives nothing. `skillsDirFor()` is split out as a pure function of (path, shape). |
| `packages/mcp-server/src/index.ts` | modified (+23/-2) | The `repo` block after `server` in the `get_status` handler, plus the tool-description paragraph. The edit is confined to the handler and the description string, because [[MCP-006]] is queued behind this on the same file. |
| `packages/mcp-server/src/smoke.mjs` | modified (+78) | 8 new checks. mcp-server has no vitest suite, so this is the only executable end-to-end test of the tool — and it is held to the standard MCP-012's block was: it makes the sandbox stale on purpose and requires the verdict to change, rather than asserting a field exists. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md` | modified | The `get_status` row gains the `repo` contract. |
| `AGENTS.md` §7 | modified (+7, **0 deletions**) | A "Repo staleness" paragraph beside "Server identity", carrying the four rules that are easy to break. `git diff AGENTS.md` verified: the managed block is untouched. |
| `docs/architecture/adr/ADR-0013-staleness-by-content-not-version.md` | added | The decision, and the enumeration table of what migration does and does not cover. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | rebuilt | Mandatory: any `packages/mcp-server/src` change invalidates the committed bundle. |

## Governing docs

- **FRD-013 — Setup as reconciliation: meets, and makes R1(b) implementable for
  the first time.** R1(b) requires every setup run to "apply any Kanmer-version
  upgrade steps", and `kanmer-setup` §2 instructs the agent to compare against
  "what the board was last reconciled against" — a value nothing in the codebase
  ever recorded. This supplies that comparison, by content rather than by a
  recorded version, and stops at detection. FRD-013 is unmodified; the repair
  loop it specifies is the consumer, named in every `fix` string. AC4
  (`verify-agents-block` passes after any run) holds — 26/26, and no step touched
  `scripts/agents-block.mjs`.
- **ADR-0008 — one format-3 migration: meets.** The `board-config` `behind` row
  fires on a format-3 board still carrying `priorities`/`statuses`/`docs`, i.e.
  a board that escaped the migration ADR-0008 specifies. Guarded by format, so a
  format-2 board is not scolded for having a format-2 shape — the format banner
  already owns that conversation. Board format itself is deliberately **absent**
  from `stale[]`: it is `get_status.format`, and a second copy would be the
  second source of truth ADR-0008 exists to avoid.
- **FRD-022 R5b — meets its conventions, unmodified.** Inherited verbatim: every
  field degrades rather than failing the orientation call; absence of the block
  is the signal for an older server; and R5b/R6's determinism rule is satisfied
  by adding *no* build-time input at all, so R6's byte comparison and R5c's
  release rebuild are untouched.
- **New: ADR-0013 — Repo staleness is judged by content, not by version.**
  Written for this ticket, `link_doc`'d into `refs`. Records the decision, the
  four-state vocabulary (and that `compensated` is a standing commitment about
  what Kanmer will *not* warn about), the enumeration table, and the four
  alternatives rejected — including the build-time manifest the operator had
  authorised, with the reason it was not needed once MCP-012 landed.

## Risks / follow-ups

- **The one deviation from the plan's inputs, deliberate and recorded.** Research
  proposed baking a content manifest into the bundle and the operator authorised
  it (Q2). Runtime discovery was used instead, because `classifyBuild()` — which
  exists only because MCP-012 landed first — makes the bundled tree a determined
  sibling in all four shapes. A baked *skills* manifest would have made the
  bundle's bytes a function of every skill prose file, so `check-plugin-sync`
  would from then on demand an MCP rebuild after **every skill-prose edit**,
  including [[SKILL-013]]'s in-flight one. The constraint that survived Q2 ("a
  pure function of the source tree") is satisfied by adding nothing at all.
- **Two lists in `staleness.ts` mirror `apps/gui/src/main/providers.ts`** — the
  skill destinations and the registration file paths — because core cannot depend
  on the Electron main process. Commented as such. The GUI follow-up inverts it:
  `providers.ts` reads them from core.
- **The GUI is not covered** (operator's Q3: MCP only, no IPC/preload/renderer).
  It has no MCP client and calls core directly, so it stays blind to everything
  but board format. **A follow-up ticket is filed at closeout** carrying the IPC
  + renderer surface and the `providers.ts` inversion above.
- **`version.json` gains no `reconciledWith` field** (Q8). A field with no writer
  is permanently absent and would report `unknown` on every repo forever. It
  belongs with its writer, under FRD-013.
- **[[SKILL-013]] conflict avoided.** Nothing here touches `agentsBlock.ts`,
  `scripts/agents-block.mjs`, or the canonical body. The reference is read at
  runtime from the bundled `kanmer-setup/SKILL.md`, so SKILL-013's rewrite is
  picked up automatically. Only `tool-reference.md` could conflict textually.
- **[[MCP-006]] is queued behind this on `packages/mcp-server/src/index.ts`.**
  The edit is confined to the `get_status` handler and its description string;
  the merge will be announced.
- **GUI-085** (`kanmerGit.test.ts`) flaked once under load and passed 7/7 alone.
  Pre-existing and untouched.

## Verification hand-off

On merged `main`, from the main checkout:

1. `npm test` — expect green. If `apps/gui/src/main/kanmerGit.test.ts` fails,
   that is **GUI-085**: rerun it alone with `--testTimeout=30000`.
2. `npm run typecheck` — expect green across all four workspaces.
3. `npm run build && npm run plugin:check` — expect
   `plugin-sync OK — 29 tools match, bundle bytes match, 12 skill frontmatters parse`.
   Note it **refuses to run in a linked worktree** by design; run it from the
   main checkout or a clean clone.
4. `npm run smoke:protocol` (26 checks) and `node packages/mcp-server/src/smoke.mjs`
   — the latter is the real end-to-end evidence: **142 checks**, including the
   8 new ones that make a sandbox stale and require the verdict to flip to
   `behind`, then remove the damage and require it to go clean again in the same
   process.
5. `npm run verify:agents-block` — 26 checks, the rail this detector's AGENTS
   reference depends on.
6. **The real-repo call.** `get_status.repo` against this repo. Expect
   `upToDate: false` with `.claude/skills` and `.agents/skills` `behind`,
   `skills-stamp` `unstamped` for `.claude/skills`, `board-config`
   `compensated`, and **no** entry for the user's own `run-kanmer` skill or for
   `.mcp.json`. That single output is all three of the ticket's acceptance
   criteria at once. (Note: a *running* MCP session may still be answering from
   an older installed server, which omits the `repo` block entirely — that
   absence is the documented signal, not a failure. Call the freshly built
   `dist/index.js` directly to see the new field.)
