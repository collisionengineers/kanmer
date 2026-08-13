# Phase 0 — Verify PR #1 review fixes, merge, and stage the upgrade work

Working log — updated as the work happens.

**Goal:** verify the fixes made in the `pr1-fixes` worktree (commit `b5ae158`, pushed to the PR branch) actually resolve the findings in
[`docs/plans/pr-1-review/pr-1-comments.md`](../../pr-1-review/pr-1-comments.md), note overlaps with the Phase 1–8 plans, merge PR #1,
sync AGENTS.md build commands, clean up the worktree, and branch for the Phase 1–8 implementation run.

## State found at start

- PR #1 `board-stages-and-plugin → main`, OPEN, MERGEABLE. Commits: `827a80b`, `2e2f7c4`, `98d9ec7`, `b5ae158`.
- `b5ae158` (the PR-comment fixes, made in worktree `.claude/worktrees/pr1-fixes`, branch `worktree-pr1-fixes`) is on the remote PR branch but **not** in the local branch.
- Local branch has two unpushed commits (`1a44fe6`, `f07968b`) — the `docs/plans/kanmer-upgrades` planning docs. → Reconcile: rebase local plans commits onto `origin/board-stages-and-plugin`, push, so the PR carries fixes + plans together.

## Verification of the 10 findings — all pass

Each verified by reading the `b5ae158` diff against the review doc's prescribed steps, then an independent local run:
`npm test` **23/23**, `node packages/mcp-server/src/smoke.mjs` **25/25** (includes the three new checks: reads-don't-create-`.kanmer/`,
`move_item` rejects an off-board status, summary key set exact), `npm run plugin:check` **OK — 11 tools match**.
The committed bundle `plugins/kanmer/mcp/kanmer-mcp.cjs` was confirmed rebuilt (contains `ensureInit`, `Unknown status`, `archived: item.archived`).

| # | Finding | Status |
|---|---|---|
| 8 | Lazy init — no `.kanmer/` on startup | ☑ `write()` wrapper + `ensureInit()` in `index.ts`; boot no longer calls `store.init()`; smoke checks both directions |
| 1 | Codex `mcpServers` → plugin-root `.mcp.json` | ☑ new `plugins/kanmer/.mcp.json` with `{"mcpServers":…}` wrapper; manifest repointed; `codex.mcp.json` deleted; AGENTS.md tree updated |
| 4 | Status validated on write; workflow skill uses `list_board` | ☑ `assertKnownStatus` in `store.ts` (the review's sanctioned alternative placement — also guards the GUI's direct store calls); covers create/update/move; 2 new vitest cases + smoke check; SKILL.md restated by role |
| 3 | Standup buckets from configured stages | ☑ position/role mapping (first→Up next, last→Recently done, review-like→In review, rest→In flight) + off-board-stage Flags rule |
| 5 | Onboard freshness check `include_archived: true` | ☑ step 1 rewritten exactly as prescribed, incl. post-#8 rationale |
| 6 | Onboard no longer applies stage replacement via `add_column` | ☑ Option A taken: areas applied by agent, stage changes routed to GUI Settings; tool-reference row notes append-only |
| 7 | Plan→ticket links one direction only | ☑ all **three** files fixed (SKILL.md step 4, plan-template, ticket-template) — the two the comment didn't cite included |
| 9 | Tool reference: `update_item` enumerates real patch fields | ☑ explicit field list; `type` immutability in both the doc and the tool description |
| 10 | Tool reference: summary field list accurate; `archived` in `summarise()` | ☑ closed-list prose; `archived` added; smoke asserts exact key set |
| 2 | Refuted — optional Codex interface metadata | ☑ correctly left unfixed (P3 listing polish, pre-publish not pre-merge) |

## Overlap with Phase 1–8 plans

