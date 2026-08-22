<!-- kanmer:instructions:start — managed by kanmer-setup; edits inside will be overwritten -->
# Kanmer operating instructions

This repo's work is tracked on a Kanmer board in `.kanmer/`. In a Git repo set up
through the GUI the board lives in its own worktree, `.worktrees/kanmer`, on the
board branch, and MCP is already rooted there — never create, switch or push that
branch yourself. Your own ticket worktree is a separate thing, recorded by
`take_ticket`.

- Start every session with `get_status`, then `list_board` / `list_items` to find your ticket.
- **Which documents a ticket needs depends on its profile, not on a fixed pipeline.** Call `get_doc_gates <id>` before every move. Not `board.yml` — requirements are injected at resolve time, so its `profiles:` block is not the effective set.
- Stages: backlog → preparing → implementing → review → verifying → done. **A move crosses at most one gated boundary**, so walk the stages one at a time; a jump is refused even when every document exists.
- **Gates constrain `move_item` and nothing else** — creation in any stage is ungated, and `gh pr merge` is outside the engine, so an unmet gate never stops a merge.
- An unticked `- [ ]` in `open-questions/` blocks a move: tick it, or move it below the literal `## Parked (explicitly deferred)` with a reason.
- Read the whole ticket folder before starting — documents are folders (`research/`, `plan/`, …), so there may be several files per type. If the ticket is in a group, read the group's `context.md` too: the constraint binding the batch is written once, there.
- Work each ticket on its own branch and worktree: worktree `.worktrees/<id>`, branch `<id>-<slug>`; `take_ticket` records both and moves the stage.
- Write pipeline documents with `set_ticket_doc`. Running notes go to `append_scratch` — scratch is the notepad and is never gated, and neither is anything under `reference/` or `assets/`.
- Proof is written on merged `main`, after review and the merge, not before.
- Archive, don't delete. Reference other items with [[ID]] wiki-links.
- Skills run in this order: kanmer-tickets → -research → -plan → -execute → -review → -verify → -closeout. How far a ticket walks it depends on its profile, so ask `get_doc_gates` rather than assuming every step. Off to the side: -auto (drives that order over many tickets), -docs (governing docs), -groom (fix the board), -report (read-only), -setup (reconcile after a Kanmer update).
- Each skill ends by naming what comes next — read that line before improvising a hand-off.

## Agent conduct

**Scope**

1. **Scope is the brief.** “While I’m here” changes are follow-up tickets, not commits.
2. **Never absorb another ticket’s scope.** Link it and let it be worked on its own record.
3. **Release and remediation work ships no new features.**
4. **The ticket precedes the branch.** No board record, no PR.
5. **Stop at the stop condition.** Never merge your own PR or start the next ticket; report deviations instead of redesigning.

**Build**

6. **Greenfield has no legacy.** Unless the brief names users or data, add no fallback, compatibility, or deprecation path; delete what you replace.
7. **Reuse before build.** Name the helper, port, or route you extend; report a genuinely unfit one instead of silently building a parallel copy.
8. **One list per concept.** A second copy in another layer is duplication, even when it is “just strings”.
9. **Paths are relative.** Use repo-root-relative or injected configuration, never machine-specific paths.
10. **Dependencies are approvals.** Add no package unless the brief lists it.
11. **Concurrency results are never discarded.** Retry, defer, or surface them; a swallowed conflict is data loss.
12. **Errors surface.** No catch-all suppression or empty catch.
13. **No fabricated domain data.** Fixtures use the documented estate.

**Prove**

14. **Done means wired.** New code needs a named production caller; registered-but-unreachable or test-only code is not done.
15. **Runtime dependencies ship in the artifact.** Prove the deployed image carries every required browser, font, or package.
16. **A schema change and its permissions ride the same diff.** Include migration, grants, and bootstrap census together.
17. **Recorded commits must be reachable.** Ticket SHAs must exist on the merge target.
18. **Stubs are not done.** Do not present TODOs, placeholders, or mocks as implementation.
19. **Tests prove the claim.** Never weaken or delete an assertion to pass; a failing test stops and is reported.
20. **Verify with exit codes.** Run stated commands and record outputs; INCONCLUSIVE is not PASS, and a later pass does not erase a failure.
21. **No speculative CI or tests.** Delete a gate that gates nothing.

**Conduct**

22. **Review findings get dispositions.** Fix, reject with reason, accept risk, or defer to a ticket; never silence them.
23. **Secrets never appear in code, tickets, or proofs.**
24. **A PR that changes commands or conventions updates AGENTS.md in the same PR.**
<!-- kanmer:instructions:end -->

# AGENTS.md — Contributor & AI-agent guide to Kanmer

This file is the single source of truth for **how to work on Kanmer**. It's written for an AI coding agent (codex, Claude Code, etc.) or a new human contributor who needs to be productive without reading every file first. `CLAUDE.md` points here.

For end-user install/usage, see [README.md](README.md). This file is about *building the thing*.

---

## 0. The operating rule

**Kanmer's own work goes through Kanmer.** Not as a demonstration — as the way
this repository is worked. Four rules, in order:

1. **The ticket comes before the branch.** File it, give it a `profile` that
   matches the size of the work, and let `get_doc_gates` tell you what that
   profile asks for. Work that appears as a branch with no ticket has no record
   of why it happened.
2. **One worktree and one branch per ticket**, recorded by `take_ticket` —
   worktree `.worktrees/<id>`, branch `<id>-<slug>`. The board shows what is
   live and where.
3. **The PR names the ticket id**, and the ticket records the PR. Either half
   alone leaves a trail that stops.
4. **The gates are not optional here.** A move crosses **one** gated boundary at
   a time, and every intervening boundary's documents must already exist. If
   that feels slow for a two-line fix, the profile is wrong — change the
   profile, not the process.

### What this repo's board actually shows

Stated plainly, because a rule contradicted by its own evidence gets ignored.

- **60 tickets are backfilled history**, created directly in Done with `custom`
  and an empty requirements map. They record work finished before the board
  existed and were never worked through it.
- **26 tickets from 15–16 August 2026 were closed by one `backlog → done`
  move** with every document written first. That was legal until CORE-011 and
  it is exactly the shortcut the rule above exists to prevent. Their documents
  describe what was built accurately; they are **not** evidence that the
  pipeline was followed.
- **Tickets closed after CORE-011 carry per-stage timestamps** in
  `stageEntered`, a PR reference, and proof written after the merge. Those are
  the ones to imitate.

`stageEntered` only began recording when CORE-011 landed, so an older ticket
with no stage history is missing data rather than failing the rule.

---

## 1. What Kanmer is (the one idea)

A Kanban / ticket / plan / research manager where **AI agents and a human drive one shared dataset**.

The load-bearing decision: **the filesystem is the single source of truth.** Each project holds a `.kanmer/` folder of Markdown-with-frontmatter files. Two independent processes read/write those files:

- the **MCP server** — the agent surface (codex, Claude, any MCP client), over stdio;
- the **Electron GUI** — the human surface.

They never talk to each other directly. They synchronise *through the files*, and the GUI live-reloads via a filesystem watcher. An agent-created ticket appears on the board within a fraction of a second; a GUI edit is visible to the agent's next `get_item`.

```
codex / Claude / any MCP client ──stdio──► kanmer-mcp ─┐
                                                        ├─► .kanmer/  (Markdown + frontmatter = source of truth)
              You ──► Kanmer GUI (Electron) ────────────┘        ▲
                          └── chokidar watches .kanmer/ ─────────┘  (live reload on external change)
```

Everything else in the codebase follows from that model.

---

## 2. Repository layout

