# Kanmer Improvement Roadmap — Format v2, Windows polish, agent ergonomics

Master overview. Each phase has its own folder with a detailed, self-contained plan:

| Phase | Folder | Theme | Status |
|---|---|---|---|
| 1 | [phase-1-core-correctness/](phase-1-core-correctness/plan.md) | Core correctness & safety (validation, path safety, races) | ✅ done |
| 2 | [phase-2-format-v2-storage/](phase-2-format-v2-storage/plan.md) | Format v2 storage engine + migration (area folders, ticket folders, doc pipeline) | ✅ done |
| 3 | [phase-3-mcp-surface/](phase-3-mcp-surface/plan.md) | MCP surface v2 + 2026-07-28 modernization | ✅ done (cacheable tools/list awaits SDK) |
| 4 | [phase-4-gui-trust/](phase-4-gui-trust/plan.md) | GUI trust (no data loss, honest errors) | ✅ done |
| 5 | [phase-5-windows-app/](phase-5-windows-app/plan.md) | Real Windows app (icon, toasts, shortcuts, a11y) | ✅ done |
| 6 | [phase-6-data-model/](phase-6-data-model/plan.md) | Data-model extras (activity log, blocks, due, ordering) | ✅ done |
| 7 | [phase-7-gui-evolution/](phase-7-gui-evolution/plan.md) | GUI evolution & delight (doc tabs, standup, perf) | ✅ done |
| 8 | [phase-8-skills-plugin-docs/](phase-8-skills-plugin-docs/plan.md) | Skills, plugin, docs (workflow rewrite, kanmer-setup) | ✅ done |

Implementation log: [phase-0-pr1-verify-merge/plan.md](phase-0-pr1-verify-merge/plan.md).

## Context

