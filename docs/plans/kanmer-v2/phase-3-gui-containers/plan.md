# Phase 3 — GUI: ticket popout, document full-container, add-ticket dialog

**Goal:** replace the docked side-panel editor with a **popout modal** that closes on outside-click, render documents in a **full-container** view, and replace the title-only quick-add with a **full create-ticket dialog**. Everything routes through the existing unsaved-edit guard so nothing is lost silently. Built single-project against a `ProjectClient` facade (Phase 5) so the multi-project wrap later is churn-free.

**Depends on:** Phase 1 (`board.docs`, `refs`, remove `due`). **Feeds:** Phase 4 (shares modal-size CSS), Phase 5 (wraps these in tabs). **Scope:** `@kanmer/gui` renderer + a little main IPC.

## Design decision
"Popout container that closes when you click behind it" = a **modal overlay**, not an OS window (clicking the main window must close it). Reuse the existing `.modal-backdrop`/`.modal` pattern (`styles.css:661-680`) and the outside-click-closes idiom from Settings (`Settings.tsx:101-110`).

## Items

### 3.1 Ticket popout — M (request #1)
- **Where:** `Editor.tsx:353-364` (the `<aside className="editor">` docked/resizable panel → modal), `App.tsx:574-593` (render slot), `styles.css`.
- Wrap the editor body in `.modal-backdrop` + a new `.modal.editor-pop` (≈760px, `max-height:88vh`); drop the width-drag state + `.editor-resize` (`Editor.tsx:355-363`); add a focus-trap (copy `Settings.tsx:69-99`). Backdrop `onClick` and Escape (`App.tsx:345-350`) both route through **`trySelect(null)`** so the dirty-guard (`App.tsx:94-102`, discard modal 625-646) still fires; inner click `stopPropagation`. The editor body (`.field`, `.field-row`, `.doc-tabs`, `.editor-foot`) is reused verbatim inside the modal.

### 3.2 Document full-container — M (request #1)
- **Where:** `Editor.tsx:380-404,430-439` (doc tabs), `Editor.tsx:633-791` (`DocEditor`, already self-contained), new `.modal.doc-full` (≈96vw × 92vh).
- When a doc tab (or a repo-doc link) is opened, mount `DocEditor` in the full-container modal instead of the narrow panel — `DocEditor` already defaults to rendered markdown (edit behind a button) and has the interactive checklist view (`Editor.tsx:742-767`), so the full container inherits both for free. Add a **repo `/docs/` links section** to the ticket form driven by `refs`, opening either the OS default app (`openRepoDoc` → `shell.openPath`) or the in-app full view (`getRepoDoc` → read file). Doc-type tabs come from `resolveDocTypes(board, item.area)` (Phase 1) instead of the hard-coded `DOC_TABS` (`Editor.tsx:57-63`).

### 3.3 Full add-ticket dialog — M (request #15)
- **Where:** new `TicketCreate.tsx`, `Board.tsx:113-146` (quick-add wiring), `App.tsx:49,250-263,363-366,401-407`.
- New modal (reuse `.modal`) with fields → `CreateItemInput` (`types.ts:146-158`): title (autofocus), status (default `statuses[0]`), area, priority, assignee, labels + links via `<ChipInput>` (`ChipInput.tsx:16-22`, as `Editor.tsx:505-524`), body, and a **Governing docs** row: a repo-doc picker (browse `docs/**` filtered through `board.docs.repoDocs` globs → `refs`) plus a *"New PRD/FRD/ADR needed"* checkbox → `docs_todo` — without one of these, the standard-on Backlog gate (§1.2) would strand every GUI-created ticket. On submit call `createItem(input, {select:true})` — the already-present-but-unused `{select:true}` at `App.tsx:250-263` — so the new ticket opens in the popout. Ctrl+N / palette "New ticket" open this dialog; the per-column inline `QuickAdd` stays as the fast path (quick-added tickets default to `docs_todo: true` so they aren't gate-stranded). **No `due`** (removed); `blocks` deferred (no Editor surface yet).

### 3.4 Traceability + removals on the ticket surface — S (request #16, #6)
- **Where:** `Editor.tsx:36,74,487-494` (remove the `due` date input + `Snapshot.due`), `Standup.tsx:171-174` (remove the "Overdue" section).
- Show **commits / PRs** (read-only; skill-populated) and **deployment** (editable — a dropdown of `n/a | not-deployed | <env-id>`) on the ticket popout, plus small deployment/PR badges on the card (`Board.tsx`); the deployment row is hidden entirely when the board has no `deployment` config. Also add the long-promised **`blocked` badge** (audit A2 — pledged by kanmer-upgrades Phase 7, only `taken` shipped; the derived blocked-by data is already wired).

### 3.5 New IPC — S
- `openRepoDoc(projectId, relPath)` (`shell.openPath(join(root, rel))`), `getRepoDoc(projectId, relPath)` (read for the in-app view), `getGateStatus(projectId, id)` (backs a "Gates" affordance + card badge; core owns the eval). Pattern: `shared/ipc.ts` channel + `main/index.ts` handler + `preload/index.ts` wrapper. (These carry `projectId` in anticipation of Phase 5; single-project until then.)

### 3.6 Gate-blocked move UX — M
- **Where:** `App.tsx:267-280` (the optimistic-move catch), `App.tsx:504` (error banner), `Board.tsx:92-102` (drop targets), a small message-mapping helper.
- Today a drag onto a gated column snaps back and dumps the raw core error — which tells a human to call `set_ticket_doc`, an MCP tool they can't invoke — into a persistent top-of-app banner cleared only by the next successful mutation. With v2 multiplying one gate into ~5 per area this becomes the everyday experience, so: (a) map gate errors to **human-readable copy** ("Can't move to Review — the Post-implementation report is missing"); (b) surface them as an **anchored toast/dialog at the drop point** with an *"Open <missing doc>"* action that jumps straight into the full-container doc editor (3.2); (c) during a drag, use `getGateStatus` to **mark gated columns** (subtle lock tint + tooltip naming the missing docs) so most failed drops never happen.

### 3.7 Project-switch dirty-guard fix — S (audit A1)
- **Where:** `App.tsx:75-91` (`openProject` calls `setSelectedId(null)` directly at `:83`, bypassing `trySelect`).
- Route project switching through the same dirty-guard/discard-modal path as selection changes, so Ctrl+O / Open Recent / the header project button can no longer silently discard an unsaved edit. This is a **live single-project data-loss bug today** — fixed here rather than waiting for Phase 5's tab guard (which then generalizes it).

## Release rail
GUI-only; no tool-reference change. Consumes Phase 1 `board.docs`/`refs`/`deployment` (type-only imports from `@kanmer/core`).

## Verification
- `npm run typecheck -w @kanmer/gui`; `npm run build -w @kanmer/gui`.
- Boot smoke `KANMER_SMOKE=1 KANMER_OPEN=<sandbox> npx electron .` exits 0.
- Manual: card click → popout opens; backdrop/Escape → close; with unsaved edits → discard modal; doc tab → full-container; repo-doc link opens; Ctrl+N/palette/"+ New" → full dialog (governing-docs picker / `docs_todo` present), submit opens the ticket; no `due` field; no Standup "Overdue"; commits/PRs read-only, deployment editable (hidden when board has no `deployment`); `blocked` badge renders; a drag onto a gated column shows the lock tint + tooltip, and a forced drop yields the anchored human-readable message with a working "Open <doc>" action; switching projects mid-edit prompts instead of discarding.
