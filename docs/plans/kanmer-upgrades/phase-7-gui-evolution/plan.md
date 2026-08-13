# Phase 7 — GUI evolution & delight

**Goal:** surface the v2 model in the GUI (doc tabs, taken/blocked/due badges, migration prompt), add the standup view and activity feed, and fix the performance ceiling. All in `apps/gui`.

> **Amended by the PR #2 review remediation:** A2 — the blocked and due **card badges** named in this goal were not built at the time (only the taken badge was). They now exist as ⛔ / ⏰ chips, passed to the memoized `Card` as booleans.


**Depends on:** Phase 3 (doc/take IPC), Phase 6 (activity, blocks, due, order). Scoped refresh (7.5) before the activity feed (7.4) — its diffing feeds the feed.

## Items

### 7.1 Migration prompt — S
- **Where:** `App.tsx`, `main/index.ts` (new `migrate` IPC exposing `migrate.ts` dry-run + run).
- Opening a v1 board shows a banner/dialog: "This board uses the old layout — Migrate to v2?" with the dry-run report (what moves where, orphan conversions). One click runs it; board reloads. Until migrated, everything keeps working (core reads both formats).

### 7.2 Ticket doc tabs in Editor — L
- **Where:** `components/Editor.tsx` (or a new `TicketEditor.tsx` wrapper).
- Tab strip: **Ticket | Research | Impact | Plan | Checklist | Proof**. Missing docs show an empty-state tab with "Create research.md" writing via `setDoc`. Checklist tab renders `- [ ]` lines as interactive checkboxes writing back through `setDoc`; other docs get the same Edit/Preview markdown treatment as the body. Doc saves are whole-doc (docs are single-writer in practice; the Phase 4 baseline/conflict pattern applies per tab).

> **Amended by the PR #2 review remediation:** the per-tab baseline/conflict pattern was not implemented. Documents have no frontmatter to hold `updated`, so they now use a **content-hash version token** instead: `getDocWithVersion` returns it, `setDoc`'s `expectedVersion` rejects a stale write, and the editor shows a conflict banner with Reload from disk / Overwrite anyway.

- Topbar simplifies: Plans/Research tabs go away (plan/research live inside tickets now); Board remains, Standup joins (7.3), Archived view from Phase 5.10.

### 7.3 Standup view — M
- **Where:** new `components/Standup.tsx`, topbar entry.
- Derived from `items` + `get_activity`: In flight (taken, with branch), In review, Recently done (activity says moved to last stage <48h), Up next (top of first stage by `order`), Blocked (derived from `blocks`), Overdue. Grouped by assignee/actor. **Copy as Markdown** button — same shape the `kanmer-standup` skill emits, so human and agent standups match.

> **Amended by the PR #2 review remediation:** A5 — as built the view diverged from the skill on grouping, two whole sections (What happened since yesterday, Flags) and the recently-done window. Rewritten over pure `buildStandup`/`standupMarkdown` helpers so the eight sections and the copied markdown match the skill.


### 7.4 Activity feed — M
- **Where:** new `components/ActivityPanel.tsx`, `App.tsx`, `styles.css`.
- Topbar bell with unread dot; slide-over lists activity entries (from `activity.jsonl` via IPC, live-appended by the watcher); click → select the item. In-app toast for focused-window agent changes ("Agent moved TICK-012 → Review") complementing Phase 5.2's unfocused native toasts; both reuse one toast stack.

### 7.5 Performance: scoped refresh + memoized cards — M
- **Where:** `App.tsx` refresh path, `components/Board.tsx`.
- Today every FS event re-fetches the board + **every item body** over IPC and re-renders the whole board. `ChangePayload` already carries the changed file path: item file → derive id from basename, `getItem(id)`, patch that one entry (`unlink` → remove); `board.yml` → `getBoard()` only; unrecognized → full refresh fallback. `React.memo(Card)` + `useCallback` handlers so drop-target hover stops re-rendering every card. Turns per-agent-edit cost from O(all bodies) to O(1).

### 7.6 Optimistic drag — S
- **Where:** `App.tsx` (~167). `setItems` status/order swap before `await moveItem`; on catch, `refresh()` + error toast. Watcher reconciles either way. Kills the visible stall between drop and update.

### 7.7 Resizable editor + sticky Save — S
- **Where:** `styles.css` (420px → CSS var), `Editor.tsx`. 6px drag handle on the editor's left edge (min 320px, max 50vw), persisted in localStorage. Make `.editor-foot` sticky so Save is visible with long bodies.

### 7.8 Chip-based label/link editors — M
- **Where:** `Editor.tsx`, new `ChipInput.tsx`. Chips with ✕ + text input (Enter/comma commits); label suggestions from existing labels; link suggestions reuse the wiki-autocomplete search. Stores `string[]` in editor state — also simplifies the Phase 4 diff logic.

### 7.9 Command palette — M/L
- **Where:** new `CommandPalette.tsx`, `App.tsx` (Ctrl+K). Fuzzy overlay: jump-to-item + verbs (New ticket, Move ▸, Take/Release, Switch view, Theme, Settings) dispatching existing App callbacks; reuse `.autocomplete` styling; plain substring scoring, no dependency. Build after Phase 5.6 (shares shortcut plumbing).

> **Amended by the PR #2 review remediation:** A6 — Move ▸ and Take/Release were not in the palette as shipped. All three are now contextual on the selected item. Move sends no `position` (AGENTS.md §11).

## Verification
- Open a v1 fixture board → prompt → dry-run report → migrate → board renders v2 with folded docs visible in tabs.
- Ticking a checklist box updates `checklist.md` on disk; an agent's `set_ticket_doc append` appears in the open tab without clobbering.
- With ~500 tickets, an agent edit updates one card without a full re-render (React DevTools profile); drag feels instant.
- Standup view matches the skill's markdown output for the same board state.