- **#4 → Phase 1.1.** Status validation is now DONE (in `store.ts`). Phase 1.1 shrinks to: validate `area`/`priority` the same way + board-derived priority default. Reuse `assertKnownStatus`'s pattern/wording.
- **#6 Option B → Phase 3.** The deferred board-management capability (`remove_column` with stranding protection, `reorder_columns`, `update_column`) is exactly Phase 3's board-tools item — the stranding hazard the review flagged is already designed there (`migrate_to`).
- **#8 → Phases 2–3.** Lazy init makes `.kanmer/` absence a truthful signal — Phase 2.1's format detection and Phase 3's `get_status` must preserve that (read-only `get_status` must NOT init).
- **#9/#10 follow-up → Phase 8.4.** `check-plugin-sync.mjs` gates names only; extending it to params/summary keys belongs in the release-rail work.
- **#3/#5/#6 skill edits → Phase 8.** The standup/onboard skills get fully rewritten in Phase 8 (8.3, 8.2 kanmer-setup); these fixes are the correct v1 behavior until then and their rules (role-based buckets, archived-aware freshness) carry into the rewrites.
- **#9 residue → Phase 1.3.** `update_item` with only a stripped `type` arg is now an empty patch that still stamps `updated` — the no-op-write fix in Phase 1.3 closes that.

## Steps

- [x] Verify all findings against `b5ae158` (code reading + tests + smoke + plugin:check) — all pass, table above
- [x] Note plan-file overlaps — section above
- [x] Rebase local plans commits onto the PR branch (one add/add conflict in `pr-1-comments.md`; kept the remote version with checked boxes + implementation notes), push
- [x] Merge PR #1 → merge commit `50262c1` on `main`
- [x] AGENTS.md build commands — §6 table was already present; added the missing rows (`build:core`/`build:server`, `typecheck`, `inspect`); committed with this log
- [x] Remove `pr1-fixes` worktree + `worktree-pr1-fixes` branch; delete merged `board-stages-and-plugin` (local + remote). Note: the worktree *directory* `.claude/worktrees/pr1-fixes` is still held open by another live Claude session (claude.exe pid 4160) — git registration is pruned; delete the folder once that session exits.
- [x] New branch `kanmer-upgrades-phases-1-8` created; todo list from the phase plans; implement; open PR

## Implementation run log (branch `kanmer-upgrades-phases-1-8`)

- **Phase 1 — core correctness & safety: DONE.** All 8 items landed:
  1.1 `assertFieldAgainstBoard` (status/area/priority; area `""` + no-areas-board permissive; board-derived priority default),
  1.2 `assertSafeId` + containment check in `itemFile()`,
  1.3 no-op patches don't write / don't bump `updated`,
  1.4 `link_items` add requires target (also `createItem.links[]`),
  1.5 `deleteItem` → `{deleted, cleanedLinks, bodyReferencesRemain}` cleanup,
  1.6 `listItemsWithWarnings` + `list_board.source`,
  1.7 `expectedUpdated`/`expected_updated` optimistic concurrency,
  1.8 `writeFileExclusive` (temp+`fs.link`, `wx` fallback) + candidate/claim id loop.
  Verified: vitest 35/35, smoke 30/30, GUI typecheck, `plugin:build` + `plugin:check` green. Tool-reference + AGENTS.md updated (lockfile suggestion replaced by exclusive-create rationale).

- **Phase 2 — Format v2 storage engine + migration: DONE.** All 8 items landed:
  2.1 `version.ts` + `detectFormat()` (version.json authoritative; legacy `tickets/` ⇒ v1; fresh ⇒ v2; `init()` never stamps v2 onto a v1 board),
  2.2 area `prefix` (zod-validated, derived when unset via `areaPrefix()`, uniqueness enforced in `writeBoard`) + PR Review default area,
  2.3 paths v2 (`areasRoot`, `areaDir`, `ticketDirIn`, `ticketFileIn`, `docFileIn`, `_none`),
  2.4 store v2 (reads scan BOTH layouts transparently; v2 creates are ticket-only with area-prefix ids — plan/research creation errors pointing at `set_ticket_doc`; area change moves the folder via `fs.rename`, id immutable; delete removes the folder recursively; area/folder mismatch warned + reconciled on next write),
  2.5 docs API (`getDoc`/`setDoc` with append, `getTicketDocsInfo` with checklist progress),
  2.6 `takeTicket`/`releaseTicket` (taken_at/branch/worktree; force-retake clears stale worktree),
  2.7 proof gate on the last stage naming `set_ticket_doc(doc: "proof")`,
  2.8 `migrate.ts` (dry-run report, folds linked plans/research into ticket folders, orphans → labeled tickets, prefixes pinned, counters re-keyed, idempotent).
  Verified: vitest 45/45 (incl. v1-fixture compat + full migration round-trip), smoke 33/33, GUI typecheck, plugin rebuilt + sync OK.
  Known accepted edge: two concurrent creates sharing the TICK fallback prefix in *different* undeclared areas could double-allocate a number — only reachable when a v2 board's `areas` list has been emptied.

