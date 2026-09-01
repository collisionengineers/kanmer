<!-- kanmer:instructions:start — managed by kanmer-setup; edits inside will be overwritten -->
# Kanmer operating instructions

This repo's work is tracked on a Kanmer board in `.kanmer/`. In a Git repo set up
through the GUI the board lives in its own worktree, `.worktrees/kanmer`, on the
board branch, and MCP is already rooted there — never create, switch or push that
branch yourself. Your own ticket worktree is a separate thing, recorded by
`take_ticket`.

The board branch convention is the repository variable `KANMER_BOARD_BRANCH`,
falling back to `kanmer-board` when it is unset. A branch rename is an
administrator handoff: retarget branch protection and required checks, update
the repository variable, and only then reconcile the board worktree and remove
old refs. Agents must not mutate protected refs, branch protection, or repository
variables; stop and report when the observed branch and configured convention
disagree.

- Start every session with `get_status`, then `list_board` / `list_items` to find your ticket.
- **Which documents a ticket needs depends on its profile, not on a fixed pipeline.** Call `get_doc_gates <id>` before every move. Not `board.yml` — requirements are injected at resolve time, so its `profiles:` block is not the effective set.
- Stages: backlog → preparing → implementing → review → verifying → done. **A move crosses at most one gated boundary**, so walk the stages one at a time; a jump is refused even when every document exists.
- **Gates constrain `move_item` and nothing else** — creation in any stage is ungated, and `gh pr merge` is outside the engine, so an unmet gate never stops a merge.
- An unticked `- [ ]` in `open-questions/` blocks a move: tick it, or move it below the literal `## Parked (explicitly deferred)` with a reason.
- Read the whole ticket folder before starting — documents are folders (`research/`, `plan/`, …), so there may be several files per type. If the ticket is in a group, read the group's `context.md` too: the constraint binding the batch is written once, there.
- Work each fresh ticket on its own branch and worktree: worktree `.worktrees/<id>`, branch `<id>-<slug>`; `take_ticket` records both and moves the stage. A resumed execution packet is available only in `implementing` and must validate/reuse the exact recorded branch and **worktree root** — never create a second worktree or take the ticket again. It must not name the board, shared source checkout, another active ticket's worktree, or any child of those; its checked-out branch and Git common directory must match the record and source repository. Pause by retaining that taken record; never release a paused ticket while its worktree/branch remains a resume target.
- Write pipeline documents with `set_ticket_doc`. Running notes go to `append_scratch` — scratch is the notepad and is never gated, and neither is anything under `reference/` or `assets/`.
- Proof is written on merged `main`, after review and the merge, not before.
- Archive, don't delete. Reference other items with [[ID]] wiki-links.
- Skills run in this order: kanmer-tickets → -research → -plan → -execute → -review → -verify → -closeout. How far a ticket walks it depends on its profile, so ask `get_doc_gates` rather than assuming every step. Off to the side: -auto (drives that order over many tickets), -docs (governing docs), -groom (fix the board), -report (read-only), -setup (reconcile after a Kanmer update).
- Each skill ends by naming what comes next — read that line before improvising a hand-off.

The local MCP convention is `KANMER_BOARD_BRANCH` in each project-scoped
provider registration or exported local runtime, falling back to the default
board branch when unset. GUI Connect writes the saved board-branch setting into local
registrations. Hosted Actions should mirror the same value in the repository
variable, but Actions variables are not inherited by local processes.
When a native runtime supervisor launches Kanmer through an operator-private
wrapper, that wrapper must export both `KANMER_PROVIDER_CWD` and
`KANMER_BOARD_BRANCH` before invoking the stable launcher. Native
The GUI's OpenAI tunnel controls manage the same long-lived native runtime
alias through `tunnel-client runtimes connect/status/stop/rm`. Application quit
does not stop that runtime; readiness requires structured non-stale status, and
local removal must confirm the alias is stopped before deleting its metadata.

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
20. **Verify with exit codes.** Run stated commands and record outputs; INCONCLUSIVE is not PASS, and a later pass does not erase a failure. Done requires PASS; an explicitly disposed terminal non-PASS stays Verifying, is archived, and is released.
21. **No speculative CI or tests.** Delete a gate that gates nothing.

**Conduct**

22. **Review findings get dispositions.** Fix, reject with reason, accept risk, or defer to a ticket; never silence them.
23. **Secrets never appear in code, tickets, or proofs.**
24. **A PR that changes commands or conventions updates AGENTS.md in the same PR.**
<!-- kanmer:instructions:end -->

Native Grok and Antigravity plugin descriptors must expose `KANMER_BOARD_BRANCH`
to the bundled MCP server. GUI Connect installs a disposable branch-bound
descriptor copy, leaving the shipped plugin bundle and unrelated project state
unchanged; the shipped Antigravity source descriptor uses the literal
`kanmer-board` default because the native host does not expand shell-style
`${...}` defaults. GUI-owned staged copies may inject a saved custom branch.

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
    kanmer/               # Cross-agent plugin (Claude/Codex marketplaces + native Grok/Antigravity)
      .claude-plugin/plugin.json   # Claude manifest → mcp/claude.mcp.json
      .codex-plugin/plugin.json    # Codex manifest — skills only; no mcpServers
      plugin.json                  # Antigravity root manifest (versioned at release)
      mcp_config.json              # Antigravity native MCP config → installer launcher
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
        kanmer-auto/      # schema-3 /goal controller: dependency-safe roster, bounded lanes/retries, review+verify
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
    release.mjs           # protected-main release: verify, prepare PR, publish after merge, prove

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
  project.json          # logical identity (FRD-029): { schema, project_id, board_id, created, origin, migratedFrom? } — allocated once on first write / migrate_board; older servers ignore it
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
delivery:                          # optional Git delivery policy (FRD-031); absent = main-only
  integration_branch: main         #   → integrationBranch: normal implementation PRs target this
  release_branch: main             #   → releaseBranch: defaults to the integration branch
  release_candidate_pattern: null  #   → releaseCandidatePattern: e.g. "release/*"; null = no candidates
  hotfix_backport: true            #   → hotfixBackport: a release-branch hotfix owes an integration backport