> **Governance lives in [`/docs/`](docs/README.md)** — vision, PRDs, FRDs and ADRs. FRDs are the
> durable end-state specs this codebase is measured against; when this guide and an FRD disagree
> about intended behaviour, the FRD wins and this guide is the thing to fix. Roadmaps under
> `docs/plans/` are working documents, not governance.

npm-workspaces monorepo. Build order is core → mcp-server → gui (each depends on the previous).

```
kanmer/
  package.json            # workspaces root; the top-level scripts you'll use
  tsconfig.base.json      # shared strict TS config all packages extend
  README.md               # end-user install/usage
  AGENTS.md               # THIS FILE
  docs/                   # GOVERNANCE — see docs/README.md
    product/              #   vision + PRDs (why)
    functional/frd/       #   FRDs (what each feature does) — the spec phases implement
    architecture/adr/     #   ADRs (why it is built this way)
    contributing/         #   doc-structure.md — generated mirror of the board's doc model
    plans/                #   implementation roadmaps (working docs, not governance)
  examples/
    codex-config.toml     # manual codex MCP registration example

  packages/
    core/                 # @kanmer/core — the shared store. THE HEART.
      src/
        types.ts          # zod schemas + TS types (BoardConfig, Item, filters…)
        paths.ts          # .kanmer path resolution: v2 area/ticket folders + legacy dirs
        io.ts             # atomic writes (temp + rename), exclusive create, fs helpers
        frontmatter.ts    # parse/serialise Markdown+frontmatter (gray-matter)
        ids.ts            # id allocation: v2 per-prefix + legacy per-type, disk reconcile
        board.ts          # read/write board.yml, defaultBoardConfig(), area prefixes
        version.ts        # version.json (storage format marker)
        activity.ts       # append-only activity.jsonl (derived change log)
        store.ts          # KanmerStore: CRUD, move, take/release, docs, columns
        links.ts          # links + backlinks + blocks/blockedBy, [[wiki]] parsing
        migrate.ts        # v1 → v2 migration (dry-run + real, idempotent)
        watch.ts          # chokidar wrapper (per-file debounced) the GUI subscribes to
        index.ts          # barrel — the package's public API
        *.test.ts         # vitest suites (frontmatter, store, links, migration…)
      tsup.config.ts      # ESM build → dist/

    mcp-server/           # @kanmer/mcp-server — local stdio MCP server
      src/
        index.ts          # McpServer + 20 tools + resources/prompts + stdio transport
        root.ts           # resolve project root: --root → KANMER_ROOT → discovery → --init, else fatal (ADR-0012)
        smoke.mjs         # standalone stdio smoke test (spawns the server)
        smoke-discovery.mjs # stdio smoke test for board discovery with no --root
      tsup.config.ts            # ESM dev build (deps external) → dist/index.js
      tsup.standalone.config.ts # self-contained CJS bundle → dist/standalone/kanmer-mcp.cjs

  plugins/
    kanmer/               # Cross-agent plugin (Claude Code + codex)
      .claude-plugin/plugin.json   # Claude manifest → mcp/claude.mcp.json
      .codex-plugin/plugin.json    # Codex manifest — skills only; no mcpServers
      mcp/
        claude.mcp.json   # {"mcpServers":…} + ${CLAUDE_PLUGIN_ROOT}
        kanmer-mcp.cjs    # committed build artifact (npm run plugin:build)
      skills/
        kanmer-tickets/   # ticket management + references/tool-reference.md + ticket template
        kanmer-docs/      # repo /docs/ governance: PRD/FRD/ADR authoring + link-or-create
        kanmer-research/  # research.md + impact.md + open-questions phase (Researching)
        kanmer-plan/      # plan.md + checklist.md phase (+ their templates)
        kanmer-execute/   # worktree/branch, checklist, post-implementation-report.md, PR
        kanmer-review/    # 4-doc PR review, PR feedback → tickets, then merge → Verifying
        kanmer-verify/    # Verifying stage: validate on merged main, write proof.md → Done
        kanmer-closeout/  # post-merge: proof finalized, commits/prs/deployment, cleanup
        kanmer-auto/      # clear an area via parallel subagents in conflict-free waves
        kanmer-report/    # board report: standup ("now") or retro ("since <period>")
        kanmer-groom/     # board-editing triage: dedupe, split, archive, doc-gate debt
        kanmer-import/    # GitHub issues → tickets, idempotent (PR feedback → kanmer-review)
        kanmer-setup/     # greenfield/brownfield/upgrade setup + AGENTS.md block
  .claude-plugin/marketplace.json  # Claude marketplace entry (repo-hosted)
  .agents/plugins/marketplace.json # codex marketplace entry (repo-hosted)

  scripts/
    build-plugin.mjs      # copy standalone MCP bundle into plugins/kanmer/mcp/
    check-plugin-sync.mjs # fail if tool names drift from the skill's tool reference
    check-updater-package.mjs # fail if the PACKAGED app can't auto-update (6 checks)
    release.mjs           # one-command release: verify, bump, pack, tag, publish, prove

  apps/
    gui/                  # @kanmer/gui — Electron + React desktop app
      electron.vite.config.ts   # electron-vite: bundles everything into out/
      electron-builder.yml      # Windows NSIS installer config + GitHub publish feed
      release-notes.md          # GitHub release body; release.mjs refuses stale notes
      build/icon.ico            # committed buildResource (regen: scripts/make-icon.mjs)
      scripts/make-icon.mjs     # dependency-free PNG/ICO generator for the app icon
      src/
        main/
          index.ts        # Electron main: window, menu, toasts, IPC handlers, watcher
          settings.ts     # user-global settings (theme, notifications, bounds, recents)
          connect.ts      # one-click per-project `codex/claude mcp add` registration
          updater.ts      # electron-updater: schedule, events, quitAndInstall
          mcp-sessions.ts # which agent MCP servers an update would kill
        preload/
          index.ts        # contextBridge → window.kanmer typed API
          index.d.ts      # global Window typing
        shared/
          ipc.ts          # IPC channel names + KanmerApi contract (main↔renderer)
          mcp-sessions.ts # pure CIM-output parser (tested)
        renderer/
          index.html
          src/
            main.tsx      # React root
            App.tsx       # top-level state, views, shortcuts, scoped refresh
            components/   # Board, Editor (doc tabs), Standup, ActivityPanel,
                          # ArchivedList, CommandPalette, ChipInput, FilterBar,
                          # Settings, Welcome, QuickAdd
            lib/          # board.ts (column lookups), markdown.ts ([[wiki]] render),
                          # update.ts (update surface + the Restart-now gate)
            styles.css    # theme tokens (dark + [data-theme=light]) + all component CSS
```

---

## 3. Tech stack & why (the decisions)