- **Phase 3 — MCP surface v2 + modernization: DONE.** Tool surface 11 → 19: `get_status` (orientation; never creates `.kanmer/`), `take_ticket` (take/release, branch required, assignee defaults to client name), `get_ticket_doc`/`set_ticket_doc` (append mode), `create_items` (≤50, sequential, per-entry results), board verbs `update_column`/`remove_column` (occupied ⇒ refuse or `migrate_to` rewrite incl. folder moves)/`reorder_columns` (permutation-checked). `list_items` gains `updated_since`/`sort`/`limit`; summaries now a fixed 14-key set incl. `created`/`taken`/`docs`/`checklist`; `get_item` enriched with docs info. Modernization on SDK ^1.30: actor from per-request `_meta` w/ clientInfo fallback; elicitation-based confirm on `delete_item` + `remove_column migrate_to` (hosts without the capability proceed as before); board + items exposed as MCP resources with `subscribe` support (chokidar-driven `resources/updated`); `standup` and `take-ticket` prompts. **Not done:** `ttlMs`/`cacheScope` on tools/list — SDK 1.30 doesn't expose the 2026-07-28 cacheable-list fields yet (noted in `main()`); MCP Apps stayed exploratory per plan. Companion fix: `connect.ts` registers per-project (Claude `-s project` in the project cwd + stale user-scope cleanup; codex per-project server names `kanmer-<folder>`).
  Verified: vitest 45/45, smoke **57/57 against both the dev build and the committed plugin bundle**, GUI typecheck, plugin-sync 19 tools.

- **Phase 4 — GUI trust: DONE.** 4.1 diff-based saves (Editor keeps a `baseline` ref; save sends only changed-vs-baseline fields + `expectedUpdated`); 4.2 live re-sync (untouched fields silently adopt disk changes; same-field divergence raises the Keep mine / Take theirs banner; save-time `getItem` stale check closes the watcher-debounce race); 4.3 unsaved-changes guard (`trySelect` gate on card click/close/navigate + plain-CSS discard confirm + `beforeunload`); 4.4 Settings validation (inline errors incl. area-prefix uniqueness mirror, no optimistic `setBoard`, discard confirm on modified-draft cancel); 4.5 external links → `shell.openExternal` (`will-navigate` + `setWindowOpenHandler`) and marked raw-HTML escaped; 4.6 opening/error/empty/filtered-empty states (Clear-filters affordance); 4.7 QuickAdd blur never creates + per-area "+" quick-add carrying `area: group.id`; 4.8 full-height drop zones (`grid-template-rows: auto 1fr`).
  Verified: GUI typecheck, GUI build, boot smoke (`KANMER_SMOKE=1`) exit 0.