Kanmer (v0.1.0) is a file-based kanban where AI agents (11-tool stdio MCP server) and a human (Electron GUI) share `.kanmer/` Markdown+YAML files as the single source of truth, synced through a chokidar watcher. Exploration found real problems: the GUI editor silently clobbers concurrent agent edits; the store validates nothing against the board (typo'd stages create phantom columns); `../` in an id escapes `.kanmer/`; concurrent creates can silently lose a ticket; the shipped app has no icon, no AppUserModelId, stock Electron menu with DevTools, zero keyboard/ARIA support; agents lack bulk ops, change queries, and any "where am I" check.

The full roadmap was chosen, with the data model redesigned around one idea: **the ticket is the governing unit**. Areas own folders, each ticket owns a folder containing its working documents (research → impact → plan → checklist → proof), tickets get area-based IDs, and "taking" a ticket records when/branch/worktree. Plans and research stop being peer item types — they exist FOR tickets, as files in the ticket's folder.

## Locked decisions

- **Scope:** full roadmap (all tiers), phased.
- **GUI Delete = Archive**; permanent delete only from an archived-items view (MCP `delete_item` stays for agents).
- **Windows toasts on by default** when unfocused; batched; click focuses the item; Settings toggle.
- **Data model additions:** activity log, blocks/blocked-by, due dates, manual card ordering.
- **Storage:** area folders + folder-per-ticket + area-based ticket IDs; plans/research become per-ticket documents.
- **Doc pipeline:** research + impact ("files to change") → plan → checklist + proof. Proof is **required** to finish.
- **Taken semantics:** taking a ticket records `taken_at`, `branch`, `worktree`, and moves the stage.
- **"PR Review" is a default area.**
- **IDs are immutable** — area change moves the folder, never renumbers; links stay valid.
- **Format version file in `.kanmer/`**; migration = core reads both formats + GUI prompts to migrate.
- **`kanmer-onboard` → `kanmer-setup`** with greenfield / brownfield / upgrade modes.
- **kanmer-setup writes Kanmer operating instructions at the very top of the target repo's AGENTS.md** (managed marker block, created if AGENTS.md is missing, refreshed idempotently on upgrade).
- **Adopt relevant MCP 2026-07-28 features** (SDK upgrade, cacheable lists, MRTR elicitation, client identity in `_meta`, resources/subscriptions).

## Target data model — Format v2

```
.kanmer/
  version.json            NEW — { "format": 2 } (+ migratedFrom/migratedAt after upgrade)
  data/
    board.yml             areas gain "prefix"; "PR Review" (prefix PR) in defaults
    counters.json         keyed by ID prefix: { "API": 3, "PR": 0, "TICK": 1 }
    activity.jsonl        NEW (Phase 6) — append-only mutation log, derived, not truth
  areas/
    api/                  one folder per area (folder name = area id)
      API-001/            one folder per ticket (folder name = ticket id)
        API-001.md        THE TICKET — governs everything in this folder
        research.md       findings gathered for the ticket
        impact.md         the "files to change" survey: files/modules the work touches
        plan.md           written FROM research.md + impact.md
        checklist.md      step-by-step of the plan (markdown checkboxes), made after plan
        proof.md          REQUIRED evidence before the ticket may reach the final stage
        …anything else    attachments/notes live with the ticket
    pr-review/            default area on new boards
    _none/                tickets with no area (prefix TICK)
      TICK-001/TICK-001.md
```

- **IDs:** each area has a `prefix` (default: area id uppercased, `[A-Z0-9]{2,6}`, validated unique across areas + `TICK`). Ticket created in area `api` → `API-001`. No area → `TICK-NNN`. Per-prefix counters with on-disk max reconcile. Folder name = id, so lookup is a readdir of `areas/*` — no index needed.
- **Frontmatter additions** (all optional; added to `KEY_ORDER` in `packages/core/src/frontmatter.ts` + optional in `ItemFrontmatterSchema`, omitted when unset): `taken_at`, `branch`, `worktree`; later `due`, `blocks: []`, `order` (Phase 6).
- **Plan/research item types retire.** Migration folds each legacy `PLAN-xxx`/`RES-xxx` into the ticket it links to (via `links[]`/backlinks) as `plan.md`/`research.md`; one linking to multiple tickets goes to the first with a note in the migration report; one linking to none is converted to a ticket (title/body preserved, label `legacy-plan`/`legacy-research`) so nothing is lost. GUI Plans/Research tabs go away.
- **Frontmatter `area` stays authoritative**; folder location is derived from it. A hand-moved file that disagrees is reported as a warning and reconciled on next write.
- **Format detection:** `version.json` absent + `tickets/` present = format 1. Core reads BOTH formats transparently; the GUI offers "Migrate to v2?" on opening a v1 board; `kanmer-setup` upgrade mode does the same for agent-only flows.

## Sequencing

Phase 1 → 2 → 3 is the core track; Phases 4 → 5 (GUI) can run in parallel with 2–3; Phase 6 after 2; Phase 7 after 3 + 6; Phase 8 tracks every tool change and finalizes last.

## Cross-cutting release rail

Any change to the MCP tool surface or core behavior must ride this rail or the plugin drifts:

1. Code change + vitest (`packages/core`) and smoke coverage (`packages/mcp-server/src/smoke.mjs`).
2. New/changed tools get a row in `plugins/kanmer/skills/kanmer-workflow/references/tool-reference.md` (`scripts/check-plugin-sync.mjs` gates tool names).
3. Update affected `SKILL.md` files.
4. `npm run build && npm run plugin:build` to refresh the committed bundle `plugins/kanmer/mcp/kanmer-mcp.cjs` (core compiles into it — even core-only fixes need a rebuild), then `npm run plugin:check`.

## Verification (roadmap-level)

- **Core:** vitest — validation errors list valid ids; traversal ids rejected; no-op update leaves `updated`/mtime unchanged; exclusive-create under concurrency; migration round-trip (v1 fixture → migrate → v2, content preserved, idempotent); doc API; proof gate; taken semantics.
- **Server:** extend `smoke.mjs` for every new tool + annotation; run against both dev build and plugin bundle.
- **GUI:** `KANMER_SMOKE=1` launch check; manual pass per AGENTS.md §10 — v1 board → migration prompt → migrate → renders; edit while an agent moves the same ticket (no clobber); unfocused toast; keyboard-only session; `npm run dist` installer shows icon + taskbar grouping.
- **End-to-end:** register the plugin in Claude Code against a scratch repo; `kanmer-setup` greenfield (AGENTS.md gets the instructions block); take a ticket through research → proof → done; GUI mirrors every step live.