```

> The `delivery:` keys are camelCase in `board.yml`
> (`integrationBranch`, `releaseBranch`, `releaseCandidatePattern`,
> `hotfixBackport`) — the snake_case spelling above is only there to match how
> the policy reads in prose. Resolve it with `resolveDelivery(board)`, never by
> reading the fields: `releaseBranch` falls back to the *integration* branch,
> so declaring `integrationBranch: dev` alone must not start releasing from
> `main`. **Kanmer's own board deliberately carries no `delivery:` block** —
> the resolved default *is* its policy, and FRD-031 forbids changing it merely
> to demonstrate another one.

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
claim_expires_at: …      # ┐ workspace lease (FRD-030, CORE-121/115): expiry, controller,
claim_controller: run-1  # │ lease id + revision (renew names both), workspace key,
lease_id: <uuid>         # │ phase, heartbeat, previous controller after a transfer.
lease_revision: 3        # │ Absent lease_id on a taken ticket = legacy claim; it gets
lease_controller_run: goal-run-1 # │ its lease on first renew/transfer (one migration path).
lease_workspace: worktree:…      # │ Batch authority pairs the actual MCP actor with this
lease_phase: implementing        # ┘ durable run id; display owner strings are not authority.
lease_batch: batch-x             # ┐ projection of the manifest's frozen batch membership:
lease_batch_controller: run-1    # │ actual declaring request actor (owner labels are not authority)
lease_batch_frozen_at: …         # ┘ absent in isolated mode; cleared through manifest release
labels: [mcp]
links: [API-002]       # structured relations (tool-queryable)
blocks: [API-003]      # this item blocks API-003; blocked-by is derived
refs: [docs/frd/FRD-002.md]  # governing repo docs; satisfies the repo-doc gate
docs_todo: false       # "a governing doc is still to be written" — also satisfies it
commits: [a1b2c3d]     # ┐ traceability, emitted only when non-empty
prs: ["42"]            # ┘
deployment: staging    # only when board.deployment declares environments
delivery_state: integrated       # ┐ delivery state (FRD-031, CORE-116): how far the change
delivery_branch: dev             # │ actually travelled, independent of the workflow stage and
delivery_sha: <40-hex>           # │ never a gate input. `integrated`+ needs branch + exact SHA;
delivery_candidate: release/v1   # │ `released`+ needs release branch + tag. A hotfix delivered on
delivery_release_branch: main    # │ the release branch derives delivery_backport_required, which
delivery_release_tag: v1.0.0     # │ only a real delivery_backport_sha clears.
delivery_backport_required: dev  # ┘ (derived — never a caller input)
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
`index.ts` builds an `McpServer` and registers **41 tools**, plus MCP resources (`kanmer://board`, `kanmer://items/{id}` with `subscribe` support) and two prompts (`standup`, `take-ticket`), then connects a `StdioServerTransport`. Root resolution in `root.ts`. **Init is lazy**: boot never calls `store.init()` — a read-only session (or a host that spawns the server in a workspace nobody opted into Kanmer for) must not create `.kanmer/` just by connecting. The GUI passes the canonical board-worktree root to MCP while keeping all source-repository operations at the selected source root. Write tools call `ensureInit()` first, which creates the skeleton once on the first actual write; read tools degrade to empty/default results when `.kanmer/` doesn't exist yet. Write tools also stamp the activity-log actor from the client's identity, and destructive ops (`delete_item`, `remove_column` with `migrate_to`) confirm via elicitation when the host supports it. Two builds:
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
- Read (`readOnlyHint`) — 17: `get_status`, `list_board`, `list_projects`, `get_sources`, `list_items`, `get_item`, `reconcile_ticket`, `get_execution_packet`, `list_dispatches`, `get_ticket_doc`, `search_items`, `get_group`, `list_groups`, `get_group_doc`, `get_links`, `get_activity`, `get_doc_gates`
- Write — 22: `apply_reconciliation`, `release_channel`, `dispatch_task`, `cancel_dispatch`, `create_item`, `create_items`, `update_item`, `move_item`, `take_ticket`, `set_ticket_doc`, `append_scratch`, `link_items`, `link_doc`, `add_column`, `update_column`, `reorder_columns`, `migrate_board`, `create_group`, `update_group`, `set_group_doc`, `set_sources`, `fetch_source`
- Destructive (`destructiveHint`) — 2: `delete_item`, `remove_column`

`update_group` patches a group's `title`/`body`/`archived` only: `kind` is unpatchable because `createGroup` allocates the id from its prefix, and membership lives on tickets via `update_item(groups: [...])`. It is not `destructiveHint` — archiving is FRD-001 G4's *reversible* retirement path, and it is the only way to edit a group's own `<ID>.md`, which `set_group_doc` refuses.

That is the whole surface; `npm run plugin:check` fails if either this inventory
or the skill's tool reference drifts from the registered names and annotations.

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
| `npm test` | core **and GUI** vitest suites, **and** `npm run test:scripts`. Core Vitest files intentionally run serially: the suite exercises real filesystem and lock behaviour on Windows, so file parallelism can make timing evidence nondeterministic. GUI Vitest files also intentionally run serially: its real-Git sync fixtures are sensitive to Windows full-rail contention. Both commands retain their existing finite test and hook bounds. |
| `npm run test:scripts` | `node scripts/test-scripts.mjs`, which enumerates direct `scripts/*.test.mjs` files and runs them with `node:test`. Deliberately **not** vitest: `scripts/` is dependency-free, and `node:test` needs no root devDependency, no root config, and no `package-lock.json` churn (`release.mjs` refuses on a dirty tree) |
| `npm run typecheck` | type-check **every** workspace — core, mcp-server, ui, gui. Use this, not the per-workspace form: vitest does not typecheck, so a green `npm test` says nothing about types, and a partial typecheck says nothing about the workspaces it skipped |
| `npm run typecheck -w @kanmer/<pkg>` | one workspace, when you want a fast loop |
| `npm run verify` | the authoritative PR check: tests (including manual and generated-document freshness), all-workspace typecheck, core/server build, all MCP smokes, skill and managed-block verification, then plugin synchronization. Run from a normal checkout, not a linked worktree, because `plugin:check` deliberately refuses there. |
| `npm run verify:docs` | validate the manual, resolved `docs/contributing/doc-structure.md` mirror, target-neutral `kanmer-docs` asset, links/fences, and provider boundaries; run directly after documentation or canonical-asset changes. |
| `npm run app` | build + launch the GUI |
| `npm run dev:gui` | GUI with hot reload |
| `npm run dist` | build everything **and** produce `apps/gui/release/Kanmer Setup <v>.exe` |
| `npm run dist:check` | `dist`, then `check-updater-package.mjs` — the eight things that must be true for the **packaged** app to auto-update |
| `npm run release -- <version> --ticket <id>` | the protected-main preparation phase: run the shared `npm run verify` rail, bump/package deterministic artifacts on `release/v<version>`, push only that branch, and open a PR targeting exact `main` with a standalone `Kanmer: <id>` footer. It stops before tag/publisher calls and uses the operator's normal `gh auth` session. |
| `npm run release -- <version> --publish --release-commit <full-sha>` | the post-merge publication phase: from clean merged `main`, require matching manifests and prove the supplied **post-merge** commit is reachable, then build the GUI before creating/pushing only `refs/tags/v<version>`. A GUI-build failure stops before any tag or GitHub Release exists. On build success it publishes once and verifies visibility/updater/every asset. Extend `VERIFY_STEPS`, never a third verification pyramid. Needs `GH_TOKEN` (or `GITHUB_RELEASE_TOKEN`/`GITHUB_TOKEN`). `--dry-run` skips Git/remote publication but still runs verification steps that may write local build outputs. |
| `npm run mcpb:check` | build and deterministically validate the Windows Claude Desktop MCPB from the standalone server; generated output is under `dist/mcpb/` and is not committed |
| `npm run smoke:headless` | run the standalone MCP server from a temporary host with no repository `node_modules`, using an explicit board root |
| `node scripts/verify-release-assets.mjs <version> [--dir <localDir>]` | publisher-side check: compare a published release with the one retained local package generation |
| `node scripts/verify-release-assets.mjs <version> --remote-coherent` | independent CI check: require installer, blockmap, MCPB and `latest.yml` exactly once, then download the public manifest/installer and verify version, URL, size, SHA-512 and GitHub SHA-256 without comparing a separately signed build. Exit 0 = pass, 1 = broken release, 2 = check could not run |
| `npm run plugin:build` | build, then copy the standalone MCP bundle and the `kanmer-setup` managed-block runtime into `plugins/kanmer/` |
| `npm run plugin:check` | fail if MCP tool names drift from the skill's tool reference, if the committed plugin bundle differs from a fresh build, **or if the packaged setup runtime is absent/stale** (requires `npm run build` first). Refuses outright inside a linked worktree when workspace dependency resolution escapes the checkout (§8 gotcha 8). |
| `npm run inspect` | build, then open MCP Inspector against the server (root `./sandbox`) |
| `node packages/mcp-server/src/smoke.mjs` | stdio smoke test against the built server |
| `npm run smoke:protocol` | raw-JSON-RPC stdio check against every protocol version the SDK supports, plus the per-request `_meta` client-identity path |
| `npm run verify:agents-block` | end-to-end check of the `kanmer-setup` AGENTS.md managed block (insert, refresh, idempotence, CLAUDE.md pointer, malformed markers) |
| `node scripts/agents-block.mjs <repo>` | write/refresh that block in a target repo (what `kanmer-setup` calls) |

### Pull-request merge gate

`.github/workflows/pr.yml` runs `kanmer-gate` on PR creation, new commits,
ready-for-review transitions, and **body edits**. The gate resolves its ticket
from the standalone `Kanmer: <ID>` footer in the current PR body, so an edit to
that footer must re-evaluate the same head SHA. It builds core, then fetches the
configured board branch into a separate read-only worktree. In a fresh Actions
checkout a named fetch exists only in `FETCH_HEAD`, so create the tracking ref
the worktree later resolves:

