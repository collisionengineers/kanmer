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