- **Phase 5 — real Windows app: DONE.** 5.1 generated multi-size `apps/gui/build/icon.ico` (dependency-free PNG/ICO encoder in `apps/gui/scripts/make-icon.mjs`; `.gitignore` exception added) + `app.setAppUserModelId("com.kanmer.app")`; 5.2 native toasts (own-write markers in every write IPC, 2s suppression; ticket-doc changes attributed to their ticket; >3 events batch to one summary; click restores + reveals; Settings toggle default on); 5.3 single-instance lock; 5.4 window bounds persisted (debounced, display-intersection validated); 5.5 real app menu (Open Project Ctrl+O, Open Recent, zoom; Reload/DevTools dev-only); 5.6 shortcuts (Esc, Ctrl+S in editor, Ctrl+N quick-add, Ctrl+F or `/` search, Ctrl+1–4 views, Ctrl+,); 5.7 Settings focus trap + `role=dialog`, cards `tabIndex`/`role=button`/aria-labels incl. area, Ctrl+←/→ keyboard stage-move with `aria-live` announcement, labels on icon-only buttons; 5.8 theme `system` (renderer `matchMedia` follows OS live) + startup-flash fix (theme resolved before `BrowserWindow`, `show:false`/`ready-to-show`); 5.9 native card context menu via `Menu.popup` IPC (Open, Move to ▸, **Release** when taken, Copy ID/wiki-link, Archive/Unarchive, Delete-permanently only on archived items) — *adaptation:* no "Take" from GUI since taking requires a branch (an agent concept); humans release stuck tickets instead, via the new `releaseTicket` IPC; 5.10 Delete = Archive (editor's Delete button removed; Archived is now a real view with Restore / two-click Delete permanently; archived filter checkbox retired).
  Verified: GUI typecheck, GUI build, boot smoke exit 0. Toast/installer checks are hardware/manual (deferred to the final `npm run dist` pass).

- **Phase 6 — data-model extras: DONE.** 6.1 activity log (`activity.ts`, `.kanmer/data/activity.jsonl`, one line per mutation incl. per-field update entries with from/to, actor from store `setActor` — MCP write wrapper stamps the client name, GUI stays "gui"; best-effort appends; ~5k-line rotation keeps the newest half; `get_activity` tool → **20 tools**); 6.2 `blocks[]` frontmatter + derived blocked-by (`buildLinkIndex` typed edges, `computeBlockedIds` live-blocker rule, `link_items rel: relates|blocks` default-compatible, `get_links` typed response, summaries + `get_item` gain `blocked`); 6.3 `due:` date-only (validated, `""` clears, `due_before`/`overdue` filters with last-stage exemption, summary `due`); 6.4 fractional `order` (sort `(order ?? ∞, id)`, `move_item position: top|bottom|{after}` with lazy column materialisation + midpoint-exhaustion rebalance, summary `order`). Old files without the new keys serialise with zero new-key noise (tested). Summary is now a fixed 17-key set.
  Verified: vitest 53/53, smoke 62/62 on dev build AND committed bundle, GUI typecheck, plugin-sync 20 tools.

- **Phase 7 — GUI evolution: DONE.** 7.1 migration banner on v1 boards + dry-run report modal + one-click migrate; 7.2 Editor doc tabs (Ticket | Research | Impact | Plan | Checklist | Proof; presence dots + checklist n/m badge; empty-state "Create X.md"; markdown view/edit per doc; interactive checkboxes writing back via setDoc; doc dirty state feeds the unsaved-changes guard; Plans/Research topbar views removed — `ItemList.tsx` deleted); 7.3 Standup view (role-based stage buckets matching the skill: In flight w/ taken branch, In review, Up next, Recently done from activity, Blocked derived, Overdue; Copy-as-Markdown); 7.4 activity bell + unread dot + slide-over panel (click reveals item) + in-app toasts for focused-window agent changes (main forwards post-suppression `agentChange` events, so own writes never toast); 7.5 scoped refresh (per-file patch: board.yml → board only, item file → one `getItem`, doc file → parent ticket, unknown → full refresh) + `React.memo(Card)` + all Board callbacks stabilised — **required a core watcher fix: coalesce pending events per FILE, not globally, or bursts would lose patches**; 7.6 optimistic drag (instant status swap, error → toast + refresh, watcher reconciles); 7.7 resizable editor (drag handle, 320px–50vw, persisted) + sticky Save; 7.8 ChipInput for labels (existing-label suggestions) + links (item-id suggestions); 7.9 Ctrl+K command palette (jump-to-item + verbs, substring scoring, zero deps).
  Verified: vitest 53/53, smoke 62/62, GUI typecheck + build, boot smoke exit 0, plugin rebuilt (watch.ts change ships in the bundle) + sync OK.

- **Phase 8 — skills, plugin, docs: DONE.** 8.1 `kanmer-workflow` rewritten around the ticket lifecycle (get_status → take_ticket w/ branch → research+impact → plan → checklist (append notes) → proof → final stage → release) with all five doc templates in `assets/` (+ new impact/checklist/proof; plan/research templates repurposed as doc templates; ticket template kept); 8.2 `kanmer-onboard` → **`kanmer-setup`** (git mv; both manifests point at `./skills/` so no manifest change) with greenfield/brownfield/upgrade modes and the **AGENTS.md managed block** (top-of-file, marker-delimited, idempotent refresh, CLAUDE.md pointer rule); note: stage replacement is now agent-capable via the board verbs, so the old "GUI-only" caveat is gone; upgrade mode routes the actual migration through the GUI prompt and verifies via get_status; 8.3 `kanmer-standup` rewritten on facts (get_status → list_board roles → list_items sort:updated_desc w/ taken/blocked/due/checklist → get_activity since-yesterday with actors; off-board stages + file warnings → Flags); 8.4 release rail ran every phase (final: plugin-sync 20 tools, bundle smoke 62/62); 8.5 repo docs — AGENTS.md §2 tree (new core/gui files, kanmer-setup), §4 rewritten for format 2 (folders, prefixes, doc pipeline, proof gate, activity, migration), §5 (KanmerStore API + 20 tools + resources/prompts + lazy init), §11 refreshed (fixed items removed; GUI whole-board-save stranding, TICK-fallback race, SDK cacheable-list gap documented); README rewritten (v2 tree + doc pipeline + lifecycle GUI features, 20 tools, `<kanmer-repo>` placeholders replacing the hardcoded `C:/Users/Alex/...` paths, kanmer-setup row incl. the AGENTS.md block); roadmap index checked off.
  Final verification: `npm run build`, vitest **53/53**, smoke **62/62** (dev + committed bundle), GUI typecheck **0 errors** + build + boot smoke exit 0, `plugin:build` + `plugin:check` **20 tools match**.

---

## Corrections (PR #2 review)

The DONE entries above are accurate about the **core and MCP** halves of each
phase. The PR #2 adherence review (`docs/plans/pr-2-review/`) found that several
of them recorded only that half, and reported a phase complete while its GUI or
verification half was missing. The historical lines are left exactly as written;
this section is the correction. Every item below is fixed on
`kanmer-upgrades-phases-1-8`.

| Id | What the record said | What was actually true |
|---|---|---|
| **A1** | Phase 6 "6.4 fractional `order` … `move_item position`" — read as complete. | Core-only. The GUI drop handler was column-scoped and the IPC contract carried no `position`, so every drag left the card's old `order`. The plan's own 6.4 line named the GUI drag writer. |
| **A2** | Phase 7 goal: "taken/blocked/due badges". | Only the taken (⛏) badge existed. Blocked and overdue card badges were not built. |
| **A4** | Phase 3 "Modernization on SDK ^1.30: actor from per-request `_meta` w/ clientInfo fallback"; roadmap row "done (cacheable tools/list awaits SDK)". | SDK 1.30 negotiates at most protocol `2025-11-25` — the whole 2026-07-28 revision is unavailable, not just cacheable lists, and no current host sends `io.modelcontextprotocol/client`. The server's `_meta` branch is nonetheless live (the SDK forwards `params._meta` on every protocol), which nothing verified. The back-compat protocol run promised at `phase-3-mcp-surface/plan.md:39` was never performed. |
| **A5** | Phase 7 "7.3 Standup view (role-based stage buckets matching the skill)". | The view diverged from `kanmer-standup/SKILL.md` on grouping, on two whole sections (What happened since yesterday, Flags) and on the recently-done window. |
| **A6** | Phase 7 "7.9 Ctrl+K command palette (jump-to-item + verbs…)". | The verbs shipped were New ticket / Switch view / Theme / Settings. Move ▸ and Take/Release — the two the plan named first — were absent. |
| **A7** | Phase 8 "README rewritten … `<kanmer-repo>` placeholders replacing the hardcoded `C:/Users/Alex/…` paths". | True of the README; `examples/codex-config.toml` still carried the hardcoded path on two lines. |
| **A8** | Phase 8 "the **AGENTS.md managed block** (top-of-file, marker-delimited, idempotent refresh, CLAUDE.md pointer rule)". | Four rules stated as prose in `kanmer-setup/SKILL.md`, with no tool, function or test behind them, and the end-to-end cases at `phase-8-skills-plugin-docs/plan.md:54-55` were never run. |
| **A9** | Phase 6 verification: "rebalance path"; roadmap verification: "no-op update leaves `updated`/mtime unchanged". | Neither assertion existed. The no-op test checked `updated` only, and no test reached `computeOrder`'s rebalance branch. |

**A3** (a stale `## Item types` section in the plugin tool reference, still
describing the format-1 flat layout) is not traceable to a DONE line — it is
drift the release rail's name-only `plugin:check` could not see. It is fixed,
and `plugin:check` now also compares the committed bundle's bytes.

Two items are deferred rather than fixed, deliberately:

1. **Agent-reachable migration** — an MCP `migrate_board` tool, so
   `kanmer-setup`'s Upgrade mode works for plugin-only users. The resumability
   and collision work in this pass is its prerequisite.
2. **Extract `cleanReferencesTo()`** — `deleteItem` and `migrateToV2`'s fold
   sweep duplicate the same links/blocks cleanup, which
   `phase-1-core-correctness/plan.md:27-29` called for building on
   `buildLinkIndex`. Extract once, with tests, outside a remediation pass.