The `verify` job deliberately skips edited events: metadata-only changes need a
fresh body-derived gate result, not another full Windows verification of the
unchanged source tree. It also runs on every push to `main`, so a merge SHA
carries a bound rail result. A push to `main` or a `workflow_dispatch` runs the
`regate` job, which re-runs the `kanmer-gate` job of the latest pull-request
run for every open PR into `main`. The gate reads the remote board tip, so a
board push should also re-judge open PRs — but `pr.yml` cannot listen for
`push: kanmer-board`: GitHub runs push workflows from the pushed ref's tree, and
the board branch carries only `.gitignore` and `.kanmer`. That hook is
**operator-enabled**: `.github/workflows/board-regate.yml` (on `main`) is the
file an operator copies onto the board branch once (instructions in its
header); it dispatches `pr.yml` on `main`, whose `regate` job then re-runs the
gates. Agents never commit to the board branch, so until an operator installs
it, re-gate by hand with `gh workflow run pr.yml --ref main` after pushing the
board. Missing/stale attestations,
`needs-changes`, unreachable commits, and `SYNC_REQUIRED` (an attestation
`board_sha` absent from the fetched board) are warnings until the repository
variable `KANMER_GATE_STRICT` is set to `1`/`true`, which makes them errors.

A batch PR has one standalone `Kanmer: <ID>` footer for every member of the
complete immutable manifest roster, with no omitted or extra ticket. The gate
uses one warning-aware board snapshot, accepts the exact roster only when every
member is in Review, and requires a member-owned independent `pass` attestation
on each ticket naming that same exact PR and full head SHA. The shared diff is
reviewed once; the attestation and post-merge proof remain per member. A
dependency edge whose blocker is inside that exact immutable roster orders the
shared implementation and does not deadlock the protected verdict; external or
dangling blockers still refuse the merge exactly as they do for one ticket.

```bash
git fetch --no-tags origin "refs/heads/$KANMER_BOARD_BRANCH:refs/remotes/origin/$KANMER_BOARD_BRANCH"
git worktree add "$RUNNER_TEMP/kanmer-board" "refs/remotes/origin/$KANMER_BOARD_BRANCH"
```

The gate then runs:

```bash
node packages/mcp-server/src/check-pr.mjs --board "$RUNNER_TEMP/kanmer-board" --event "$GITHUB_EVENT_PATH"
```

