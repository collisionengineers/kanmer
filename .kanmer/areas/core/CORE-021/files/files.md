# Where the change lands

## Core — the rule itself

| Path | Why |
|---|---|
| `packages/core/src/git.ts` | **New.** The first subprocess in core. Copy `kanmerGit.ts:22-25`'s helper shape verbatim: argument array, explicit `cwd`, `windowsHide: true`. Every failure returns "unknown", never throws. |
| `packages/core/src/store.ts:1162-1205` `assertDocGate` | The insertion point. **After** `firstBlocking` returns clean (`:1192`) — the collapse and missing-doc rejections are pure and cheap, and a git spawn must not run on a move already refused. |
| `packages/core/src/index.ts:1-19` | Flat `export *` barrel; a new module needs a line here and everything it exports becomes public API. |

## Core — tests

| Path | Why |
|---|---|
| `packages/core/src/store.test.ts:727-763` | Where the sibling gate tests live (`:727` collapse, `:741` stageEntered, `:759` refused-move). New cases belong beside them. |
| `packages/core/src/store.test.ts:741-757` | **Will break** if its fixture gains a `branch` — it moves `preparing → implementing` twice. The canary. |
| `packages/core/src/docs.test.ts:351-386` | The existing two-root test pattern in core (fakes `.worktrees/kanmer` with `fs.mkdir`). Extend this shape, not a new one. |

## Docs and the surfaces that restate gates

| Path | Why |
|---|---|
| `docs/functional/frd/FRD-002-requirement-profiles.md:29` | The "Open design question" paragraph **is** this ticket. Resolve it into a numbered rule; do not leave the timestamp suggestion standing. |
| `docs/architecture/adr/ADR-00NN-core-may-read-git.md` | **New.** "Core shells out to git" is the architecturally novel part and outgrows a line in an FRD. |
| `packages/mcp-server/src/index.ts:672` | `move_item`'s description — ADR-0009 layer 2, outranks the skills. `:694` `take_ticket` too, if its behaviour changes. |
| `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md:30` | Follows the description. `plugin:check` compares names and bytes only, so drift here is invisible to it. |
| `docs/functional/frd/FRD-016-take-and-worktree-model.md:10` | R1 records that `take_ticket` stores the branch; a new consumer belongs in its traceability. |

## Context files — read these to avoid a trap

| Path | What it tells you |
|---|---|
| `packages/core/src/store.ts:666, 752, 840` | The three `assertDocGate` callers pass **different snapshots** — `next` from `updateItem`, `current` from the other two. The rule's behaviour depends on which. |
| `packages/core/src/store.ts:837-846` `takeTicket` | Defaults to `stage: "implementing"`, so a take *is* a leave-preparing move; it is safe only because `:840` passes `current`, whose `branch` is still the old one. Change that and take_ticket breaks. |
| `packages/core/src/store.ts:722-737` | The two-phase move. `assertMoveAllowed` pre-flights **only for positioned moves**, then `updateItem` gates again — two calls. The comment calls the double-check "cheap"; a subprocess makes that false. |
| `apps/gui/src/renderer/src/components/Board.tsx:107-112, 181` | Every drop passes a `position`, so every GUI drag takes the double-gate path. |
| `packages/core/src/profiles.ts:120, 125, 129` | `spike` declares **no** `leave-preparing` requirement. A rule expressed as a profile requirement would silently skip spikes — it must be a precondition, outside `requirementsFor`. |
| `packages/core/src/store.ts:1212-1238` `gateReport` | The `EvidenceProbe` is document-evidence only. Adding a git probe here changes `get_doc_gates` for MCP, the GUI panel and every skill — decide deliberately. |
| `packages/core/src/paths.ts:31-66` | `projectRoot` (board) vs `repoRoot` (source). `repoRoot` falls back to `projectRoot`, so it may be a folder with no git at all. |
| `packages/mcp-server/src/root.ts:20-32` | An MCP server registered before `--repo-root` existed passes `undefined`; a board worktree at a non-standard path then gets `repoRoot === projectRoot`. |
| `packages/mcp-server/src/smoke.mjs:206` | Calls `take_ticket` with a branch in a sandbox that is **not a git repo**, then moves. Free coverage of the degrade-to-allow path — it fails if the rule throws. |
| `apps/gui/src/main/kanmerGit.ts:22-48` | The house git helper and its failure idiom (`try/catch → null`, `.then(()=>true).catch(()=>false)`). Match it. |
| `apps/gui/src/main/kanmerGit.test.ts:29-49` | The only real-git test in the repo: temp dir, `git init`, **`git config user.email`/`user.name`** (required or commits fail), teardown with `maxRetries: 3` for Windows locks. |
| `packages/core/package.json:23-28` | Deps are chokidar / gray-matter / yaml / zod. No subprocess today, and core is bundled into `plugins/kanmer/mcp/kanmer-mcp.cjs`. |

## Ripple effects

- **Release rail**: core changes ⇒ `npm run plugin:build` + `plugin:check` (AGENTS.md §8 gotcha 8).
- **`plugins/kanmer/mcp/kanmer-mcp.cjs`** is generated — never hand-edited.
- **Two stale mirrors exist** under `.claude/skills/` (`kanmer-tickets/references/tool-reference.md`, and the `kanmer-research` skill this ticket was researched with still describes v2 stages). Out of scope here; worth its own ticket.

## Out of scope

Uncommitted work; the `firstWritten`-per-document alternative; making the
precondition visible in `get_doc_gates` (a separate decision, recorded in
open questions).
