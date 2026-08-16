---
status: approved
covers: shipped watcher/toast behaviour (backfill)
---

# FRD-018 — Live sync & notifications

The two surfaces never talk to each other; the disk is the conversation.

- R1. A chokidar watcher (per-file debounced) watches `.kanmer/`; the GUI live-reloads on external change with **scoped patches** (only the changed item/board refreshes; the format marker is watched so an external migration clears banners by itself).
- R2. **Own-write suppression**: the GUI's own writes don't echo as external changes or toasts.
- R3. **Toasts**: when the window is unfocused and an agent changes the board — batched (short window), click focuses the item, per-tab unread counts, settings toggle, Windows-native with correct AppUserModelId.
- R4. Agent changes while focused surface as in-app toasts, not OS notifications.

**Acceptance (as-built):** agent `create_item` with the window unfocused → one batched toast; clicking lands on the card; the same with focus → in-app toast only; GUI edits produce zero self-toasts.

Related: FRD-019 · FRD-017 · kanmer-upgrades Phase 5.

## Verified against code — Phase 0.2

- R1 — `watchKanmer` `core/watch.ts:15-59`: chokidar over `.kanmer`, atomic-write temps ignored
  `:26`, `awaitWriteFinish` `:27`, 120 ms debounce coalescing **per file** `:31-47`. One watcher per
  open project `apps/gui/src/main/index.ts:423`. Scoped patching, not a refetch, in
  `onDiskChange` `App.tsx:305-349`: board change refetches only the board, `version.json` triggers
  a full `refresh()` `App.tsx:321` — this is what clears the migration banner by itself — and
  anything else patches the single item.
- R2 — `markOwnWrite` on every write handler `main/index.ts:339-341`, suppressed within 2000 ms
  `main/index.ts:422-423`.
- R3 — batched with an 1800 ms window `main/index.ts:351-355`; >3 changes collapse to a summary
  `:365-369`; click focuses and sends `CH.reveal` `:394-400`; per-tab unread `App.tsx:361-365`;
  settings toggle honoured `main/index.ts:427`; `app.setAppUserModelId("com.kanmer.app")`
  `main/index.ts:753` — required for Windows toasts to appear at all.
- R4 — OS toast suppressed when focused `main/index.ts:428`; the in-app path is `App.tsx:358-377`.
- Path classification is layout-agnostic (`classifyKanmerPath`, `shared/kanmerPath.ts:4-20`),
  handling both v1 and v2 shapes.

**Defect found and fixed during this pass.** R1 was true of the watcher but false of the GUI: the
store was built on `boardRoot` (`.worktrees/kanmer`) while the watcher was started on the *source*
root, whose `.kanmer/` `ensureBoardWorktree` has already `git rm`'d and gitignored
(`kanmerGit.ts:75,79`). On any git-backed project the watcher was pointed at a directory that does
not exist, so no external change ever reached the renderer and this FRD's entire acceptance list
was unreachable. Fixed in the Phase −1 pre-work (`main/index.ts:423`, now `watchKanmer(boardRoot,
…)`); measured before and after against this repo's own board — old root 0 events, new root 2.