Keep that board worktree separate from the pull-request checkout. When changing
the trigger, board-ref setup, or command contract, update
`scripts/pr-workflow.test.mjs` and run `node --test scripts/pr-workflow.test.mjs`,
`npm run test:scripts`, and `node --test packages/mcp-server/src/check-pr.test.mjs`.

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
- **Independent review is a distinct agent role, not a distinct GitHub account.**
  The author may not review or merge its own PR, but a separately assigned
  reviewing agent may use the same repository credential. GitHub remains the
  authority for whether that credential can approve or merge: required reviews,
  unresolved conversations, permissions, and merge settings are not bypassed by
  the Kanmer workflow.
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
4. **The installed app runs the MCP server as Electron-as-Node.** The fixed installer-owned launcher is the portable registration boundary: installs stage the complete Electron runtime tree (exe, sibling DLLs/resource packs, app resources, standalone bundle and skills) under an immutable `%LOCALAPPDATA%\Kanmer\mcp\<version>-<installer-pid>[-<collision-index>]` generation, selecting the first absent name before copying anything, then rename its executable to `kanmer-mcp.exe`. Copying only the exe, ICU and V8 snapshot fails at process start with Windows `0xc0000135`; relying on PID uniqueness can overwrite a retained same-version generation after Windows reuses a PID. The script remains at `<runtime>/resources/mcp/kanmer-mcp.cjs` and bundled skills at `<runtime>/resources/plugins/kanmer/skills`. It activates a stable `current` junction only after the generation is complete and preserves the install-root `Kanmer.exe`/`resources/mcp/kanmer-mcp.cjs` payload as a legacy fallback. Project-scoped `connect.ts` registrations may still invoke the install-root `Kanmer.exe` directly with `ELECTRON_RUN_AS_NODE=1`; the native Antigravity plugin instead uses the portable `%LOCALAPPDATA%\Kanmer\bin\kanmer-mcp.cmd` launcher, which does not require a separate Node install. Codex Connect and its probe invoke that launcher through `powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& (Join-Path $env:LOCALAPPDATA 'Kanmer\\bin\\kanmer-mcp.cmd')"`; this avoids cmd.exe quote rewriting while retaining a rootless, user-portable registration. The standalone bundle must therefore be self-contained (no node_modules at runtime).
5. **electron-builder bundles exactly one thing from `node_modules`: `electron-updater`.** Everything else is moved to `devDependencies` and bundled into `out/` by electron-vite. Having a real `dependencies` entry is what turns on `NodeModulesCollector` — and `files:` needs **no** entry for it, because a *separate* node-module matcher starts from `**/*` (verified in `fileMatcher.js:177-219` and in `builder-debug.yml`'s `nodeModuleFilePatterns`). Do not add `node_modules/electron-updater/**/*` to `files:`; do not assume a new runtime dep is packed just because this one is (it will be, but only if it is in `dependencies` **and** externalized in the Vite main config).
6. **Antivirus + electron-builder:** Windows Defender sometimes quarantines electron-builder's bundled `7za.exe` mid-build (`ENOENT … 7za.exe`). Pinned electron-builder ≥26 fetches 7-Zip fresh and usually avoids it; otherwise restore from quarantine / add a repo exclusion.
7. **The watcher ignores atomic-write temp files** (`.<name>.tmp-*`) and debounces (`watch.ts`). Don't remove the ignore or you'll get double refreshes.
8. **The plugin MCP bundle and setup runtime are committed build artifacts** — deliberately, unlike every other `dist/` output. Plugin installs fetch this repo, so the server and the `scripts/agents-block*.mjs` files named by `kanmer-setup` must already be there and runnable; there is no build step on the user's side. Refresh them with `npm run plugin:build` whenever their canonical sources change. Core compiles *into* the MCP bundle, so **core-only fixes need the rebuild too**; `plugin:check` sha256s every generated artifact against its source so stale or missing output fails loudly.
    **Build and check it at the repo root, never inside a `.worktrees/<id>` worktree** — a worktree has no `node_modules`, so tsup bundles **main's** core instead of yours (SKILL-011 merged a bundle missing the feature it shipped this way). Since MCP-007 `plugin:check` refuses in a worktree rather than passing; `plugin:build` still does not, so a bundle built there is still wrong, just no longer certifiable.
9. **`order` is column-scoped; the board renders by area.** `computeOrder` filters on `status` only (`store.ts:697-698`), while `Board.tsx` groups cards by area inside each column (`groupByArea`). Any drag-and-drop neighbour computation must use `columnCards(items, statusId)` (`lib/board.ts:70`), never a group's cards — otherwise "drop above this card" silently means a different slot, and a single-area test board will not reveal it. `Card` is `memo`ized (`Board.tsx:221`), so pass badge and drop-hint state to it as primitives (`blocked: boolean`, `overdue: boolean`, `dropEdge: "before" | "after" | null`), never a `Set` or object rebuilt each render. `e.stopPropagation()` on the card's `onDrop` is load-bearing: without it the cell handler also fires and issues a second, position-less `moveItem`.
10. **An update force-kills legacy install-root MCP servers — and if it doesn't, the update fails.** Electron Builder 26's stock PowerShell predicate queries nonexistent `Win32_Process.Path`, so it silently matches nothing; `apps/gui/build/installer.nsh` therefore supplies the supported `customCheckAppRunning` override and uses `ExecutablePath` under the exact, canonical trailing-separator `$INSTDIR` boundary. An inaccessible `Kanmer.exe` path is inconclusive (the external runtime is deliberately named `kanmer-mcp.exe` and outside the boundary), every CIM call is time-bounded, and the installer refuses before uninstall on any probe error or remaining process. Install/runtime overlap canonicalizes and compares both roots in both directions so even a drive-root selection cannot contain the external runtime. Direct/legacy registrations still run under `$INSTDIR`, while the fixed launcher provisions fresh sessions from the external runtime under `%LOCALAPPDATA%\Kanmer\mcp`, outside that boundary. `--updated` alone is not proof of an app-driven update because Electron Builder also adds it to every nested old uninstaller. The outer updater marks its process environment and the nested uninstaller inherits that marker; direct interactive replacement retains its notice/cancel path. This is why `mcp-sessions.ts` still exists: it names what dies before the user commits to the update. Failing open (`unknown: true`) remains deliberate for the *warning*; installer clearance itself fails closed. Installer updates retain prior immutable runtime generations because they may still serve live MCP sessions; only uninstall recursively removes the external runtime tree.
    **The trap (GUI-064):** that kill races the uninstaller's own `un.atomicRMDir`, which renames every file out of `$INSTDIR` and aborts on the first rename that fails; the abort exits 2 and the user gets `Failed to uninstall old application files … : 2` with no update. A legacy live MCP server is enough to cause it — **not** by holding `Kanmer.exe` (a mapped image renames fine, as do the DLLs) but by holding `icudtl.dat` and `v8_context_snapshot.bin`, which V8/ICU mmap without `FILE_SHARE_DELETE`. So `installUpdateNow` still calls `stopMcpSessions()` **before** `quitAndInstall` and refuses the install if the legacy folder cannot be cleared. That path fails **closed** — a broken probe is not permission to start a rename we cannot undo. Do not "simplify" the two failure directions into one. External-runtime update survival is a deterministic/package boundary here; real two-version evidence remains INCONCLUSIVE.
11. **`releaseType` defaults to `draft`, and drafts are invisible.** `GitHubProvider` reads `releases.atom` and `/releases/latest`; neither lists drafts, so a draft release silently reaches **zero** installed clients. `electron-builder.yml` sets `releaseType: release` explicitly. Never revert it. Related: its Windows `artifactName` pins the already-safe public name `Kanmer-Setup-<version>.exe`; the local installer, `latest.yml`, GitHub upload, and strict verifier must use that exact name. Never rename release assets by hand — the updater resolves the manifest name independently, and a mixed name can leave every client with a 404.
12. **Electron Builder packages; it does not publish.** v0.3.8 proved its concurrent GitHub publisher can race release creation and leave a partial public release. `release.mjs` therefore runs one `--publish never` package and validates that exact directory before creating or pushing the immutable tag. It then creates a draft GitHub Release, uploads the canonical installer/blockmap/MCPB/manifest set, and compares GitHub digests with the retained files before making the coherent draft public/latest. Every `gh release` mutation pins `collisionengineers/kanmer`; it refuses existing tags/releases and never repairs or clobbers a failed immutable version. Independent tag CI still builds the package as a source-health check, but signed NSIS output is not reproducible across builders; CI uses `--remote-coherent` to bind the public `latest.yml` to the downloaded public installer instead. Draft/public-asset 404s are retryable while auth and API failures remain inconclusive; a missing asset or digest is always a hard failure.
13. **Native plugin lifecycle has two separate proofs.** `plugins/kanmer/plugin.json` and `mcp_config.json` are the Antigravity root source of truth; `mcp_config.json` uses the quote-free `cmd.exe /d /v:on /s /c setlocal EnableDelayedExpansion&&set KANMER_PROVIDER_CWD=!CD!&&pushd !LOCALAPPDATA!\\Kanmer\\bin&&call kanmer-mcp.cmd` token because Antigravity forwards embedded quotes literally and a direct unquoted path breaks when `%LOCALAPPDATA%` contains spaces. The provider cwd is captured before the temporary `pushd` and restored by the installer-owned shim before MCP starts, preserving ADR-0012 board discovery. `scripts/release.mjs` bumps that manifest alongside the Claude/Codex manifests. Connect invokes `agy` through an argv runner (never a shell-interpolated project path), validates/install/list first, then accepts legacy `.agents` cleanup only after a fresh `get_status` result matches the project fingerprint, canonical board root, repo root and format. The old `.agents/mcp_config.json` and `.agents/skills/` paths stay ignored until that migration is complete. The Antigravity CLI path was checked on Windows (`agy` 1.1.14); the IDE and non-Windows launcher path remain outside this contract.
14. **Dispatch success requires a named, machine-checkable deliverable.** A GUI dispatch without a task is rejected; a zero exit code is only terminal success after the supervisor verifies the task's required Kanmer documents (and PR/closed checklist state for execution work). An elicited approval can be arbitrarily slow, so `dispatch_task` re-reads and revalidates ticket stage, documents, claim, archive state, duplicate work and delivery target after approval and immediately before start. Do not treat a process exit alone as proof that work reached the board.
    **Known accepted gap:** v0.3.0's blockmap is still missing on GitHub and is not being backfilled (it needs a rebuild from that tag). Clients still on 0.3.0 pay one full ~78 MB download on their next update, once.

15. **Project identity is `.kanmer/project.json`, not `board.yml` or `version.json`.** `BoardConfigSchema` strips unknown keys on every board write and migration rewrites `version.json`, so either would silently lose the identity under an older server. `project.json` is its own additive file: a v0.3.12 server neither reads nor writes it and a board carrying it stays fully readable there. Rollback is deleting the file — the next write on a newer server re-migrates a fresh `migrated` identity (a *different* uuid; anything that recorded the old one must be re-bound). The ticket `revision` (`rev1:…`) is computed on read over the ticket file plus every pipeline document **except `scratch/` and `reference/`**, and is never written to frontmatter; `expected_revision` is the CAS that finally covers proof/plan/review-record writes (CORE-113 F-015).
16. **The endpoint registry is spawn-time configuration, never a request.** `list_projects` (MCP-054, FRD-029 AC4/AC5) reads `~/.kanmer/endpoints.json` — or the absolute path in `KANMER_ENDPOINT_REGISTRY` set by whoever starts the server — and observes every named board with a throw-away read-only `KanmerStore`; it never `init()`s one, never touches `lastProject` (the answering process's own snapshot), and no tool schema may grow a `root`/`boardRoot`/`repoRoot`/path field (smoke pins this across **all** tools now, not just mutating ones). Malformed entries are reported as `health: "invalid"`, not dropped. The writer helpers (`writeRegistry`/`upsertEndpoint` in `project-registry.ts`) are for operator tooling and the GUI (GUI-144) only; do not wire them to an MCP tool. Readiness (`kanmer-mcp-http-ready`, `kanmer-mcp-remote-ready`, the remote owner file) carries `project_id` additively; consumers still match on `projectFingerprint`.

17. **A claim is a lease, and every ticket write goes through one lock.** `takeTicket`/`renewTicket`/`transferTicket`/`releaseTicket` run under `withExclusiveFileLock(.kanmer/leases.lock)` and re-read the ticket inside it, so the revision CAS and the write are one step (CORE-114 F-009) and the sibling scan that keeps **one live writer per workspace** (`WORKSPACE_OCCUPIED` on a worktree or branch another taken ticket records — `force` does not bypass it) is race-free. Do not add a lease verb that writes outside `withLeaseLock`. **Since CORE-125 that lock is the board's write lock, not the lease verbs' private one:** `updateItem` (and therefore `moveItem`), `setDoc` and `appendScratch` also run their locate → read → CAS → write inside it, so an ordinary field edit can no longer rename over a lease record (CORE-115 F-001) or a sibling's `lease_batch` stamp (CORE-124 F-001). Any new ticket-file writer belongs inside it too. `withLeaseLock` is re-entrant **within one async execution context only** (an `AsyncLocalStorage` set of held lock paths), because `updateItem` → `appendTransition` → `setDoc` and the lease verbs' own transition writes nest — `withExclusiveFileLock` itself is not re-entrant and a naive nested acquire self-deadlocks until its retry budget throws. Keep the section tight: `moveItem` deliberately leaves `assertMoveAllowed` and `computeOrder` (which can rewrite a whole column) outside the lock, and nothing slow, networked or git-shaped belongs inside it. `leaseState()` is the only expiry rule: a taken ticket without `lease_id` is a v0.3.12/CORE-121 legacy claim (expires `taken_at + claimExpiryMinutes`) and receives its lease record on its first renew or transfer — never add a second ownership model or a `migrate_board` step for it. `transfer` is the reclaim: the MCP boundary collects `ReconciliationEvidence` first (core is git-free), the store records the summary in `scratch/execution.md` and `lease_reclaimed_from`, refuses `RECOVERY_REFUSED` for a board/foreign/branch-mismatched workspace, and never deletes anything — an expired lease still owns its workspace until `release` at closeout. Renewal normally names `lease_id` + `lease_revision` (`LEASE_EXPIRED` / `REVISION_CONFLICT`); the no-token compatibility lane is isolated-only and lets a legacy claim migrate through its owner check. A modern manifest-backed batch renewal always supplies both tokens and has no compatibility fallback. Lease fields are additive frontmatter (passthrough), so the live v0.3.12 board reads them unchanged.
18. **A batch is the only exception to one-writer-per-workspace, and its manifest is the authority.** FRD-030 batch mode keeps the three ticket projections (`lease_batch`, `lease_batch_controller`, `lease_batch_frozen_at`) plus one hash-named sidecar under `.kanmer/batches/transactions/`; it adds no tool, stage, database or workflow engine. The first `takeTicket` holds `withLeaseLock`, validates the complete two-or-more-member roster from one warning-aware census, and writes a hash-bound `pending` write-ahead record before changing any endpoint. The same exact declaring request can roll every member from its observed hash to its derived intended hash and compact the record to `active`; contradictory bytes, unreadable tickets, another actor, a partial/extra roster or another request fail closed while preserving the manifest. Batch work authority is the exact pair of the actual MCP request actor and a nonempty durable `controller_run` retained by the controller across reconnects and restarts. The pending, active and releasing manifests persist both values, a canonical repository-relative worktree identity and the branch; changing the local repository root cannot change manifest identity, and host-absolute paths are derived only for local collision checks. Every declaration, recovery, later member take, renew and execution-packet request must exact-match the actor/run pair; `assignee`, `controller`, observable owner strings and a persisted host path never authorize those operations. Batch transfer/reconciliation recovery is refused. `assertWorkspaceFree` lets only that actor/run pair's member share the exact branch/worktree; a non-member still gets `WORKSPACE_OCCUPIED`. `list_items include_archived: true` is the sole complete roster census: it projects each active or releasing manifest back onto every immutable-roster member until the manifest is unlinked, including `state`, the complete `members`, portable `workspace` and `branch`, so a fresh closeout can recover even after all ticket-local projections were cleared. `search_items` projects batch metadata only for matching non-archived results and is never a complete roster census. The PR carries the exact complete footer roster, every member is in Review, and every member owns its independent-pass exact-PR/exact-head attestation and post-merge proof. An internal dependency edge orders members inside that shared PR and is not a live protected-gate blocker; external and dangling blockers remain failures. Cleanup begins only after the immutable roster is entirely Done or archived: closeout captures the warning-free manifest roster, workspace and branch, then removes the one shared worktree and branch while the manifest remains linked; a Git-cleanup failure stops before any release. Only after that cleanup succeeds may the deliberately actor-unbound terminal `releaseTicket` advance `active` → `releasing`, clear members idempotently across interruption, and remove the manifest last. Final unlink therefore happens after Git cleanup, and a fresh closeout can still recover every interrupted release.
    Packet-first applies to untaken siblings too: a consistent actor/run-bound batch packet keeps `ticket.taken` null but projects the immutable manifest branch and portable worktree through `ticket.workspace`, top-level `claim.workspace`, `claim.batch.branch` / `claim.batch.workspace`, and any compiled `step.workspace`. The controller takes that exact existing location; it never creates a per-member worktree. Protected merge then requires every immutable-roster member to report `taken: true`, record the current PR in its own `prs`, and carry an independent PASS review whose `ticket_updated` and `plan_hash` exactly equal that member's current item timestamp and plan-document content version. Those plural checks are hard in strict and lenient modes; singular compatibility remains unchanged.
    A first batch declaration requires a nonempty concrete shared worktree before any WAL or ticket write; only an isolated branch-only take may omit `worktree`. `kanmer-auto` uses the immutable schema-3 automation-ledger `run_id` as `controller_run` on declaration/recovery, packet-first reads, later takes and CAS renewals, never a worker/session/per-call identity. The first member alone creates the shared PR with the exact complete footer roster. Every later member pushes the manifest branch, requires exactly one open PR matching the resolved repository, configured base, manifest head/current SHA and exact roster, records it in its own `prs[]`, and never creates another. After the confirmed shared merge, review re-reads the active manifest and advances every member in immutable order exactly Review → Verifying; already-Verifying is the idempotent retry case, any other stage stops, and review writes no proof.

19. **Plan validation flags; only a `step` request blocks.** FRD-033 (CORE-118) adds two core modules — `plan.ts` (`parsePlan`/`validatePlan`, plus the ATX section reader that used to live in `execution-packet.ts`) and `step-packet.ts` (`compileStepPacket`, `step-packet/2`) — and one optional `step` parameter on `get_execution_packet`. There is **no new tool** (CORE-118 added none; the roster moved to 40 when CORE-131 added `apply_reconciliation` and to 41 when CORE-132 added `release_channel`), no new frontmatter field and no persisted packet; a packet is derived on read through core's bounded execution-authority snapshot. The severity split is load-bearing: `PLAN_VAGUE_INSTRUCTION` and `PLAN_RISK_EVIDENCE_MISSING` are permanently **advisory**, because the shipped plan template says the decision-verb warning "is not a gate or regex score" and `scripts/verify-skill-prose.mjs:347-348` pins that sentence — do not promote them. Structural findings (no compilable step, an allowed file the `## Expected files` table never declares, a file `## Do not modify` forbids, no usable acceptance check, no stop condition, evidence pinned to a superseded version) become blockers **only** when `step` is supplied, which is what keeps every existing plan's whole-ticket packet working unchanged. The step refusal is strictly **last** in the refusal order and, like every other, writes nothing — `smoke.mjs` proves it by byte-comparing `.kanmer`, the ticket file and `activity.jsonl` across it. `"next"` reads a checklist by the step each box names (`- [ ] Step 2 — …`) and only falls back to box position, because real checklists carry more boxes than steps. A constrained packet is never minted unless the selected ordered step has at least one mapped unchecked checklist marker; a whole-ticket packet remains the setup route before that marker exists.
    **Constrained-step authority is controller-held and exact.** `step-packet/2` binds the full canonical packet with a 64-character SHA-256 digest. `packetId` is tamper-evident identity, not authentication. The trusted controller retains the exact full packet inside the live dispatch/reconciliation chain before handing it to a worker, reconciles only that retained object, and never accepts a worker-returned or reconstructed packet as authority. Do not persist full packets or prompts in the automation run ledger. If a crash or reconnect loses the retained object, record packet-loss as `INCONCLUSIVE`, issue no successor packet, and never rebuild authority from the worker result or current board.
    Packet file declarations are canonical repository-relative POSIX paths. Literals, `*` inside one segment, and a whole-segment `**` are supported. Plan declarations normalize benign backslashes to POSIX before validation; absolute paths, traversal, colon forms and other pattern syntax are refused. Packet wire paths and observed Git paths must already be canonical and refuse backslashes. Expected-file globs may cover a narrower step path, never the reverse, and every intersecting forbidden pattern wins. Plan-time glob containment and intersection share one aggregate proof context that charges alphabet construction, NFA closure/transitions, caches and queues; exhaustion reports `PLAN_GLOB_COMPLEXITY`. Observed Git paths preserve their exact bytes and are compared against the declaration direction without normalization. Path matching is iterative and explicitly bounded. Its one shared budget is charged before raw path parsing and before every literal or wildcard comparison; exhaustion is `INCONCLUSIVE`, never an undeclared-path failure or an authorization.
    Both whole-ticket and constrained issuance use one lexical, de-duplicated group census. Counted ticket documents plus unique group ids are capped at 256 before any group or context read; a missing or conflicting resolved identity refuses instead of signing contradictory evidence. Core first binds the requested ticket record, then completes the canonical document/group metadata census and preflights every per-file and aggregate byte bound before opening ticket-document, group-record or context content. Those bytes are read through identity-bound capped handles; replacement, growth, symlink, special-file or hard-link evidence refuses. Physical confinement is anchored at the configured project root: a junction at that root is allowed, but any symlink or junction below it, including `.kanmer` and ticket, document or group directories, refuses. Scratch and reference documents remain revision-exempt while still consuming the inventory and aggregate-byte bounds.
    `reconcile_ticket` is the existing read-only enforcement surface: optional `step_packet` makes it compare the retained baseline with bounded, double-sampled `git --no-optional-locks` HEAD/index/worktree evidence and the live plan, evidence pins, ticket authority, counted document versions and exact checklist text. Packet/document bytes, entries and checklist lines plus the aggregate Git collection time are capped before authority is accepted. Dirty regular-file bytes are read once through one capped handle; pre-open, handle-before/after and post-path device, inode, type, mode, link-count and size facts must agree, and the handle closes on every result. Missing, unreadable, unstable, escaped, unconfined or unprovable linked, or hard-linked evidence is `INCONCLUSIVE`, never PASS; forbidden or undeclared changes are FAIL. Free-form symbol names are descriptive, not mechanically provable from Git paths: any actual change under non-empty `allowedSymbols` adds `STEP_SYMBOL_SCOPE_INCONCLUSIVE`, while forbidden or undeclared path FAIL takes precedence; no-change invents no symbol finding and empty symbols preserve file-scoped PASS. Only the selected unchecked-to-checked checklist marker bytes may change during a step: every raw line body, CRLF/CR/LF terminator and final-newline state otherwise remains exact. Exact checklist bytes retain a leading UTF-8 BOM. Compilation and strict verification derive every marker state from those bytes, require a completed prefix and unfinished selected step, and refuse any checked successor marker. A later packet requires the complete exact prior packet as `prior_step_packet` and that prior reconciliation must PASS; a short id, a reconstructed packet or a numeric skip cannot advance execution.
    Git path evidence covers tracked, staged, unstaged and untracked paths plus both rename endpoints. Every sample also hashes one bounded NUL `git ls-files -v -s -z` index census, binding flag, mode, object id, stage and path: assume-unchanged or skip-worktree entries refuse; nonzero stages and gitlinks refuse without index mutation; and census drift between samples is `INCONCLUSIVE`. A tracked mode-`120000` path is retained only when its checkout representation and capped target bytes are identity-bound and its physical target is a regular file inside the worktree; external, chained-external, dangling, unreadable, unstable or over-budget links refuse. A non-traversable Windows placeholder is retained with its regular representation and exact bytes. Ignored paths and `.git` / common-directory metadata are outside that observable authority: constrained workers must never mutate them. Any need or attempt to do so is a deviation stop and the controller records `INCONCLUSIVE`; absence from the collected path list is never proof that such a write was safe.

20. **Board config is strippable; ticket frontmatter is not — that asymmetry is the whole delivery design.** `BoardConfigSchema` is a plain `z.object()`, so an older server that does not know a key drops it on the *next whole-board write* (`store.setBoard`, reached by the GUI Settings save); `ItemFrontmatterSchema` ends in `.passthrough()`, so unknown ticket keys round-trip untouched. FRD-031 therefore puts the **policy** in `board.yml` (`delivery:`) and the **per-ticket state** in `delivery_*` frontmatter. Three things keep the residual risk honest rather than hidden: the absent-block default is main-only (the safe direction and Kanmer's own policy, which FRD-031 forbids changing to demonstrate another); `get_status.delivery.source` reports `board` vs `default`, so a project that believes it declared a policy can see that the block is gone; and the merge gate's `WRONG_TARGET` check fails the very next PR that starts targeting the wrong branch. Resolve the policy with `resolveDelivery(board)` and the branch a ticket aims at with `deliveryTargets(policy, item)` — the merge gate and the execution packet share that one function precisely so they cannot disagree about what a hotfix is (a hotfix is a ticket whose *recorded* `delivery_branch` is the release branch, never a branch *name*). Delivery state is **non-gating** (ADR-0005): nothing in `gates.ts` or `profiles.ts` may read a `delivery_*` field, or recording a release becomes a way to skip proof. `delivery_backport_required` is recomputed from scratch on every delivery write rather than toggled, so a caller can never record itself as owing nothing.


20. **A red `npm run verify` on Windows used to mean nothing, for three separate reasons — all fixed by CORE-128. Do not reintroduce any of them.**
    **(a) Never remove a temp tree with a bare recursive `fs.rm`.** Use `removeTreeWithRetry` / `removeTreeWithRetrySync` from `@kanmer/core` (`io.ts`). Windows closes handles asynchronously: a file whose last handle just went away is *delete-pending*, so it still occupies its directory entry and the parent `rmdir` fails `ENOTEMPTY`; a directory that was a child process's working directory fails `EBUSY`. `fs.rm` already retries both — but only while `maxRetries > 0`, and **the default is `0`**. That single missing option produced the `ENOTEMPTY … \.kanmer` and `EBUSY rmdir …\Kanmer Test Space\Kanmer\bin` teardown failures that were mistaken for flake for months.
    **(b) Vitest's 5 s default `testTimeout` is not a budget core's tests can meet.** `packages/core/vitest.config.ts` sets 30 s, and the comment there is the reasoning: since CORE-125 every `updateItem`/`moveItem`/`setDoc`/`appendScratch` runs inside the board write lock, whose `DEFAULT_LOCK_RETRY_MS` is **2145 ms** of sleeps before a contended claim gives up, and the *first* locked write in each process resolves the Windows process identity through a synchronous `execFileSync("powershell.exe", …)` costing ~776 ms for this process (cached afterwards) and ~1103 ms for any other pid (never cached) — measured as a ~998 ms first `updateItem` against ~26 ms steady state. Vitest isolates modules per test file, so every file pays the probe again. Suites slow by 3-5x whenever a second rail shares the host. If you raise a timeout, say in a comment which of these costs you are accommodating; never "fix" one of these by weakening an assertion.
    **(c) `NoDefaultCurrentDirectoryInExePath` breaks `cmd.exe` fixtures under an agent.** Agent harnesses define it in their own process environment (process scope only — it is absent from the user/machine environment, an interactive shell and the hosted runner). While it is defined, cmd drops the current directory from its command search path, so the shipped Antigravity token `pushd …\Kanmer\bin&&call kanmer-mcp.cmd` cannot resolve the shim and the child dies `'kanmer-mcp.cmd' is not recognized`. Any test that hands `{ ...process.env }` to a `cmd.exe` child must delete that variable first (see `scripts/antigravity-plugin-config.test.mjs`), or it will fail 100 % under an agent and pass everywhere else — which is exactly how it stayed unexplained. **The shipped launcher token itself is still subject to this**, so a host that really does define the variable cannot run the installed shim; that is a launcher question (gotcha 13), not a test question.
    **(d) Size a lock's retry budget to its critical section, not to the default.** `DEFAULT_LOCK_RETRY_MS` is sized for a board *file* write. `kanmerGit.ts`'s orphan migration runs `git commit`, `git push`, `git diff`, `git rm`, a directory fingerprint and a tree removal inside `withExclusiveFileLock`, which measures 17-19 s under load — so a waiter on the default gave up after 2.1 s and reported the migration *unavailable* when nothing had gone wrong. `withExclusiveFileLock` takes `retryDelaysMs` for exactly this; pass it, with a comment, rather than raising the shared default. A lost race is not a failure.
    **Reproducing it:** run the suite while several processes churn the temp volume and CPU, or with `npx vitest run` (file parallelism on, which the rail's `--no-file-parallelism` normally suppresses), or simply while a second verification rail runs in another worktree. Under any of those the pre-CORE-128 failures appear within one or two runs.

---
21. **Reconciliation applies what it re-collects, and the revision is the binding.** FRD-028's apply half (CORE-131) is one tool, `apply_reconciliation`, and one core dispatcher, `store.applyReconciliation`. The caller never supplies the action: the MCP boundary first finishes at most one bounded transaction already authorised by an interrupted release verb, then re-collects through the **same** `reconcileTicket` the dry run used and applies only what the fresh evidence classifies. The read-only inspector remains mutation-free. A later ticket refusal never writes the ticket or a reconciliation audit line, but the independent release crash recovery may already have completed. Git/GitHub and the full release-history snapshot stay **outside** `withLeaseLock` (item 17). The store samples the constant-size release transaction epoch around that snapshot, then takes `withLeaseLock`, compares the exact epoch and retries the bounded collection when recovery or concurrent progress changed it; it proceeds only while freshly classified evidence remains `not-applicable`, otherwise `RECONCILIATION_DRIFT` refuses it. Only then does it pass the caller's `expected_revision` into `moveItem`/`releaseTicket`/`transferTicket`. Release observation, ticket CAS and mutation therefore share one optimistic atomicity boundary without moving Git, GitHub or an unbounded attempt-history scan under the lock. The revision is document-inclusive, which is exactly why it — and not `updated`, and not PR #286's separate 64-char proposal hash — closes CORE-113's F-015: a proof flipped PASS→FAIL between collect and apply changes it and the apply is refused. The six actions are exhaustive with a `never` default (`MOVE_TO_VERIFYING`, `MOVE_TO_IMPLEMENTING`, `MOVE_TO_DONE`, `ROUTE_VERIFICATION_FAILURE`, `RELEASE_CLEAN_TERMINAL_CLAIM`, `RECOVER_EXPIRED_CLAIM`) and every one is composed from an existing verb — no new stage, no force-push, no required-check bypass, no worktree/branch deletion, no workspace cleaning, no `force` on any lease verb. **No new authority:** the tool takes a `reason` from the caller and lets `backwardMoveEffects` judge it, so Review → Implementing still needs a bound `needs-changes` attestation or an `operator:` reason; do not add a `reconcile:` prefix or a third authority. Typed verification routing reads the proof's `failure_class` verbatim from `kanmer-verify/SKILL.md`: `implementation` → Implementing, `plan` → Preparing, and `transient`, `inconclusive`, an absent class **and an unrecognised one** all recommend **nothing** and leave the ticket in Verifying. A null recommendation is a normal refusal (`RECONCILIATION_INCONCLUSIVE`), not an error. The audit record is the committed `## Transitions` line (`appendTransition`); `appendActivity` stays the best-effort, self-truncating secondary index it has always been and is never the audit.

22. **`/goal` uses schema-3 controller records and dependency-safe rosters.** A ticket's `blocked` flag is board-wide. Parse and record the requested target before resolving dependency feasibility; a target reaches the board's final stage when it is `closeout` or resolves to that final stage itself. Schema-3 ticket dispositions are exactly `queued`, `active`, `waiting`, `blocked`, `target-reached`, `finished`, or `skipped`; `target-reached` is terminal.

    Apply ordinary exclusions first: unpromoted quick captures and live foreign claims are excluded, while expired foreign claims are classified without mutation. After those ordinary exclusions but before outside-roster closure or any dependency pruning, determine exact target satisfaction for every surviving candidate from the current item, gates, and every live provider fact the target requires. Up to review requires the ticket in Review plus a live linked PR that is open against the recorded delivery target with its current head SHA known; record the PR, target, exact head and observation time, because stored `prs`, item and gates alone are not proof. Unavailable or contradictory provider evidence leaves the member nonterminal and `waiting`. An archived or unpromoted quick capture never receives `target-reached`; mandatory exclusions removed it first. An already-target member stays in the frozen roster with terminal `target-reached`, leaves only the needs-advancement set, and is never dependency-blocked; its outgoing edge remains live for unsatisfied members until actual board state clears it. A target-reached member whose expired claim was classified is never transferred.

    Only then resolve outside-roster blockers to a fixed point and build the internal dependency graph. Outside-roster closure and every dependency disposition apply only to nonterminal members in the needs-advancement set; target-reached members remain frozen terminal evidence and may supply outgoing live edges, but are never candidates for pruning or replacement by dependency analysis. Transfer an expired foreign claim only immediately before first assignment after feasibility and a fresh claim read. Record its branch, worktree and dirty-work evidence in the run ledger, then call `take_ticket transfer` directly; never append ticket scratch before transfer. The transfer path re-collects evidence, rechecks liveness under the write lock, and writes its preserved-work summary only after success, so `CLAIM_LIVE` leaves the ticket byte-for-byte unchanged. Preserve its branch, worktree and dirty work, and never transfer a terminal, excluded or target-reached member. An outside-roster blocker excludes the dependent with named evidence, while a safe acyclic in-roster blocker stays queued behind that blocker only when the requested target reaches the board's final stage. Build the cycle graph only from live edges whose dependent is a nonterminal needs-advancement member: a target-reached member may be a blocker source, but no incoming edge is admitted for it, so it can never be a cycle member or cycle-affected recipient. Inspect that filtered directed blocker graph for cyclic components, including self-loops; name each cycle's ordered path and complete members, then give its members and all transitive nonterminal needs-advancement downstream dependents a terminal `blocked` run disposition and dispatch none. For a target that does not reach the final stage, terminally block each dependent on a remaining live edge and all transitive downstream dependents, naming its blocker, requested target and final stage; keep those members in the frozen ledger and dispatch none. Closeout and an explicit final-stage target both retain and serially order the acyclic chain; an already-Done blocker creates no live edge. Freeze exact blocker edges, liveness, target bindings, claim classifications and relevant dispositions as a dependency-safety snapshot. Before every assignment and after every result, compare live state. When any target fact or outgoing blocker liveness changes, first revalidate each implicated terminal target-reached source even though it is outside the needs-advancement set; run that same procedure for every target-reached member immediately before a terminal run status or final report. Each pass re-gathers the current item, gates and target-specific live provider evidence and compares them with the recorded target binding; assign no dependent relying on it until the result is durable. Valid evidence refreshes the exact binding and observation time. Any available required fact that disproves the binding is affirmatively stale or contradictory even if another provider is unavailable: preserve old and current facts, replace `target-reached` with terminal `blocked` reason `target evidence stale:` without reopening or dispatch, and propagate that terminal non-success before dependency feasibility. Mere unavailable or unknown provider evidence, with no available fact disproving the binding, preserves `target-reached` and its last valid binding; record the provider, fact, observation time and exact resume action, keep every dependent relying on it `waiting` and undispatched, let unrelated safe lanes continue, then set the run `paused` with reason `target evidence unavailable:` when none remains ready. Resume only after capability state changes or an explicit resume and run the same revalidation again; unavailability never consumes the verification retry budget, becomes terminal `blocked`, or permits `completed`. Only after implicated terminal sources are valid or affirmatively corrected may graph changes re-run outside-roster closure, cycle detection and target feasibility for nonterminal members still needing advancement; membership remains frozen, and persist/read back every target result and disposition before dispatch. A terminal non-success blocker whose edge stays live terminally blocks every transitive unsatisfied dependent with its reason; unrelated safe lanes continue and terminal dispositions never reopen. Set the run `blocked` only after every safe lane is terminal, and never complete a run with a cycle-affected or target-affected member.

    Schema 3 is the first run schema carrying the numeric `transient_retry_limit` (default 2 per ticket per run) and durable `Transient` count. A failed verification command is never rerun directly by the controller or by the same verifier. Exactly two authorization paths share that one budget: the evidence-bootstrap path may admit at most one evidence-establishing logical attempt per ticket per run, while the classified-transient path may admit another fresh independent logical attempt whenever durable room remains. Every admitted attempt reserves one durable count before its first dispatch. An evidence-bootstrap attempt requires an authoritative proof with `result: FAIL` or `result: INCONCLUSIVE`, `failure_class: inconclusive` and an explicit request for the same failing job at the same SHA; `FAIL` also retains its non-zero failing attempt. It additionally requires an untouched failing path and a concrete environmental mechanism hypothesis without controller self-classification; a classified-transient attempt requires an authoritative exact-SHA `failure_class: transient`. Raising the limit adds classified-transient-path capacity, never a third authorization path. Each logical attempt increments once; a confirmed pre-mutation launch retry reuses that reservation without increment, decrement or reset, while unknown launch status dispatches no replacement. Any proof lacking an allowed bootstrap result, the exact class, explicit request or required retained attempt, and every implementation or plan failure, cannot enter the corresponding route; classification never resets the count.

    Active schema-1/schema-2 records are never restamped or supplemented in place with schema-3 frontmatter or counters: first reconcile every legacy worker and require all to be proven inactive. An active or uncertain worker preserves the old ledger and pointer and permits no successor. After quiescence, resolve every successor value missing from the legacy schema before mutation: copy recorded values; derive schema-1 `scope: group` and its selector only from the group-only schema contract; obtain exact operator values for absent authority, delivery and retry limits; reconstruct transient counts from retained attempts or fail closed at the chosen exhausted limit; and record every value, source, evidence or operator decision and reason. A project mismatch stops. Then append and read back a legacy-schema `successor-prepared` intent containing one deterministic successor id, project, scope, authority, delivery, limits and the exact ordered roster with dispositions plus that complete `field_resolution`; this legacy-valid event append does not change the old schema. Preserve that roster by default and allow fresh selection only with explicit operator authority in the intent. Missing or conflicting field-resolution evidence makes the intent malformed. Only then may the legacy run close under its own schema. Startup rolls an active or terminal prepared handoff forward by creating the exact successor if absent or validating it if present, and updates the pointer last; missing, malformed or conflicting intent stops without an alternate id.
23. **A release channel is a recoverable lease over an immutable attempt, not a ticket — and its evidence is never a gate.** FRD-031's second half (CORE-132) adds `release_channel` (`acquire | renew | record | supersede | complete | fail`) and the complete read side at `get_status.release`; the tool roster is 41. The sidecar has immutable `.kanmer/releases/attempts/<channel>@<ordinal>.json`, a durable ordinal high-water `.kanmer/releases/heads/<channel>.json`, mutable `.kanmer/releases/channels/<channel>.json`, short-lived write-ahead `.kanmer/releases/transactions/<channel>.json`, and the constant-size transaction epoch `.kanmer/releases/state.json`. The head survives successful lease clearing, points to the highest attempt identity ever minted, and supplies the only next ordinal; steady-state allocation reads the head and its endpoint instead of scanning retained history, and a missing endpoint fails closed rather than freeing its candidate identity. Lock-free snapshots additionally require one canonical retained attempt for every ordinal from 1 through that head, so a lost older proof is unavailable rather than neutral. New attempt, head and lease endpoints share the same journal. The epoch becomes `pending` before that journal or any record mutation and `stable` only after the complete write set, which lets reconciliation bind a lock-free history snapshot to its later ticket mutation. The journal admits only the closed legal acquire/renew/record/supersede/complete/fail shapes: unique current/new attempt targets, one-step head and lease CAS, immutable owner/candidate/supersession fields, and byte-identical terminal history. Recovery preflights every recorded CAS before its first write, then idempotently finishes the exact intended set or fails closed, so interruption never creates an active orphan with no mutation path and a late lease conflict never partially rewrites proof. Stable v0.3.12 ignores the sidecar because it is neither `board.yml` nor `.kanmer/areas/`. Channel identities are normalized lower-case before path construction so case-variant Windows aliases cannot create two owners. Every persisted schema-1 object has an exact key set, and every field and enum is validated; an active lease, head and attempt must agree on channel/current identity and the lease/attempt owner, while absence is free only before first mint and malformed or unreadable ownership is never treated as absence or overwritten.

    Every verb reuses `withLeaseLock`, re-reads inside it, CASes `lease_id` + `lease_revision`, and renews expiry on heartbeat **and progress**. Case-collision enumeration happens before that board-wide lock; the locked healthy allocation path stays constant-size. Those public CAS values prove currency, not authority: `renew`, `record`, `complete` and `fail` also require the actual per-request actor to own the lease; only `supersede` has the explicit expired/operator-authorised takeover path. The flat MCP input refuses every field that does not belong to the selected action before Git or mutation, validates a supersede's required lease CAS before resolving Git, and one `record` cannot claim both service unavailable and recovered. The MCP boundary reads the complete delivery policy, records its digest, resolves the integration SHA outside the lock, and the store refuses `RELEASE_POLICY_DRIFT` if that policy version changed before mint. A call-local store binds the actual per-request client actor across that async collection, so observable/caller-supplied owner text can never authorise takeover. `candidate_id` remains a `cand1:` digest over normalized channel + exact SHA + ordinal; `delivery_policy_version` joins the frozen identity fields. `acquire` refuses live or expired existing ownership. `supersede` gives an active attempt the `superseded` terminal disposition and an explicit successor, but an already failed terminal record remains byte-for-byte failed; the new attempt names it through `supersedes` and inherits no verification or artifact evidence. Retry schedules stop changing once their numeric bound is exhausted. Attempts are ordered causally by immutable ordinal within their channel, never timestamps; incomparable cross-channel terminal outcomes are contended. `get_status.release` retains current and terminal outcomes, reasons, verification, retry schedule, PRs, tickets, tag, artifacts and predecessor/successor, plus pending journals and unreadable state. `complete` clears the lease but never the durable head; `fail` retains the lease and its proof. `classifyReleaseEvidence` maps unreadable/pending evidence conservatively and follows a superseded attempt's causal successors even when their fresh ticket roster drops a predecessor's ticket, so a finished or deliberately excluded release stays `not-applicable` and ordinary tickets never wait for release. Nothing in `gates.ts`/`profiles.ts` may read a release record.

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
9. If `/docs/` or the `kanmer-docs` asset changed: `npm run verify:docs` — the manual and resolved generated-document mirror checks must be green.
10. **If the GUI packaging or the updater changed:** `npm run dist:check`, then boot the **packaged** binary under `KANMER_SMOKE` (`release/win-unpacked/Kanmer.exe --user-data-dir=<fresh dir>`). Compiling is not evidence — this pair is what catches "works in dev, silently dead when packaged", which is the most likely way an updater change ships broken. If `npm run dist` fails with `EBUSY` because a Kanmer is running from `release/`, build elsewhere instead: `npx electron-builder --win --config.directories.output=release-check` from `apps/gui`, then `node scripts/check-updater-package.mjs --out apps/gui/release-check`.

---

## 11. Known limitations / roadmap

- Windows installer only so far (macOS/Linux electron-builder targets not configured).
- **Release verification is independent CI; publishing remains local.** `.github/workflows/release.yml` runs one read-only `release-verify` job on each `v*` tag push. It validates source and an independently built package, then polls `node scripts/verify-release-assets.mjs <version> --remote-coherent`. It never treats its separately signed installer as the publisher's bytes, and it never publishes or repairs releases; `npm run release <version>` is the sole publication owner.
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

## Protected-main release operation

`npm run release -- <version> --ticket <id>` prepares the bump and deterministic
artifacts on `release/v<version>`, pushes only that branch, and opens a PR
targeting exact `main` with a standalone `Kanmer: <id>` footer. It never pushes
`main`, creates a tag, or publishes. After the authorized PR merge and required
`verify`, run
`npm run release -- <version> --publish --release-commit <full-sha>` from clean
local `main`; the full post-merge SHA must be an ancestor before the script
runs the existing GUI build. A GUI-build failure stops there: it creates neither
the immutable tag nor a GitHub Release. Only a successful build permits the
script to create/push `refs/tags/v<version>` and publish. The tag workflow stays
read-only verification. Live PR/merge, publisher, latest-release, and real
two-version updater evidence are external until recorded.