| Choice | What | Why this and not the alternative |
|---|---|---|
| **All TypeScript** | core, server, GUI | The frontmatter/id/link logic is written **once** in `@kanmer/core` and reused by both the server and the Electron main process. This is the whole reason the GUI is Electron (below). |
| **File-based store** | `.kanmer/` Markdown+frontmatter | Makes agents and the human share one dataset with zero sync layer. Git-friendly, human-readable, no DB/daemon. Git projects keep it in the canonical `.worktrees/kanmer` board worktree. |
| **Electron (not Tauri/.NET)** | desktop GUI | Electron main runs Node, so it imports `@kanmer/core` directly — no reimplementation. Tauri (Rust) or .NET (C#) would mean writing the store logic twice. Trade-off accepted: bigger binary. |
| **Official MCP TS SDK** (`@modelcontextprotocol/sdk`) | server | Best spec coverage; `McpServer.registerTool` with annotations. |
| **stdio transport** | server | Universal across codex + Claude + any MCP host; no ports/auth. codex/Claude spawn it as a child process. |
| **gray-matter + `yaml`** | frontmatter / board.yml | gray-matter round-trips item frontmatter; `yaml` handles `board.yml`. |
| **zod** | schemas | One validation definition shared by server tool inputs and the store. |
| **chokidar** | watcher | Reliable cross-platform FS events for GUI live-reload. |
| **electron-vite + electron-builder** | GUI build + installer | Vite DX for Electron; NSIS installer for Windows. |
| **Electron-as-Node** (`ELECTRON_RUN_AS_NODE=1`) | how the installed app runs the MCP server | The packaged app *is* the Node runtime, so end users need **no separate Node install**. |

---

## 4. Data model (format 2)

### The `.kanmer/` folder (per project)

```
.kanmer/
  version.json          # { "format": 2 } (+ migratedFrom/migratedAt after upgrade)
  data/
    board.yml           # statuses, areas (with prefixes), priorities, idPrefixes
    counters.json       # last-used numeric id per PREFIX ({ "API": 3, "TICK": 1 })
    activity.jsonl      # append-only change log — derived, safe to delete
  areas/
    api/                # folder name = area id
      API-001/          # folder name = ticket id
        API-001.md      # THE TICKET — governs everything in this folder
        research.md     # ┐
        impact.md       # │ the document pipeline: research + impact → plan
        plan.md         # │ → checklist + proof. proof.md is REQUIRED before
        checklist.md    # │ the ticket may reach the board's final stage.
        proof.md        # ┘
    pr-review/          # default area on new boards (prefix PR)
    _none/              # tickets with no area (prefix from idPrefixes.ticket)
```

**The ticket is the governing unit.** Its id is born from its area's `prefix`
(`API-001`) and is **immutable** — an area change moves the ticket's folder
(`fs.rename`) but never re-ids it, so `[[API-001]]` references stay valid. The
frontmatter `area` is authoritative over folder location: a hand-moved folder
produces a listing warning and reconciles on the next write. Format 1 boards
(flat `tickets/`, `plans/`, `research/` dirs) keep working unmigrated — reads
scan BOTH layouts — and `migrate.ts` upgrades them (fold linked plans/research
into ticket docs, convert orphans to labelled tickets, pin prefixes, re-key
counters, stamp version.json). On format-2 boards, standalone `plan`/`research`
items are rejected at create time — those live inside tickets as documents.

### `board.yml` — drives both tools and GUI columns

```yaml
statuses:   [{ id, name, color? }, …]           # THE workflow dimension = board columns
areas:      [{ id, name, color?, prefix? }, …]  # colour clusters + ticket id prefixes
priorities: [{ id, name, color? }, …]           # configurable (default: low/medium/high/urgent)
idPrefixes: { ticket: TICK, plan: PLAN, research: RES }  # _none fallback + legacy items
```

Area `prefix` is 2–6 uppercase alphanumerics, derived from the id when unset
(`areaPrefix()` in board.ts), and uniqueness — including *among* the
`idPrefixes` values and against them — is enforced on every board write. Creation
is **deliberately ungated** — a ticket may be created directly in any fixed
stage, including Done, which is what makes historical backfill possible
(`store.ts` `createItem`; asserted in `store.test.ts`). `status` is the only
workflow axis, with six fixed stages (ADR-0002):

```
backlog → preparing → implementing → review → verifying → done
```

Backlog is where new items land. Document requirements are resolved from the
ticket's profile and gates constrain moves across their declared boundaries; they
do not configure the stages themselves. A
`phases:` array in a pre-consolidation `board.yml` is stripped by zod on read;
unknown status values on items still render via the Board's `mergeColumns`
fallback (read-side only — writes reject unknown ids).

### An item file (frontmatter is what the GUI edits; body is free Markdown)

```markdown
---
id: API-001
type: ticket           # ticket | plan | research (v2 boards: ticket only)
title: …
status: implementing   # the workflow stage = board column
area: api              # optional; clusters + colours the card, owns the folder
priority: high         # a string id into board.priorities
order: 20              # optional fractional sort key (manual ordering)
assignee: claude
taken_at: 2026-08-13T…Z  # ┐ set while an agent works the ticket
branch: feat/x           # │ (take_ticket writes, release clears)
worktree: wt/x           # ┘
labels: [mcp]
links: [API-002]       # structured relations (tool-queryable)
blocks: [API-003]      # this item blocks API-003; blocked-by is derived
refs: [docs/frd/FRD-002.md]  # governing repo docs; satisfies the repo-doc gate
docs_todo: false       # "a governing doc is still to be written" — also satisfies it
commits: [a1b2c3d]     # ┐ traceability, emitted only when non-empty
prs: ["42"]            # ┘
deployment: staging    # only when board.deployment declares environments
archived: false        # hidden from the board unless the Archived view
created: 2026-08-12T…Z
updated: 2026-08-12T…Z
---
Body Markdown. Reference other items with [[API-002]] wiki-links.
```

All the new keys are optional and omitted when unset, so old files gain zero
noise on rewrite. **Linking is two mechanisms** resolved into one backlink
graph: the `links:` frontmatter array *and* inline `[[ID]]` wiki-links in the
body; `blocks:` adds typed dependency edges on top (see `links.ts`). Every
mutation appends a `{ts, id, op, field, from, to, actor}` line to
`activity.jsonl` — a derived convenience, never consulted for state.

---

## 5. The three surfaces in detail

### `@kanmer/core` (packages/core)
The only place that touches `.kanmer` files. Public API via `index.ts`. Key entry point: **`KanmerStore`** (`store.ts`) — construct with a project root, then `listItems(WithWarnings)/getItem/createItem/updateItem/moveItem/deleteItem/searchItems`, `takeTicket/releaseTicket`, `getDoc/getDocWithVersion/setDoc/getTicketDocsInfo`, `getBoard(WithSource)/setBoard/addColumn/updateColumn/removeColumn/reorderColumns`, `detectFormat`, `getActivity`. `init()` maintains whichever format exists (it never stamps v2 onto a v1 board — that's `migrateToV2`'s job). Links live in `links.ts` (`getLinkGraph`, `linkItems`, `computeBlockedIds`, `parseWikiLinks`). Everything is covered by `*.test.ts` (vitest), including a v1 fixture suite and the migration round-trip.

### `@kanmer/mcp-server` (packages/mcp-server)
`index.ts` builds an `McpServer` and registers **31 tools**, plus MCP resources (`kanmer://board`, `kanmer://items/{id}` with `subscribe` support) and two prompts (`standup`, `take-ticket`), then connects a `StdioServerTransport`. Root resolution in `root.ts`. **Init is lazy**: boot never calls `store.init()` — a read-only session (or a host that spawns the server in a workspace nobody opted into Kanmer for) must not create `.kanmer/` just by connecting. The GUI passes the canonical board-worktree root to MCP while keeping all source-repository operations at the selected source root. Write tools call `ensureInit()` first, which creates the skeleton once on the first actual write; read tools degrade to empty/default results when `.kanmer/` doesn't exist yet. Write tools also stamp the activity-log actor from the client's identity, and destructive ops (`delete_item`, `remove_column` with `migrate_to`) confirm via elicitation when the host supports it. Two builds:
- `dist/index.js` — ESM, deps external (for dev / `node …`).
- `dist/standalone/kanmer-mcp.cjs` — self-contained CJS, everything bundled (shipped inside the GUI, run via Electron-as-Node).

**Server identity** (`identity.ts`, surfaced by `get_status.server`): the build that is answering names itself — release `version`, resolved `path`, a runtime `sha256` of its own bytes, `mtime`, `size`, and a `build` shape (`packaged`/`plugin`/`dev-standalone`/`dev-esm`) classified from the path. `get_status` also reports `repoRoot` and `repoRootSource` beside `rootSource`, because `.codex/config.toml` passes `--repo-root` and `.mcp.json` does not, and that decides where governing-doc `refs` resolve. Two rules constrain this and are easy to break:
- The version is injected by an esbuild `define` (`version-define.mjs`, shared by both tsup configs, read from the **root** `package.json` — `packages/mcp-server/package.json` is stuck at `0.1.0` and never bumped). It is the *only* build-time input to the bundle's bytes and it must stay a pure function of the source tree: **no build timestamp, no embedded git sha**, or `plugin:check`'s byte comparison fails on every build / every commit respectively.
- Because the version is compiled in, `scripts/release.mjs` rebuilds the bundle **after** the version bump (step 5b) and the release commit carries it. Detection is one-sided by design: servers older than 0.3.3 omit the `server` block entirely, so **absence** means "pre-0.3.3", not "error".

**Repo staleness** (`packages/core/src/staleness.ts`, surfaced by `get_status.repo` — CORE-023, ADR-0015): `server` says which binary is answering; `repo` says whether what it left behind in the repo kept up. `{ upToDate, stale: [{ artefact, state, detail, fix }] }` over the artefacts migration does *not* touch — the AGENTS.md managed block, the installed skills trees and their `.kanmer-skills-version` stamps, `board.yml`, and provider MCP registrations. Board format is deliberately **not** in the list; it is the `format` field, and the GUI already banners it. Four rules, all easy to break:
- **Compare by content hash, never by version string.** No artefact records a product version: `version.json` holds only the storage format, and `plugins/kanmer/.claude-plugin/plugin.json` was frozen at `0.1.0`. A digest also survives a user editing a skill, which a version cannot represent.
- **`compensated` is not `behind`.** Every board omits `questions-resolved` from `board.yml` because `resolveProfiles()` injects it at read time. Reporting that as `behind` would put a permanent warning on every `get_status` call, and a report that fires on every healthy repo is one nobody reads. `upToDate` is true iff nothing is `behind`.
- **The skills walk iterates the bundled tree into the destination, never the other way.** That is what makes a user's own skill structurally incapable of counting as drift — and what keeps a `node_modules` inside somebody's skill from being walked on the orientation call.
- **The reference is discovered, not baked** (`bundled.ts`, from MCP-012's `build` shape), and the canonical AGENTS body is read out of the bundled `kanmer-setup/SKILL.md` — the copy `verify-agents-block.mjs` check 7 pins to `BLOCK_BODY`. Nothing hardcodes the block text, so rewriting it needs no change here. Baking a skills manifest into the bundle instead would make `plugin:check` demand an MCP rebuild after **every skill-prose edit**; don't.
- Detection only. `get_status` is `readOnlyHint` and every `fix` string is a pointer at `kanmer-setup` (FRD-013). Nothing here is cached, so a repair is visible on the next call. Absence of the `repo` block means "pre-0.3.4", not "error".

**Project-safe writes** (`expected_project`, MCP-022/MCP-034): a client reads
`get_status.project.fingerprint` and sends it as the optional top-level
`expected_project` only when `get_status.compat.expectedProject` advertises
`optional`; older servers remain compatible when the field is omitted. It is
never nested in `create_item` fields or individual `create_items.items[]`
entries and never reaches stored frontmatter. The central `write()` guard
decorates mutating registrations based on the official MCP SDK's
`annotations.readOnlyHint: false`, so every mutating tool must retain that
annotation or it can silently bypass the project check. `readOnlyHint` is a
guard dependency here, not merely descriptive metadata.

**Tools** (all carry annotations so codex approval modes / Claude read-write split behave):
- Read (`readOnlyHint`) — 12: `get_status`, `list_board`, `list_items`, `get_item`, `get_ticket_doc`, `search_items`, `get_links`, `get_activity`, `get_doc_gates`, `get_group`, `list_groups`, `get_group_doc`
- Write — 16: `create_item`, `create_items`, `update_item`, `move_item`, `take_ticket`, `set_ticket_doc`, `append_scratch`, `link_items`, `link_doc`, `add_column`, `update_column`, `reorder_columns`, `migrate_board`, `create_group`, `update_group`, `set_group_doc`
- Destructive (`destructiveHint`) — 2: `delete_item`, `remove_column`

`update_group` patches a group's `title`/`body`/`archived` only: `kind` is unpatchable because `createGroup` allocates the id from its prefix, and membership lives on tickets via `update_item(groups: [...])`. It is not `destructiveHint` — archiving is FRD-001 G4's *reversible* retirement path, and it is the only way to edit a group's own `<ID>.md`, which `set_group_doc` refuses.

That is the whole surface; `npm run plugin:check` fails if this list and the
registered names drift apart (it reads the *skill's* tool reference, not this
file — so correct both).

The plugin's `kanmer-tickets` skill documents this surface for agents — see the
sync rule in §7.

### `@kanmer/gui` (apps/gui)
Electron. **Main** (`main/index.ts`) imports `@kanmer/core` and owns *all* file access + the chokidar watcher; **renderer** (React) is pure UI and reaches main only through the typed `window.kanmer` bridge (`shared/ipc.ts` → `preload/index.ts`). `connect.ts` runs the agent `mcp add` CLI. `settings.ts` stores theme + recent projects in Electron `userData` (these are user-global, not per-project). **Main owns the auto-updater** (`updater.ts`); the renderer only ever *asks* to install, and the ask is gated on unsaved edits and live agent sessions before it becomes an IPC call.

---

## 6. Commands

Run from the repo root unless noted.

| Command | Does |
|---|---|
| `npm run setup` | install + build core, server, and GUI |
| `npm run build` | build core + mcp-server (incl. standalone bundle) |
| `npm run build:core` / `npm run build:server` | build just one package |
| `npm test` | core **and GUI** vitest suites, **and** `npm run test:scripts` |
| `npm run test:scripts` | `node scripts/test-scripts.mjs`, which enumerates direct `scripts/*.test.mjs` files and runs them with `node:test`. Deliberately **not** vitest: `scripts/` is dependency-free, and `node:test` needs no root devDependency, no root config, and no `package-lock.json` churn (`release.mjs` refuses on a dirty tree) |
| `npm run typecheck` | type-check **every** workspace — core, mcp-server, ui, gui. Use this, not the per-workspace form: vitest does not typecheck, so a green `npm test` says nothing about types, and a partial typecheck says nothing about the workspaces it skipped |
| `npm run typecheck -w @kanmer/<pkg>` | one workspace, when you want a fast loop |
| `npm run verify` | the authoritative PR check: tests (including manual freshness), all-workspace typecheck, core/server build, all MCP smokes, skill and managed-block verification, then plugin synchronization. Run from a normal checkout, not a linked worktree, because `plugin:check` deliberately refuses there. |
| `npm run app` | build + launch the GUI |
| `npm run dev:gui` | GUI with hot reload |
| `npm run dist` | build everything **and** produce `apps/gui/release/Kanmer Setup <v>.exe` |
| `npm run dist:check` | `dist`, then `check-updater-package.mjs` — the eight things that must be true for the **packaged** app to auto-update |
| `npm run release <version>` | the same shared `npm run verify` rail, then version bump, pack twice, tag, publish, and proof that clients can see every published asset. Extend `VERIFY_STEPS`, never a third verification pyramid. Needs `GH_TOKEN` (or `GITHUB_RELEASE_TOKEN`/`GITHUB_TOKEN`). `--dry-run` stops after the verification gate |
| `npm run mcpb:check` | build and deterministically validate the Windows Claude Desktop MCPB from the standalone server; generated output is under `dist/mcpb/` and is not committed |
| `npm run smoke:headless` | run the standalone MCP server from a temporary host with no repository `node_modules`, using an explicit board root |
| `node scripts/verify-release-assets.mjs <version>` | re-check **any** published release read-only, without cutting a new one: every expected asset present, `state: uploaded`, size and sha256 matching the local build in `apps/gui/release/`. Exit 0 = pass, 1 = the release is incomplete, 2 = the *check* could not run (rate limit, bad token, API drift) — the two are never conflated |
| `npm run plugin:build` | build, then copy the standalone MCP bundle into `plugins/kanmer/mcp/` |
| `npm run plugin:check` | fail if MCP tool names drift from the skill's tool reference **or if the committed plugin bundle differs from a fresh build (requires `npm run build` first)**. Refuses outright inside a linked worktree, where that byte comparison cannot mean anything (§8 gotcha 8) — run it from the main checkout |
| `npm run inspect` | build, then open MCP Inspector against the server (root `./sandbox`) |
| `node packages/mcp-server/src/smoke.mjs` | stdio smoke test against the built server |
| `npm run smoke:protocol` | raw-JSON-RPC stdio check against every protocol version the SDK supports, plus the per-request `_meta` client-identity path |
| `npm run verify:agents-block` | end-to-end check of the `kanmer-setup` AGENTS.md managed block (insert, refresh, idempotence, CLAUDE.md pointer, malformed markers) |
| `node scripts/agents-block.mjs <repo>` | write/refresh that block in a target repo (what `kanmer-setup` calls) |

**Smoke test env overrides** (in `smoke.mjs`): `KANMER_SERVER=<path>` points at a different server entry (e.g. the standalone bundle); `KANMER_NODE=<electron.exe>` runs it via Electron-as-Node (sets `ELECTRON_RUN_AS_NODE=1`). Example — test the packaged server exactly as shipped:
```bash
KANMER_NODE="apps/gui/release/win-unpacked/Kanmer.exe" \
KANMER_SERVER="apps/gui/release/win-unpacked/resources/mcp/kanmer-mcp.cjs" \
node packages/mcp-server/src/smoke.mjs
```

**GUI boot smoke** (exits after render), from `apps/gui`:
```bash
KANMER_SMOKE=1 KANMER_OPEN=<projectDir> npx electron . --user-data-dir=<a fresh dir>
```
To capture the live renderer for visual proof, add
`KANMER_SMOKE_CAPTURE_PATH=<new absolute PNG path>` to that invocation. Smoke
mode writes a current, visible `KANMER-SMOKE-…` marker into the renderer, reads
it back, and captures it with Electron's `webContents.capturePage()` before
exiting. The path must not already exist. This captures the Electron **page**,
not title-bar/menu chrome or OS-owned dialogs; those still need another route or
human review.
**Updater dev loop** (no packaging). The updater is inert in dev unless you opt
in, so a normal `npm run dev:gui` never touches the network. To exercise it,
write `apps/gui/dev-app-update.yml` (gitignored) pointing at a local feed, serve
a directory containing a `latest.yml` + payload, then:
```bash
cd apps/gui && KANMER_DEV_UPDATE=1 npx electron . --user-data-dir=<a fresh dir>
```
`[updater]` lines on stderr trace check → available → progress → downloaded.
Use a **dummy payload**, never a real installer: nothing in that loop should be
able to install anything.

`--user-data-dir` is **not optional** when running from source: Electron takes
`app.getName()` from `apps/gui/package.json`, so the scoped name `@kanmer/gui`
makes userData `%APPDATA%\@kanmer/gui` and `requestSingleInstanceLock()`
returns false on that path even with nothing else running (§11). Smoke mode now
exits **1** with a message when that happens, and also when the renderer loads
without the window reaching `ready-to-show` — the check used to exit 0 either
way, so it could not fail.

---

## 7. Conventions & guidelines

- **TypeScript strict everywhere** (`tsconfig.base.json`). No `any` escapes; run the package `typecheck` scripts.
- **ESM vs CJS is deliberate.** `@kanmer/core` and the ESM server build are ESM (`"type": "module"`). The **standalone server bundle is CJS** on purpose (see gotcha below). The Electron main/preload are built as CJS by electron-vite.
- **Renderer imports from `@kanmer/core` must be `import type`.** Core pulls in Node-only deps (gray-matter, chokidar); the renderer is a browser context. Type-only imports are erased at build. Never import a runtime value from core in `renderer/`.
- **All file writes go through `writeFileAtomic`** (`io.ts`): temp file + `rename`, so the watcher never sees a half-written file. Item *creation* goes through `writeFileExclusive` (temp + `fs.link`) so two concurrent creates can't claim the same id. `updated` is stamped on every write that actually changes the file — a no-op patch returns the item unchanged without touching disk.
- **The MCP server must never write to stdout** except MCP protocol frames — stdout *is* the transport. Logs go to `process.stderr`.
- **Frontmatter key order** is canonicalised in `frontmatter.ts` (`KEY_ORDER`) so files round-trip stably; unknown/hand-added keys are preserved. Add new known fields to `KEY_ORDER`.
- **Every board mutation from the GUI goes through `setBoard`** (whole-board save); the settings editor builds the new board object and saves it once.
- **Tool annotations are required** on every MCP tool (`readOnlyHint` / `destructiveHint`).
- **Plugin/skill sync.** The plugin's skills describe the MCP tool surface, so a
  rename that lands on only one side leaves agents following instructions for
  tools that no longer exist. Whenever you add, rename or change a tool or its
  parameters: update `plugins/kanmer/skills/kanmer-tickets/references/tool-reference.md`
  (and the SKILL.md if the *workflow* changed, not just the signature), run
  `npm run plugin:build` to refresh the bundled server, and run
  `npm run plugin:check` — it fails on tool-name drift.
- **Document writes carry an optional version token.** `getDocWithVersion`/`get_ticket_doc` return a content hash; passing it back as `setDoc`'s `expectedVersion` / `set_ticket_doc`'s `expected_version` turns a concurrent overwrite into a conflict, exactly like `expectedUpdated` on `updateItem`. Omitting it is last-write-wins. Documents have no frontmatter to hold `updated`, which is why this is a hash and not a timestamp.
- **Renderer logic that could be pure, is.** `renderer/src/lib/` holds the DOM-free modules — `markdown.ts`, `board.ts` (column lookups, the blocked/overdue rules, drop-position and optimistic-order arithmetic) and `standup.ts` (the whole standup report plus its markdown). Put new logic there rather than in JSX, export it, and take `now`/`today` as an argument instead of calling `Date.now()` inside.
  **Component tests exist, but only to prove *rendering* (GUI-065).** `lib/` used to be the only renderer code with vitest coverage; `components/UpdateBanner.test.tsx` is now the deliberate exception, because that ticket's bug was a component sitting in the wrong subtree — something no pure test can see. The rule that still holds is the one above: **a component test is not a place to put logic.** If you find yourself asserting a decision rather than a rendering, the decision belongs in `lib/`. The stack is `jsdom` + `@testing-library/react` (devDeps of `apps/gui`), and jsdom is enabled **per file** with a `// @vitest-environment jsdom` docblock — deliberately not globally, because the other test files in `apps/gui` cover pure and main-process modules and must not run under a DOM. There is no vitest config file and none is needed.
- **Three deliberate core↔renderer duplications.** The renderer may only `import type` from core, so these cannot share code — change one, change the other:
  1. `lib/board.ts` `blockedIds` mirrors `links.ts computeBlockedIds` (card badges + Standup view).
  2. `Settings.tsx validateDraft()` mirrors `board.ts assertUniquePrefixes()`.
  3. `lib/profileDraft.ts` mirrors `profiles.ts` `parseRequirement` + `validateProfileMap` (the Profiles editor). Its split order — `@`, then `:`, then `/` — must match `parseRequirement` exactly: any other order accepts requirement strings core rejects, and the board is saved with a requirement no gate can satisfy. Its tests state the vocabulary literally rather than importing it, so a change in core's list surfaces as a failing test instead of silent agreement.
- **`plugin:check` sees tool names and bundle bytes only.** Everything below `## Field semantics` in `references/tool-reference.md` is deliberately invisible to it (`check-plugin-sync.mjs:41-45` splits the document there so field names aren't mistaken for tools) — re-read that prose by hand whenever the data model changes.
- **`quitAndInstall()` is not cancellable.** `BaseUpdater` spawns the installer **before** `app.quit()` (`BaseUpdater.js:13-23`), and the installer force-kills every process under the install dir — so a guard placed after the IPC call is a guard that never runs. `CH.installUpdate` has exactly **one** renderer call site — `startInstall` in `App.tsx`, downstream of `restartWarning()`. (It had two until GUI-064 gave the call a return value that must be handled, and two places handling it identically is two places to forget.) Main refuses the call unless an update is actually downloaded. Do not add a second call site, and do not call `quitAndInstall()` from anywhere but `installUpdateNow()`. This is also why GUI-065 lifted the update banner, toast stack and restart confirm above `App.tsx`'s `if (!root || !board)` early return as **shared JSX values** rendered by both branches, rather than duplicating the markup into the welcome branch: one banner instance is what keeps the call site count at one.
- **`electron-updater` is the one externalized production dependency**, via `external: ["electron-updater"]` in the **main build only**. Do **not** replace it with `externalizeDepsPlugin()` — that externalizes every future `dependencies` entry, and gotcha 1 requires gray-matter to stay bundled in the CJS main output.
- **`watch?.close()` belongs on `will-quit`, never `before-quit`.** `preventDefault()` on `before-quit` does not stop other listeners on the same event, so a cancelled quit would otherwise leave the app running with a dead watcher.
- **Match the surrounding style** — small focused modules, JSDoc on exported functions, no clever one-liners.

---

## 8. Non-obvious gotchas (read before debugging)

1. **gray-matter is CommonJS and does a dynamic `require('fs')`.** If you bundle it into an **ESM** output (e.g. tsup ESM), it throws `Dynamic require of "fs" is not supported`. That's why: the dev server build keeps deps **external**, and the shippable **standalone bundle is CJS** (`tsup.standalone.config.ts`, `noExternal: [/.*/]`), and the Electron main is CJS (Rollup handles the require correctly). Don't "simplify" these to ESM bundles.
2. **YAML parses ISO date strings into JS `Date`.** `created`/`updated` are coerced back to strings via `TimestampSchema` in `types.ts`. Keep that if you add date fields.
3. **`priority` is a string, not an enum.** It became configurable (an id into `board.priorities`). Don't reintroduce a fixed enum. Default list lives in `DEFAULT_PRIORITIES` (`types.ts`) and migrates old boards.
4. **The installed app runs the MCP server as Electron-as-Node.** The fixed installer-owned launcher is the portable registration boundary: fresh installs stage `kanmer-mcp.exe`, `icudtl.dat`, `v8_context_snapshot.bin`, and the standalone bundle under `%LOCALAPPDATA%\Kanmer\mcp\<version>`, with the script at `<runtime>/resources/mcp/kanmer-mcp.cjs` and bundled skills at `<runtime>/resources/plugins/kanmer/skills`. It activates a stable `current` junction and preserves the install-root `Kanmer.exe`/`resources/mcp/kanmer-mcp.cjs` payload as a legacy fallback. The standalone bundle must therefore be self-contained (no node_modules at runtime).
5. **electron-builder bundles exactly one thing from `node_modules`: `electron-updater`.** Everything else is moved to `devDependencies` and bundled into `out/` by electron-vite. Having a real `dependencies` entry is what turns on `NodeModulesCollector` — and `files:` needs **no** entry for it, because a *separate* node-module matcher starts from `**/*` (verified in `fileMatcher.js:177-219` and in `builder-debug.yml`'s `nodeModuleFilePatterns`). Do not add `node_modules/electron-updater/**/*` to `files:`; do not assume a new runtime dep is packed just because this one is (it will be, but only if it is in `dependencies` **and** externalized in the Vite main config).
6. **Antivirus + electron-builder:** Windows Defender sometimes quarantines electron-builder's bundled `7za.exe` mid-build (`ENOENT … 7za.exe`). Pinned electron-builder ≥26 fetches 7-Zip fresh and usually avoids it; otherwise restore from quarantine / add a repo exclusion.
7. **The watcher ignores atomic-write temp files** (`.<name>.tmp-*`) and debounces (`watch.ts`). Don't remove the ignore or you'll get double refreshes.
8. **`plugins/kanmer/mcp/kanmer-mcp.cjs` is a committed build artifact** — deliberately, unlike every other `dist/` output. Plugin installs fetch this repo, so the server has to already be there and runnable; there is no build step on the user's side. Refresh it with `npm run plugin:build` whenever the server changes, or installed plugins silently keep running the old server. Core compiles *into* it, so **core-only fixes need the rebuild too**; `plugin:check` now sha256s the committed bundle against a fresh build so a stale one fails loudly instead of silently.
    **Build and check it at the repo root, never inside a `.worktrees/<id>` worktree** — a worktree has no `node_modules`, so tsup bundles **main's** core instead of yours (SKILL-011 merged a bundle missing the feature it shipped this way). Since MCP-007 `plugin:check` refuses in a worktree rather than passing; `plugin:build` still does not, so a bundle built there is still wrong, just no longer certifiable.
9. **`order` is column-scoped; the board renders by area.** `computeOrder` filters on `status` only (`store.ts:697-698`), while `Board.tsx` groups cards by area inside each column (`groupByArea`). Any drag-and-drop neighbour computation must use `columnCards(items, statusId)` (`lib/board.ts:70`), never a group's cards — otherwise "drop above this card" silently means a different slot, and a single-area test board will not reveal it. `Card` is `memo`ized (`Board.tsx:221`), so pass badge and drop-hint state to it as primitives (`blocked: boolean`, `overdue: boolean`, `dropEdge: "before" | "after" | null`), never a `Set` or object rebuilt each render. `e.stopPropagation()` on the card's `onDrop` is load-bearing: without it the cell handler also fires and issues a second, position-less `moveItem`.
10. **An update force-kills legacy install-root MCP servers — and if it doesn't, the update fails.** `allowOnlyOneInstallerInstance.nsh:104-165` stops every process whose path is under `$INSTDIR` — **by path prefix, not image name**. Direct/legacy registrations still run there, while the fixed launcher provisions fresh sessions from the external runtime under `%LOCALAPPDATA%\Kanmer\mcp`, outside the installer's path-prefix predicate. electron-updater passes `--updated`, which suppresses the installer's own prompt (`NsisUpdater.js:113`), so legacy termination happens silently. This is why `mcp-sessions.ts` exists: it runs the installer's own predicate so we can *name* what dies before the user commits to it. Failing open (`unknown: true`) is deliberate for the *warning* — the probe may never block an update.
    **The trap (GUI-064):** that kill races the uninstaller's own `un.atomicRMDir`, which renames every file out of `$INSTDIR` and aborts on the first rename that fails; the abort exits 2 and the user gets `Failed to uninstall old application files … : 2` with no update. A legacy live MCP server is enough to cause it — **not** by holding `Kanmer.exe` (a mapped image renames fine, as do the DLLs) but by holding `icudtl.dat` and `v8_context_snapshot.bin`, which V8/ICU mmap without `FILE_SHARE_DELETE`. So `installUpdateNow` still calls `stopMcpSessions()` **before** `quitAndInstall` and refuses the install if the legacy folder cannot be cleared. That path fails **closed** — a broken probe is not permission to start a rename we cannot undo. Do not "simplify" the two failure directions into one. External-runtime update survival is a deterministic/package boundary here; real two-version evidence remains INCONCLUSIVE.
11. **`releaseType` defaults to `draft`, and drafts are invisible.** `GitHubProvider` reads `releases.atom` and `/releases/latest`; neither lists drafts, so a draft release silently reaches **zero** installed clients. `electron-builder.yml` sets `releaseType: release` explicitly. Never revert it. Related: `latest.yml` records the **GitHub upload name** (spaces→dashes, `computeSafeArtifactNameIfNeeded` in `platformPackager.js:690`), not the on-disk filename — never rename release assets by hand, because that mapping is re-derived independently by `GitHubProvider.resolveFiles` and the two must agree.
12. **`electron-builder --publish always` can exit 0 having uploaded nothing.** `gitHubPublisher.js` `getOrCreateRelease()` returns **`null`** — not an error — when the existing release's type does not match (`:70-82`) or when it was `published_at` more than two hours ago and `EP_GH_IGNORE_TIME` is unset (`:85-96`); `doUpload()` then merely logs `"skipped publishing"` and **returns** (`:126-131`). Three consecutive Kanmer releases shipped incomplete that way — 0.3.0 lost its blockmap, 0.3.1 its installer *and* `latest.yml`, 0.3.2 its `latest.yml` — each with a green publish log. **The publisher's exit code is not evidence of upload.** So: `release.mjs` sets `EP_GH_IGNORE_TIME=true` itself (do not remove it — without it the *repair* pass silently no-ops too), and after publishing it verifies every asset against `GET /repos/:o/:r/releases/tags/v<v>`, whose `assets[]` carries `name`, `size`, `state` and `digest: "sha256:…"`. Because the script is holding the freshly built local files it hashes those and compares — full integrity, **zero bytes downloaded**. On a gap it re-publishes **exactly once** (`overwriteArtifact`, `:114-124`, makes that idempotent rather than duplicating), re-verifies, and then refuses **without demoting the release**: rewriting a public artifact unattended is the operator's call, so the refusal names `gh release edit v<v> --prerelease` instead of running it. A missing `.exe.blockmap` is a **hard** failure, not a warning — treating it as a warning is precisely how 0.3.0 passed the old gate. The logic lives in `scripts/verify-release-assets.mjs`, is pure and unit-tested against golden fixtures from those three real releases, and runs standalone against any tag.
    **Known accepted gap:** v0.3.0's blockmap is still missing on GitHub and is not being backfilled (it needs a rebuild from that tag). Clients still on 0.3.0 pay one full ~78 MB download on their next update, once.

---

## 9. Recipes (how to add things)

**Add a new MCP tool** → in `mcp-server/src/index.ts`, call `server.registerTool(name, { title, description, inputSchema (zod raw shape), annotations }, handler)`. Back it with a `KanmerStore` method. Add a check to `smoke.mjs`. Then document it in the plugin's `references/tool-reference.md` and run `npm run plugin:build && npm run plugin:check`. If it mutates the board/items, the GUI reflects it automatically via the watcher.

**Add a new item frontmatter field** → (1) `ItemFrontmatterSchema` + `CreateItemInput`/`UpdateItemPatch` in `types.ts`; (2) `KEY_ORDER` in `frontmatter.ts`; (3) default it in `store.createItem`; (4) surface it in `Editor.tsx` and the MCP `create_item`/`update_item` schemas; (5) a core test; (6) mention it in the plugin tool reference's field-semantics list.

**Add a new board column kind** → extend `ColumnKind` + `BoardConfigSchema` (`types.ts`), `columnList()` (`store.ts`), the `add_column` enum (server), and the Settings editor (`Settings.tsx`).

**Add an IPC call** → channel in `shared/ipc.ts` (`CH` + `KanmerApi`), handler in `main/index.ts`, wrapper in `preload/index.ts`.

---

## 10. Verification checklist (before you call something done)

1. `npm test` — core + GUI suites green.
2. `node packages/mcp-server/src/smoke.mjs` **and** `node packages/mcp-server/src/smoke-protocol.mjs` — stdio checks green (add one for your change).
3. `npm run typecheck` — **every** workspace clean, and confirm all four are named in the output. Not the `-w @kanmer/gui` form: that is what let `c8b94a4` ship, and a workspace whose script is missing is skipped silently by `--if-present`.
4. `npm run build -w @kanmer/gui` — GUI builds.
5. If GUI-facing: `KANMER_SMOKE=1 KANMER_OPEN=<sandbox> npx electron . --user-data-dir=<fresh dir>` boots (exit 0). Non-zero means it did not render — see §6.
6. If the server changed: `npm run build && npm run plugin:build && npm run plugin:check` (the check now verifies the committed bundle's bytes, not just tool names), plus both smoke scripts with `KANMER_SERVER=plugins/kanmer/mcp/kanmer-mcp.cjs`. **From the main checkout** — `plugin:check` refuses inside a worktree (§8 gotcha 8).
7. The real test: open a project in the GUI, have an agent `create_item`/`move_item` against it, confirm the board live-updates; edit in the GUI, confirm the agent's `get_item` sees it.
8. If the setup skill or its managed block changed: `node scripts/verify-agents-block.mjs`.
9. **If the GUI packaging or the updater changed:** `npm run dist:check`, then boot the **packaged** binary under `KANMER_SMOKE` (`release/win-unpacked/Kanmer.exe --user-data-dir=<fresh dir>`). Compiling is not evidence — this pair is what catches "works in dev, silently dead when packaged", which is the most likely way an updater change ships broken. If `npm run dist` fails with `EBUSY` because a Kanmer is running from `release/`, build elsewhere instead: `npx electron-builder --win --config.directories.output=release-check` from `apps/gui`, then `node scripts/check-updater-package.mjs --out apps/gui/release-check`.

---

## 11. Known limitations / roadmap

- Windows installer only so far (macOS/Linux electron-builder targets not configured).
- **Release verification is independent CI; publishing remains local.** `.github/workflows/release.yml` runs one read-only `release-verify` job on each `v*` tag push. On `windows-latest` it checks out the pushed tag, validates the root/GUI/plugin versions, runs `npm run verify` and `npm run dist:check`, then polls `node scripts/verify-release-assets.mjs <version>` for a bounded period. It has `contents: read` only and never publishes or repairs releases; `npm run release <version>` remains the sole publisher and repair owner.
- **Unsigned auto-update has a stated expiry.** `NsisUpdater.verifySignature` returns "pass" when `publisherName` is absent from `app-update.yml`, and `publisherName` is only written when a signing cert exists — so unsigned updates install today. electron-builder PR #10056 deprecates that fail-open and states **v28 will fail closed**. We are on electron-builder 26.15.3 / electron-updater `^6.8.9`, and the caret cannot cross into v7, so nothing breaks by drift. Read the release notes before any major bump, and treat "get a signing story" as scheduled, not someday. Once signing is on, `publisherName` lands in `app-update.yml` and turns verification **on** for all future clients — changing the cert subject later then breaks updates for everyone on the old build. It is a one-way door.
- **Legacy direct registrations can close live MCP sessions on update.** The fixed launcher now stages the MCP runtime outside `$INSTDIR` under `%LOCALAPPDATA%\\Kanmer\\mcp` and retains the install-root payload only as a compatibility fallback; direct/legacy registrations remain covered by the GUI-064 stop/refusal gate. We warn with a count and never install without a user action; the store is crash-safe, so the loss is a dropped transport, not data. The external boundary's real two-version/session proof is still INCONCLUSIVE until a disposable Windows host runs it.
- **The registered MCP command path can go stale.** `allowToChangeInstallationDirectory: true` means a *manual* re-install can move the install dir; every project's `.mcp.json` / codex entry then points at a path that no longer exists. electron-updater's silent update passes no `/D=`, so auto-updates keep the directory. Not detected today; a "recorded MCP command ≠ `process.execPath` → offer Reconnect" check is the follow-up.
- **The auto-updater's end-to-end install path is not yet proven on a real two-version cycle.** Event wiring, the packaged feed, the banner and the Restart-now gate are all verified, but no build has actually updated itself from one version to the next on this machine (that proof uninstalls and reinstalls Kanmer, so it is run deliberately — see `docs/plans/updater/plan.md` Phase 7). Until it has been run once, treat the first real release as the experiment.
- Column removal: the MCP `remove_column` tool refuses while items reference the column (or migrates them with `migrate_to`), but the GUI Settings editor's whole-board save can still drop an in-use column — those items fall back to an auto column/group on read (`mergeColumns`), and writes to the now-undefined id are rejected (`assertFieldAgainstBoard` in `store.ts`).
- Two concurrent creates that share the TICK fallback prefix in *different* undeclared areas could double-allocate an id number — only reachable when a v2 board's `areas` list has been emptied (the exclusive-create lock is per file path). Narrowed: `createItem` now refuses an id that `locateItem` can already resolve (`store.ts:519-522`), so only a genuine concurrent-create window remains.
- **The MCP SDK caps at protocol `2025-11-25`.** `@modelcontextprotocol/sdk@^1.30.0` contains no `2026-07-28` support, so `ttlMs`/`cacheScope` on `tools/list` are unavailable and no current host sends the spec's `io.modelcontextprotocol/client` identity key. The server *does* read it, and that branch is **live, not dead**: the SDK forwards `params._meta` to handlers on every protocol (`shared/protocol.js:321`), and `smoke-protocol.mjs` proves it by sending a hand-written frame carrying the key and asserting the activity actor comes back as `future-host`. So actor attribution is forward-compatible today and falls back to `clientInfo`/`getClientVersion()` in practice. `smoke-protocol.mjs` also covers the back-compat run against `2025-11-25`, `2025-06-18`, `2025-03-26` and `2024-11-05`. Revisit `tools/list` caching when the SDK ships the revision.
- **Migration has no agent-reachable entry point.** `migrateToV2` is reachable only from the GUI (`main/index.ts` `CH.migrate`); there is no MCP tool. `kanmer-setup`'s Upgrade mode therefore asks the user to click "Migrate to v2" in the app, and a plugin user with no GUI installed cannot upgrade a v1 board. Migration *is* now resumable and refuses colliding boards, so an interrupted run is recoverable — but only from the GUI.
- **Keyboard stage moves (Ctrl+←/→) set no position.** Drag-and-drop now writes an insertion point; the keyboard path (`Board.tsx:303-309` → `App.tsx:352`) changes the stage and leaves the card's existing `order`, so it can land somewhere other than where the eye expects. The command palette's Move ▸ verb has the same gap. Giving either an insertion point needs a "move within column" mode that does not exist.
- **Running from source does not launch.** Electron takes `app.getName()` from `apps/gui/package.json`, so a from-source run gets the scoped name `@kanmer/gui`, userData `%APPDATA%\@kanmer/gui`, and `requestSingleInstanceLock()` returning **false** on that mixed-separator path with no other instance running — `npx electron .`, `npm run app` and `npm run dev:gui` then quit in ~1 s. Workaround: `--user-data-dir=<fresh dir>`. The boot smoke no longer hides this: it exits 1 rather than 0. The **packaged** app is *not* unaffected, contrary to what this bullet used to say. electron-builder's `productName` never reaches the `package.json` inside `app.asar` — that file is `{"name":"@kanmer/gui","version":…}` with scripts and devDependencies stripped and no `productName` injected. So `app.getName()` is `@kanmer/gui` in the packaged app too: the installed app's userData is `%APPDATA%\@kanmer\gui\` (verified on disk — it holds the real `settings.json`, and there is no `%APPDATA%\Kanmer` at all), and the updater cache dir inherits it as `%LOCALAPPDATA%\@kanmergui-updater` (confirmed in the generated `app-update.yml`, which carries `updaterCacheDirName: '@kanmergui-updater'`). Only the *single-instance-lock* symptom is dev-only. A one-line `app.setName("Kanmer")` would fix all three paths at once, but it silently orphans every existing user's settings, so it stays a product decision — and if it is ever taken it must ship with a one-time settings migration, in its own release, never alongside a change to the update mechanism itself.
- **The `beforeunload` confirm on window close is unverified in this Electron configuration** (`sandbox: false`, no `will-prevent-unload` handling in `main/index.ts`). Historically version-dependent; no harness exists to settle it. Every *in-app* way of leaving a dirty editor — card click, Close, wiki-link, tab switch, project switch, palette jump, Escape, standup line, activity panel, toast click — is guarded by `trySelect` (`App.tsx:117-125`) or `tryTab` (`Editor.tsx:296-299`).
- **The checklist tab never linkifies `[[ID]]`.** `Editor.tsx:827-854` parses lines to JSX itself and never calls `renderMarkdown`, so a wiki-link inside a checklist item is literal text.
- **Agent-change toast suppression is ticket-granular, not doc-granular.** A GUI write to `checklist.md` suppresses the toast for a concurrent agent write to `research.md` on the same ticket within 2 s — `toastKey()` maps every pipeline document to its ticket folder (`main/index.ts:270-280`) and `ownWrites` is keyed by that. Conflict *detection* is unaffected; only the toast.
- **A doc save that fails for any reason shows the conflict banner.** `Editor.tsx:729-732` sets `conflict` from the caught error whatever it was, so a disk-full or permission failure also offers "Overwrite anyway" — which re-issues the save without `expectedVersion` and will fail the same way.
- **The Standup's Blocked section lists blocked items but does not name their blockers.** `kanmer-standup/SKILL.md:68` suggests naming them from `get_links` "when it matters"; doing so is an IPC call per blocked item, so the GUI lists the items only (`lib/standup.ts:53-56`).
- **The GUI takes tickets as `gui`, and does not set an assignee at all.** The store's default actor is `"gui"` and the Electron main never overrides it (`store.ts:88`; no `setActor` call in `main/`), so every GUI mutation is attributed to the app rather than a named human. The palette's Take sends only `{ branch }` (`App.tsx:386`) and core writes `assignee` only when supplied (`store.ts:771`), so unlike MCP's `take_ticket` — which defaults it to the client name — the GUI leaves `assignee` untouched. The take modal's hint text (`App.tsx:819`) still says the assignee defaults to `"gui"`; it does not.
- ~~Concurrent `create_item` id race~~ **closed by exclusive create.** The item
  file itself is the allocation lock: `createItem` computes a candidate id and
  claims it with `writeFileExclusive` ([io.ts](packages/core/src/io.ts)) — a
  temp-file + `fs.link` pair that fails `EEXIST` if the id was taken, retried
  with the next number. Deliberately **not** a lockfile: lockfiles need
  stale-lock timeouts and break when a holder crashes; exclusive-create is
  crash-safe by construction and keeps `io.ts` the only file-touching layer.
- **Duplicate registration is confusing, not harmful.** If a user installs the
  plugin *and* registers the server manually (GUI "Connect" or `mcp add`), the
  agent lists all the tools twice under different server names. Both work; the
  README tells users to pick one.
