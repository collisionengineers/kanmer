# Settings Backfill then Save silently overwrites the newly-added stages

- **Severity:** normal
- **PR:** #13 (finish-deferrals — backfill prompt landed in `9f7978a`)
- **File:** `apps/gui/src/renderer/src/components/Settings.tsx:710-730`
- **Source bug ids:** bug_018

## Follow-up verdict — validated

`Settings` initializes `draft` once. The nested Documents tab invokes
`backfillBoard(false)`, which writes through core and the watcher refreshes only
the parent `board` prop. The stale local draft is not replaced. Because Save is a
whole-board `setBoard`, its old status array can remove the newly inserted,
currently unused stages; the stranded-column guard does not apply. The changed
prop also makes `modified` true before a user edits the draft.

## Summary

In Settings.tsx, `draft` is initialised once from the `board` prop via `useState(() => structuredClone(board))` and never re-syncs, but the new "Backfill missing stages" button calls `client.backfillBoard(false)` — a separate IPC path that writes new stages straight to disk. If the user backfills, then makes any other Settings edit (recolour a column, tweak a doc type, toggle deployment) and clicks Save, the whole-board write replays the pre-backfill `draft.statuses` and silently undoes every stage the backfill just added.

## Detail

`draft` at Settings.tsx:56 is initialised lazily from the `board` prop:

```tsx
const [draft, setDraft] = useState<BoardConfig>(() => structuredClone(board));
```

The `useState` initializer runs exactly once for the modal's lifetime — `draft` never re-syncs when the `board` prop later changes. `save()` at :82 sends the entire `draft` back through `onSaveBoard(draft)` → `clientRef.current!.setBoard(draft)` in App.tsx, which is a whole-board write.

**The specific path that triggers it.** The *Upgrade board* section at Settings.tsx:710-731 renders a Backfill button whose handler calls `client.backfillBoard(false)` (Settings.tsx:721) → main handler (`CH.backfillBoard`) → core `migrateBoard` → `backfillStages` which mutates `board.statuses` and calls `store.setBoard` directly. That disk write fires the file watcher, App.tsx's `onDiskChange` re-reads and calls `setBoard(await client.getBoard())` (updating the prop passed to Settings), and Settings re-renders — but its `draft` state still holds the pre-backfill `statuses`. The hint text at :715-716 (*"Applies to the saved board immediately; reopen Settings to see the result"*) acknowledges the mismatch but does not prevent it.

**Why the existing guards don't catch it.** `assertNoStrandedColumns` (store.ts:210) only rejects a `setBoard` that removes a column *still referenced by an item*. Backfill is additive, so the just-added canonical stages have no items on them yet — removing them from the draft strands nothing and the guard passes. `validateDraft` (Settings.tsx:875) is likewise satisfied: the pre-backfill statuses were valid to begin with.

### Step-by-step proof

1. Open a project whose board is missing canonical stages (e.g. a `[todo, done]` board) — precisely the condition that renders the Backfill button (`missingStages.length > 0`).
2. Open Settings → *Documents* tab. `draft.statuses` is initialised to `[todo, done]`.
3. Click **Backfill missing stages** → `client.backfillBoard(false)` writes `[todo, researching, planning, implementing, review, verifying, done]` to `board.yml`. The hint updates to `"Added: researching, planning, ..."`; App refreshes the `board` prop but Settings's `draft.statuses` remains `[todo, done]`.
4. Change one unrelated field — say, add `staging` to the deployment environments list.
5. Click **Save**. `save()` calls `onSaveBoard(draft)`; `setBoard` writes `draft` (still `statuses: [todo, done]`) back to disk.
6. Reopen Settings — the five backfilled stages are gone. On-disk `board.yml` reads `statuses: [todo, done]`. The whole *Upgrade board* card reappears offering to backfill again.

### Impact

Silent data loss on the natural *backfill then tweak then save* workflow — a workflow the Settings modal presents together (the Backfill button sits alongside the Deployment/Documents/Appearance editors it's designed to enable). Secondary smell of the same drift: `modified` at :65-68 compares `draft` vs `board`, so it flips to `true` immediately after backfill without any user edit, triggering the confirmDiscard modal on close for no visible reason.

## Fix

Any of (in order of minimalness):

- **(a)** After a successful backfill, refresh the draft: `setDraft(structuredClone(await client.getBoard()))` inside the button handler.
- **(b)** Close Settings after backfill applies (already the ethos of the hint text) and let the user reopen.
- **(c)** Detect drift at save time by capturing the initial `board` and comparing it to the current `board` prop; refuse Save (with a *Reload Settings* action) when they differ.

## Resolution plan

1. Move backfill coordination to the top-level `Settings` component, which owns
   both the saved-board prop and local draft. Pass a callback into `DocumentsTab`
   rather than allowing that child to mutate disk behind the draft owner.
2. After a successful non-dry-run backfill, call `client.getBoard()`, replace
   `draft` with a structured clone of the returned board, and retain the result
   message. The parent App watcher may update the prop independently; both values
   then converge and `modified` becomes false.
3. Disable Save and repeated backfill while refresh is in flight. If readback
   fails after the write, show a blocking reload error and do not allow the stale
   draft to be saved.
4. Preserve edits deliberately made *before* Backfill by either disabling the
   action while `modified` is true or asking the user to Save/discard first; do
   not silently merge two whole-board snapshots.
5. Extract reconciliation/modified comparison into a pure helper test. Cover
   backfill→unrelated edit→Save, failed readback, already-current response and a
   pre-existing dirty draft.

```diff
 const r = await client.backfillBoard(false);
+const refreshed = await client.getBoard();
+setDraft(structuredClone(refreshed));
 setBackfillMsg(...);
```

Acceptance: every inserted stage remains after a later Settings save, and closing
immediately after backfill produces no false discard prompt.
