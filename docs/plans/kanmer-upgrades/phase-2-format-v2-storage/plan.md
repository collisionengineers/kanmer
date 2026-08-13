# Phase 2 — Format v2 storage engine + migration

**Goal:** restructure `.kanmer/` around the ticket as the governing unit — area folders, folder-per-ticket, area-based immutable IDs, the five-document pipeline, taken semantics, proof gate, format versioning, and a safe v1→v2 migration. All in `packages/core`.

**Depends on:** Phase 1 (validation + exclusive create). **Feeds:** Phases 3, 6, 7, 8.

## Target layout

```
.kanmer/
  version.json            { "format": 2 } (+ migratedFrom/migratedAt after upgrade)
  data/
    board.yml             areas gain "prefix"; "PR Review" (prefix PR) in defaults
    counters.json         keyed by ID prefix: { "API": 3, "PR": 0, "TICK": 1 }
  areas/
    api/                  folder name = area id
      API-001/            folder name = ticket id
        API-001.md        THE TICKET — governs everything in this folder
        research.md       findings gathered for the ticket
        impact.md         "files to change" survey: files/modules the work touches
        plan.md           written FROM research.md + impact.md
        checklist.md      step-by-step of the plan (markdown checkboxes)
        proof.md          REQUIRED before the ticket may reach the final stage
        …anything else    attachments/notes live with the ticket
    pr-review/            default area on new boards
    _none/                tickets with no area (prefix TICK)
      TICK-001/TICK-001.md
```

Doc pipeline: research + impact are inputs to plan; plan is the source for checklist and proof. The ticket `.md` ties them together.

## Items

### 2.1 `version.json` + format detection — S
- New `packages/core/src/version.ts`: read/write `{ format: 2 }`; `store.init()` stamps it on new boards. Detection: `version.json` absent + legacy `tickets/` dir present → format 1; absent + nothing → fresh (init as v2). Store caches the detected format per instance.

> **Amended by the PR #2 review remediation:** the per-instance format cache is now stat-stamped against `version.json` and re-validated on every read, and is not cached at all while `version.json` is absent (half-migrated boards), so a second live instance sees a migration immediately.


### 2.2 Board schema: area prefixes + PR Review default — S
- **Where:** `packages/core/src/types.ts`, `board.ts`.
- Areas gain `prefix` (zod default: area id uppercased, filtered to `[A-Z0-9]`, 2–6 chars). `defaultBoardConfig()` adds area `{ id: "pr-review", name: "PR Review", prefix: "PR" }`. `writeBoard` validates prefix uniqueness across areas + the `TICK` fallback and the plan/research legacy prefixes.

### 2.3 Paths v2 — M
- **Where:** `packages/core/src/paths.ts`.
- New: `areaDir(paths, areaId)`, `ticketDir(paths, id)`, `ticketFile(paths, id)`, `docFile(paths, id, doc)`. `findFile` resolution order: scan `areas/*/<id>/<id>.md` (folder name = id, so it's a readdir of `areas/*` + direct existence check — O(#areas)), then legacy `tickets|plans|research/<id>.md` for v1 boards. `assertSafeId` (Phase 1.2) also applied to area ids used in paths.

### 2.4 Store v2 — L
- **Where:** `packages/core/src/store.ts`.
- `createItem`: place ticket at `areas/<area|_none>/<ID>/<ID>.md`; id = `<areaPrefix|TICK>-NNN` from per-prefix counters + on-disk max reconcile + exclusive create (Phase 1.8).
- `updateItem` with an `area` change: move the ticket **folder** to the new area dir (`fs.rename`); id never changes (immutable — links stay valid; prefix is a birth certificate, not a live address).
- `deleteItem`: remove the ticket folder recursively — destroys attachments; tool description must say so.
- `listItems`: walk `areas/*/*/<id>.md` (+ legacy dirs on v1); frontmatter `area` is authoritative — a hand-moved folder that disagrees produces a warning (Phase 1.6 channel) and is reconciled on next write.
- Watcher: chokidar already watches `.kanmer` recursively — nested layout needs no watcher change; GUI notification mapping keys off `<id>.md` basenames as before.

### 2.5 Ticket docs API — M
- **Where:** `store.ts` + `paths.ts`.
- `getDoc(id, doc)` / `setDoc(id, doc, content, { append })` for `research | impact | plan | checklist | proof`. Docs are plain Markdown, no frontmatter; `append` adds after a trailing blank line (non-clobbering progress notes). `getItem` result gains `docs: { research: bool, impact: bool, … }` and checklist progress (`{ checked, total }` parsed from `- [ ]` / `- [x]` lines).

### 2.6 Taken semantics — S
- **Where:** `store.ts`; frontmatter additions `taken_at`, `branch`, `worktree` (optional, in `KEY_ORDER` after `assignee`, omitted when unset).
- `takeTicket(id, { branch, worktree?, stage?, assignee? })`: sets `taken_at = now`, `branch`, `worktree`, moves to `stage` (default `implementing`), sets assignee if given. Errors if `taken_at` already set unless `force`. `releaseTicket(id)` clears all three.

### 2.7 Proof gate — S
- **Where:** `store.ts` `updateItem`/`moveItem`.
- Moving a ticket to the **last** board stage requires `proof.md` to exist in its folder; otherwise throw: `TICK-012 cannot move to "done": proof.md is missing. Write it with set_ticket_doc(doc: "proof")`. Applies to tickets only.

### 2.8 Migration v1 → v2 — L
- **Where:** new `packages/core/src/migrate.ts`.
- Steps: (1) dry-run produces a report (for the GUI prompt); (2) move each ticket into `areas/<area|_none>/<id>/` — ids keep their `TICK-` prefix (immutable); (3) fold each legacy plan/research into the ticket it links to (via `links[]` ∪ backlinks) as `plan.md`/`research.md`; multi-linked → first ticket + report note; unlinked → converted to a ticket (title/body preserved, label `legacy-plan`/`legacy-research`) so nothing is lost; (4) add `prefix` to existing areas (auto-derived, uniqueness-checked); (5) rewrite `counters.json` keyed by prefix; (6) write `version.json` with `migratedFrom`/`migratedAt`; (7) return a human-readable report. Idempotent — re-run on a v2 board is a no-op.

> **Amended by the PR #2 review remediation:** "re-run is a no-op" covered only *completed* runs. `migrateToV2` is now resumable **mid-run**: all three loops check-before-act, a pre-flight claim map refuses colliding destinations via `MigrationReport.blockers` rather than half-writing, and `migrate.test.ts` covers interruption in both the move and fold loops. This matters on Windows, where `fs.rename` can fail `EPERM`/`EBUSY` under Defender or OneDrive.

- Core reads BOTH formats transparently until migrated; the GUI prompts "Migrate to v2?" on opening a v1 board (Phase 7 wires the prompt); `kanmer-setup` upgrade mode drives the same function for agent-only flows (Phase 8).

## Verification
- vitest: v1 fixture board → dry-run report correct → migrate → v2 layout asserted, ticket bodies byte-preserved, linked plan folded into ticket folder, orphan research became a labeled ticket, re-run is a no-op.
- Area change moves the folder and keeps the id; docs API round-trips; checklist progress parsing; take/release; proof gate blocks and its error names the tool to use.
- Both-format reads: a v1 board lists/gets/updates items without migration.
- Release rail: rebuild plugin bundle (`npm run plugin:build && npm run plugin:check`).
