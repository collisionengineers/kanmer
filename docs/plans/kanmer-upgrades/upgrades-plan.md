\# Kanmer Improvement Roadmap — Format v2, Windows polish, agent ergonomics



\## Context



Kanmer (v0.1.0, 4 commits) is a file-based kanban where AI agents (11-tool stdio MCP server) and a human (Electron GUI) share `.kanmer/` Markdown+YAML files as the single source of truth, synced through a chokidar watcher. Exploration found real problems: the GUI editor silently clobbers concurrent agent edits; the store validates nothing against the board (typo'd stages create phantom columns); `../` in an id escapes `.kanmer/`; concurrent creates can silently lose a ticket; the shipped app has no icon, no AppUserModelId, stock Electron menu with DevTools, zero keyboard/ARIA support; agents lack bulk ops, change queries, and any "where am I" check.



The user chose the \*\*full roadmap\*\* and redesigned the data model around it: \*\*the ticket is the governing unit\*\*. Areas own folders, each ticket owns a folder containing its working documents (research → impact → plan → checklist → proof), tickets get area-based IDs, and "taking" a ticket records when/branch/worktree. Plans and research stop being peer item types — they exist FOR tickets, as files in the ticket's folder.



\## Locked decisions (from Q\&A)



\- \*\*Scope:\*\* full roadmap (all tiers), phased.

\- \*\*GUI Delete = Archive\*\*; permanent delete only from an archived-items view (MCP `delete\_item` stays for agents).

\- \*\*Windows toasts on by default\*\* when unfocused; batched; click focuses the item; Settings toggle.

\- \*\*Data model additions:\*\* activity log, blocks/blocked-by, due dates, manual card ordering.

\- \*\*Storage:\*\* area folders + folder-per-ticket + area-based ticket IDs; plans/research become per-ticket documents.

\- \*\*Doc pipeline:\*\* research + impact ("files to change") → plan → checklist + proof. Proof is \*\*required\*\* to finish.

\- \*\*Taken semantics:\*\* taking a ticket records `taken\_at`, `branch`, `worktree`, and moves the stage.

\- \*\*"PR Review" is a default area.\*\*

\- \*\*IDs are immutable\*\* — area change moves the folder, never renumbers; links stay valid.

\- \*\*Format version file in `.kanmer/`\*\*; migration = core reads both formats + GUI prompts to migrate.

\- \*\*`kanmer-onboard` → `kanmer-setup`\*\* with greenfield / brownfield / upgrade modes.

\- \*\*Adopt relevant MCP 2026-07-28 features\*\* (SDK upgrade, cacheable lists, MRTR elicitation, client identity in `\_meta`, resources/subscriptions).



\---



\## Target data model — Format v2



```

.kanmer/

&#x20; version.json            NEW — { "format": 2 } (+ migratedFrom/migratedAt after upgrade)

&#x20; data/

&#x20;   board.yml             areas gain "prefix"; "PR Review" (prefix PR) in defaults

&#x20;   counters.json         keyed by ID prefix: { "API": 3, "PR": 0, "TICK": 1 }

&#x20;   activity.jsonl        NEW (Phase 6) — append-only mutation log, derived, not truth

&#x20; areas/

&#x20;   api/                  one folder per area (folder name = area id)

&#x20;     API-001/            one folder per ticket (folder name = ticket id)

&#x20;       API-001.md        THE TICKET — governs everything in this folder

&#x20;       research.md       findings gathered for the ticket

&#x20;       impact.md         the "files to change" survey: files/modules the work touches

&#x20;       plan.md           written FROM research.md + impact.md

&#x20;       checklist.md      step-by-step of the plan (markdown checkboxes), made after plan

&#x20;       proof.md          REQUIRED evidence before the ticket may reach the final stage

&#x20;       …anything else    attachments/notes live with the ticket

&#x20;   pr-review/            default area on new boards

&#x20;   \_none/                tickets with no area (prefix TICK)

&#x20;     TICK-001/TICK-001.md

```



\- \*\*IDs:\*\* each area has a `prefix` (default: area id uppercased, `\[A-Z0-9]{2,6}`, validated unique across areas + `TICK`). Ticket created in area `api` → `API-001`. No area → `TICK-NNN`. Per-prefix counters with on-disk max reconcile. Folder name = id, so lookup is a readdir of `areas/\*` — no index needed.

\- \*\*Frontmatter additions\*\* (all optional; added to `KEY\_ORDER` in `packages/core/src/frontmatter.ts` + optional in `ItemFrontmatterSchema`, omitted when unset so old files don't grow noise): `taken\_at`, `branch`, `worktree`; later `due`, `blocks: \[]`, `order` (Phase 6).

\- \*\*Plan/research item types retire.\*\* Migration folds each legacy `PLAN-xxx`/`RES-xxx` into the ticket it links to (via `links\[]`/backlinks) as `plan.md`/`research.md`; one that links to multiple tickets goes to the first with a note in the migration report; one linking to none is converted to a ticket (title/body preserved, label `legacy-plan`/`legacy-research`) so nothing is lost. GUI Plans/Research tabs go away.

\- \*\*Frontmatter `area` stays authoritative\*\*; folder location is derived from it. A hand-moved file that disagrees is reported as a warning (Phase 1.8) and reconciled on next write.

\- \*\*Format detection:\*\* `version.json` absent + `tickets/` present = format 1. Core reads BOTH formats transparently (reads/writes happen wherever the file lives); the GUI offers "Migrate to v2?" on opening a v1 board; `kanmer-setup` upgrade mode does the same for agent-only flows.



\---



\## Phase 1 — Core correctness \& safety (`packages/core`, `packages/mcp-server`)



All small/medium, independent of the v2 restructure; land first.



1\. \*\*Validate `status`/`area`/`priority` against board on write\*\* — `store.ts` `createItem`/`updateItem` (covers `moveItem`). Error lists valid ids so the model self-corrects: `Unknown status "qa". Valid: todo, planning, …`. Only validate fields being written (legacy items in phantom stages stay editable). Replace hardcoded `priority ?? "medium"` (store.ts:122) with board-derived default. \*\*(S)\*\*

2\. \*\*Path-traversal fix\*\* — `paths.ts` `itemFile()`: enforce `^\[A-Za-z0-9]\[A-Za-z0-9.\_-]\*$` on ids, reject `..`, assert resolved path stays inside `.kanmer`. \*\*(S)\*\*

3\. \*\*No `updated` bump on no-op writes\*\* — `store.ts` `updateItem`: field-compare pruned patch vs current; return unchanged without writing. Repairs standup staleness signal, stops watcher churn. \*\*(S)\*\*

4\. \*\*`link\_items` target must exist\*\* (add only; remove stays permissive for cleanup); validate `links\[]` on create too. `links.ts`/`store.ts`. \*\*(S)\*\*

5\. \*\*`delete\_item` cleans dangling links\*\* — rewrite referencing items' `links\[]` via `updateItem`; return `{deleted, cleanedLinks, bodyReferencesRemain}`. Body `\[\[wiki-links]]` untouched (prose). \*\*(S/M)\*\*

6\. \*\*Surface malformed-file / filename-id-mismatch warnings\*\* — `listItemsWithWarnings()` in `store.ts` (existing signature preserved); `list\_items` appends `warnings` when non-empty; `list\_board` reports `source: "file" | "default"`. \*\*(M)\*\*

7\. \*\*Optimistic concurrency\*\* — optional `expected\_updated` on `update\_item`/`move\_item`; mismatch → conflict error embedding fresh frontmatter + "re-read, re-apply". GUI and casual calls keep last-write-wins. \*\*(M)\*\*

8\. \*\*Create race fix\*\* — new `writeFileExclusive` in `io.ts` (temp + `fs.link`, fallback `flag:"wx"`); `createItem` retries with id re-allocation on `EEXIST`. Crash-safe, no lockfile. (Lands with Phase 2's per-prefix counters to avoid doing the id work twice.) \*\*(M)\*\*



\## Phase 2 — Format v2 storage engine + migration (`packages/core`)



\- \*\*`version.json` read/write + format detection\*\* — new `version.ts`; `init()` stamps format 2 on new boards. \*\*(S)\*\*

\- \*\*Board schema:\*\* areas gain `prefix` (zod default derived from id); `defaultBoardConfig()` adds `PR Review` area (id `pr-review`, prefix `PR`); prefix-uniqueness validation in `writeBoard`. `types.ts`, `board.ts`. \*\*(S)\*\*

\- \*\*Paths v2\*\* — `paths.ts`: `areaDir(areaId)`, `ticketDir(id)`, `ticketFile(id)`, `docFile(id, doc)`; `findFile` scans `areas/\*/<id>/` (v2) then legacy type dirs (v1). \*\*(M)\*\*

\- \*\*Store v2\*\* — `createItem` places ticket by area with prefix-derived id; area change in `updateItem` moves the folder (id unchanged); `deleteItem` removes the folder recursively (destroys attachments — reflected in tool description); per-prefix `counters.json` + exclusive create (Phase 1.8). \*\*(L)\*\*

\- \*\*Ticket docs API\*\* — `getDoc(id, doc)`, `setDoc(id, doc, content, {append})` for `research|impact|plan|checklist|proof`; `getItem` result gains `docs: {research: bool, …}` + checklist progress (`checked/total` parsed from `- \[ ]`/`- \[x]`). Docs are plain Markdown, no frontmatter. \*\*(M)\*\*

\- \*\*Taken semantics\*\* — `takeTicket(id, {branch, worktree?, stage?, assignee?})` sets `taken\_at`/`branch`/`worktree`, moves stage (default `implementing`); errors if already taken unless forced; `releaseTicket` clears them. \*\*(S)\*\*

\- \*\*Proof gate\*\* — moving a ticket to the LAST board stage requires `proof.md` to exist; error tells the agent to write it via `set\_ticket\_doc`. \*\*(S)\*\*

\- \*\*Migration v1→v2\*\* — `migrate.ts`: move each ticket into `areas/<area|\_none>/<id>/` (ids keep TICK prefix — immutable); fold linked plans/research into ticket folders; convert orphans to tickets; write `version.json`; return a human-readable report. Idempotent, dry-run mode for the GUI prompt. \*\*(L)\*\*

\- \*\*Watcher:\*\* chokidar already watches `.kanmer` recursively — nested layout needs no change; notification id mapping keys off `<id>.md` basenames as before.



\## Phase 3 — MCP surface v2 + modernization (`packages/mcp-server`)



New/changed tools (each needs a `tool-reference.md` row — `scripts/check-plugin-sync.mjs` gates names):



\- \*\*`get\_status`\*\* — projectRoot, `.kanmer` path, format version, whether boot created `.kanmer/`, board source, per-stage/type counts, warning count. Kills the "server silently made `.kanmer/` in the wrong cwd" foot-gun; skills lead with it. \*\*(S)\*\*

\- \*\*`take\_ticket`\*\* (action take|release, branch, worktree, stage) — wraps store. \*\*(S)\*\*

\- \*\*`get\_ticket\_doc` / `set\_ticket\_doc`\*\* (doc enum, `append` flag) — the doc pipeline surface; `append` gives non-clobbering progress notes (replaces the separate `append\_body` idea for docs; keep `update\_item body` for the ticket itself). \*\*(M)\*\*

\- \*\*`create\_items`\*\* (bulk, cap \~50, per-entry results) — `kanmer-setup` brownfield seeds in one call. \*\*(M)\*\*

\- \*\*`list\_items` gains `updated\_since`, `sort` (`id|updated\_desc`), `limit`;\*\* summaries gain `archived`, `created`, `taken` (branch), `docs`/checklist progress. \*\*(S)\*\*

\- \*\*Board management:\*\* `update\_column` (name/color), `remove\_column` (empty or `migrate\_to` — rewrites items), `reorder\_columns` (permutation-validated). Granular verbs, not a whole-board setter. \*\*(M/L)\*\*

\- \*\*Move gate + conflict errors\*\* from Phases 1–2 flow through `guard()` unchanged.



MCP 2026-07-28 modernization:



\- \*\*Upgrade `@modelcontextprotocol/sdk` ^1.12.0 → latest\*\* (2026-07-28 support; stdio impact is minimal, old hosts keep negotiating older versions). \*\*(M)\*\*

\- \*\*Actor attribution:\*\* read client identity from per-request `\_meta` (new spec) / `clientInfo` (older) → stamp `actor` in the activity log (Phase 6) and default `take\_ticket` assignee. Still no presence registry — files remain truth. \*\*(S)\*\*

\- \*\*Cacheable list results:\*\* `ttlMs`/`cacheScope` on `tools/list` (static list). \*\*(S)\*\*

\- \*\*MRTR elicitation\*\* (`input\_required` round-trips) to confirm `delete\_item` and `remove\_column … migrate\_to` when the host supports it; plain errors otherwise. \*\*(M)\*\*

\- \*\*Resources + `subscriptions/listen`:\*\* expose board + tickets as MCP resources with opt-in change subscriptions — gives agents the change notifications only the GUI has today. \*\*(M)\*\*

\- \*\*Prompts:\*\* register `standup` and `take-ticket` as MCP prompts (host slash-command affordance). \*\*(S)\*\*

\- \*\*MCP Apps:\*\* exploratory only (server-rendered board summary in hosts like VS Code) — not committed this roadmap.

\- \*\*Connect scope fix\*\* — `apps/gui/src/main/connect.ts` registers per-project (project `.mcp.json` / per-project server names) instead of one user-scope `--root` entry that a second project overwrites. \*\*(S/M)\*\*



\## Phase 4 — GUI trust (`apps/gui/src/renderer`)



1\. \*\*Diff-based saves\*\* (keystone) — `Editor.tsx` keeps a `baseline` ref; save sends only changed fields (store's read-merge-write then preserves concurrent agent edits to untouched fields). \*\*(M)\*\*

2\. \*\*Live re-sync + conflict banner\*\* — on watcher refresh, adopt incoming values for untouched fields; dirty conflicts show "Changed on disk — Keep mine / Take theirs"; save-time stale check via `getItem` compare. \*\*(M)\*\*

3\. \*\*Unsaved-changes guard\*\* — single `trySelect(id)` gate in `App.tsx` for card clicks/close/navigate/tab switch; `onbeforeunload` while dirty. \*\*(M)\*\*

4\. \*\*Settings validation + error surfacing\*\* — validate draft (≥1 stage, non-blank names, unique prefixes) before IPC; drop the optimistic `setBoard`; inline errors; confirm on dirty backdrop-dismiss. \*\*(M)\*\*

5\. \*\*External links\*\* — `will-navigate` + `setWindowOpenHandler` → `shell.openExternal` in `main/index.ts`; disable raw-HTML passthrough in `lib/markdown.ts`. \*\*(S)\*\*

6\. \*\*Empty/loading/error states\*\* — try/catch around `openProject`/`pickAndOpen` feeding Welcome's error slot; board empty state ("add a card, or connect an agent"); filtered-empty vs truly-empty; opening indicator. \*\*(S)\*\*

7\. \*\*QuickAdd: blur never creates\*\* (Enter commits; text preserved if non-empty); per-area "+" passes `area`. \*\*(S)\*\*

8\. \*\*Full-height drop zones\*\* — `.board { grid-template-rows: auto 1fr; min-height: 100% }`. \*\*(S)\*\*



\## Phase 5 — Real Windows app (`apps/gui/src/main`, packaging)



1\. \*\*App icon + AUMID\*\* — multi-size `apps/gui/build/icon.ico` (placeholder generated; `buildResources` already points there); `app.setAppUserModelId("com.kanmer.app")` = `appId` (required for toasts + taskbar grouping). \*\*(S)\*\*

2\. \*\*Native toasts for agent changes\*\* — on by default, unfocused only; own-write suppression via markers in IPC handlers; batch >3 events/5s; click → focus + reveal item; Settings toggle. \*\*(M)\*\*

3\. \*\*Single-instance lock\*\*; second launch focuses the window. \*\*(S)\*\*

4\. \*\*Window state persistence\*\* — bounds/maximized in `settings.ts`, display-validated on restore. \*\*(S)\*\*

5\. \*\*Real app menu\*\* — File (Open Project Ctrl+O, Recent, Exit), View (zoom; Reload/DevTools only unpackaged), Help (repo). \*\*(S)\*\*

6\. \*\*Keyboard shortcuts\*\* — Esc closes modal/editor (through the dirty guard), Ctrl+S save, Ctrl+N new ticket, Ctrl+F search, Ctrl+1/2 views, Ctrl+, settings. \*\*(M)\*\*

7\. \*\*Focus + ARIA basics\*\* — modal `role="dialog"` + focus trap + restore; cards `tabIndex`/Enter activation + `:focus-visible`; Ctrl+←/→ moves focused card between stages with an `aria-live` announcement; labels on icon-only buttons; area names in card labels (not color-only). \*\*(M)\*\*

8\. \*\*Theme: add "system"\*\* (`nativeTheme`), fix dark-flash by resolving theme before `new BrowserWindow`. \*\*(M)\*\*

9\. \*\*Context menus\*\* — native `Menu.popup` from main: Open, Move to ▸, Take/Release, Archive, Copy ID / `\[\[link]]`, Delete; action dispatched back through App handlers. \*\*(M)\*\*

10\. \*\*Delete = Archive\*\* — GUI Delete archives; new archived-items view (filter toggle exists) with Restore + permanent Delete. \*\*(S/M)\*\*



\## Phase 6 — Data-model extras (`packages/core` + MCP + GUI badges)



\- \*\*Activity log\*\* — append-only `.kanmer/data/activity.jsonl` (`{ts, id, op, field, from, to, actor}`) written by the store on every mutation (plain `fs.appendFile`); documented as derived convenience, safe to delete. New `get\_activity` tool (`id?`, `since?`, `limit?`). Makes "moved to review yesterday" a fact. \*\*(L)\*\*

\- \*\*Blocks/blocked-by\*\* — optional `blocks: \[API-002]` frontmatter; blocked-by derived as backlinks (consistent with existing derived-backlinks stance). `link\_items` gains `rel: relates|blocks`; summaries gain derived `blocked`; card badge. \*\*(M/L)\*\*

\- \*\*Due dates\*\* — optional date-only `due:`; `list\_items` `due\_before`/`overdue`; overdue card badge. \*\*(S/M)\*\*

\- \*\*Manual ordering\*\* — optional fractional `order:`; sort `(order ?? ∞, id)`; `move\_item` gains `position: top|bottom|{after}`; GUI drag writes it. \*\*(M core, L with GUI)\*\*



\## Phase 7 — GUI evolution \& delight (`apps/gui`)



\- \*\*Ticket doc tabs in Editor\*\* — Ticket | Research | Impact | Plan | Checklist | Proof; missing docs creatable in place; checklist renders as interactive checkboxes writing back via `setDoc`. \*\*(L)\*\*

\- \*\*Card upgrades\*\* — taken badge (branch), checklist progress (3/7), doc-presence dots, blocked/overdue badges. \*\*(M)\*\*

\- \*\*Standup view\*\* — derived from items + activity log; Copy-as-Markdown. \*\*(M)\*\*

\- \*\*Activity feed\*\* — topbar bell + slide-over from the scoped-refresh diff; in-app toasts complement Phase 5 unfocused toasts. \*\*(M)\*\*

\- \*\*Performance\*\* — scoped refresh (ChangePayload already carries the path: patch one item instead of re-reading every body), `React.memo(Card)`, `useCallback`. \*\*(M)\*\*

\- \*\*Optimistic drag\*\* (watcher reconciles), \*\*resizable editor + sticky Save\*\*, \*\*chip-based label/link editors\*\*, \*\*command palette (Ctrl+K)\*\*. \*\*(S–M each)\*\*



\## Phase 8 — Skills, plugin, docs (`plugins/kanmer`, docs)



\- \*\*`kanmer-workflow` rewrite\*\* — ticket-centric lifecycle: `get\_status` first → take ticket (branch/worktree) → research.md + impact.md → plan.md → checklist.md → work through checklist → proof.md → done. Templates for all five docs in `assets/`. \*\*(M)\*\*

\- \*\*`kanmer-onboard` → `kanmer-setup`\*\* with three modes: \*\*greenfield\*\* (new repo: propose areas incl. PR Review, seed board), \*\*brownfield\*\* (existing repo, no kanmer: mine TODOs/structure, bulk-create), \*\*upgrade\*\* (kanmer present but old format/version: run migration, report). Reads `version.json`. \*\*(M)\*\*

\- \*\*`kanmer-standup` rewrite\*\* on `get\_activity` + `updated\_since` — facts, not staleness heuristics. \*\*(S)\*\*

\- \*\*Every tool change\*\*: row in `skills/kanmer-workflow/references/tool-reference.md` (name-gated by `scripts/check-plugin-sync.mjs`), then `npm run build \&\& npm run plugin:build` to refresh the committed `plugins/kanmer/mcp/kanmer-mcp.cjs` (core compiles into it — even core-only fixes need a rebuild), then `npm run plugin:check`.

\- \*\*Docs:\*\* AGENTS.md (§4 data model v2, §11 limitations shrink), README (v2 layout, fix hardcoded `C:/Users/Alex` path at README.md:141), the stale `phases` mention at AGENTS.md:137.



\## Sequencing



Phase 1 → 2 → 3 is the core track; Phase 4 → 5 (GUI) can run in parallel with 2–3; Phase 6 after 2; Phase 7 after 3 + 6; Phase 8 tracks every tool change and finalizes last. Within Phase 4, diff-saves (4.1) precede the guard (4.3); within Phase 5, icon/AUMID (5.1) precedes toasts (5.2).



\## Verification



\- \*\*Core:\*\* vitest in `packages/core` — validation errors list valid ids; traversal ids rejected; no-op update leaves `updated`/mtime unchanged; exclusive-create under concurrent `createItem`; \*\*migration round-trip\*\* (v1 fixture → migrate → v2 asserted, content byte-preserved, report correct, idempotent re-run is a no-op); doc API; proof gate; taken semantics.

\- \*\*Server:\*\* extend `packages/mcp-server/src/smoke.mjs` for every new tool + annotation; run against both the dev build and the plugin bundle (`KANMER\_SERVER`).

\- \*\*Plugin:\*\* `npm run plugin:check` (tool-name sync) after every tool change.

\- \*\*GUI:\*\* `KANMER\_SMOKE=1` launch check; manual pass per AGENTS.md §10 — open v1 board → migration prompt → migrate → board renders; edit a ticket while an agent moves it (no clobber); toast on unfocused agent change; keyboard-only session (Tab/Enter/Ctrl+arrows); installer build `npm run dist` shows the icon and groups on the taskbar.

\- \*\*End-to-end:\*\* register the plugin in Claude Code against a scratch repo; run `kanmer-setup` greenfield, take a ticket through research → proof → done; confirm the GUI mirrors every step live.



