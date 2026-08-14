# Phase 4 — GUI: Settings redesign

**Goal:** replace the single long-scroll Settings modal with a **tabbed, fixed-size** dialog; fix the squished text boxes; add a **Documents** tab that edits the Phase 1 per-area doc types + hierarchy + gate rules; add a deployment toggle and more customization. Keep the one-draft-one-`setBoard` model intact — tabbing is purely a rendering change.

**Depends on:** Phase 1 (`board.docs`, `deployment`), shares modal-size CSS with Phase 3. **Feeds:** Phase 5 (Settings is per-active-tab). **Scope:** `@kanmer/gui` renderer.

## Why it looks squished today
Three `ColumnEditor`s (stages/areas/priorities) sit in a 2-col `.settings-grid` (`styles.css:1081-1085`) inside a `.modal` capped at 920px (`styles.css:670-672`), so each `.col-name`/`.col-id` (`styles.css:1104-1130`) gets ~⅓ width → the input clips and the third editor wraps to a half-width row. The modal is also only `max-height`-capped, so it grows a giant internal scroll.

## Items

### 4.1 Tabbed, fixed-size shell — M (request #9)
- **Where:** `Settings.tsx:101-215`, `styles.css`.
- New `.modal.settings` with **explicit width + height** (≈`min(900px, 94vw)` × `min(640px, 90vh)` so small screens still fit, mirroring the per-variant sizing of `.modal.confirm`/`.modal.migrate` at `styles.css:696-698,1063-1065`) + a left rail / right pane. Tabs reuse the existing `.tab`/`.tab.active` classes (already used at `App.tsx:440-454`, `Editor.tsx:381-403`). Tabs: **Board**, **Documents**, **Appearance**, **Connect** (Connect body is Phase 6). Switching tabs never resizes the dialog.

### 4.2 Un-squish the Board tab — S (request #9)
- Replace `.settings-grid` (2-col) with `.settings-cols` (`display:flex; flex-direction:column`) so each `ColumnEditor` (stages/areas/priorities/id-prefixes) is **full-width** — the squeeze disappears with no change to `ColumnEditor` internals.

### 4.3 Documents tab — L (requests #2, #4, #16)
- **Where:** new `DocumentsTab` sub-component in `Settings.tsx`, over `draft.docs`.
- **This tab is where D5's "fully customizable" promise is kept** — the whole doc model (types, hierarchy, gates) is user-editable here; defaults are only a starting point. Editors for: per-area **doc types** (add/rename/reorder — order = hierarchy) with `requires` prerequisites; **gate rules** (`needs`/`needsRepoDoc` × `leave`/`enter` stage — rendered as friendly sentences, e.g. *"To move into **Review**, **Post-implementation report** must exist"*, not raw leave/enter engine-speak); `repoDocs` kind→glob; and the **deployment** toggle + environment list (request #16 — turning it on activates the ticket `deployment` field; off removes it everywhere). Each area shows an **inheritance indicator** ("Inherits default" vs "Customized") with a *Reset to default* action. All mutate the single `draft` and persist through the existing whole-board `setBoard` (`Settings.tsx:44-62`), keeping `validateDraft` (`371-401`) as the pre-save check — extended to mirror core's config checks: gate rules referencing unknown doc ids or stages, `requires` naming unknown ids, and `requires` cycles all block save with a named error. **Guard:** gate the Documents tab behind `board.docs` presence so a pre-Phase-1 board can't half-render — and **this phase owns the backfill prompt** (Phase 1 D2): when the open board lacks `docs` or canonical stages, Settings (plus a dismissible board banner) offers *"Upgrade board…"* → dry-run preview (stages to insert, docs block to add) → apply via core `migrateBoard`, reusing the existing `.modal.migrate` pattern.

### 4.4 More settings — S
- Enumerate and add sensible globals to `AppSettings` (`settings.ts`) / the board: default area + priority for new tickets, card density, confirm-on-delete, and (Appearance) the existing theme/notifications. Each is a small, additive setting.

### 4.5 Fix column-stranding on save — S (audit A3/E19)
- The GUI whole-board save can currently drop a column that items still reference — the one protection `remove_column` has (`store.ts:219-249`) that the `setBoard` IPC path (`main/index.ts:407-410`) lacks; a documented live hazard, now fixed rather than merely not-worsened. `validateDraft` blocks removing a stage/area still in use (listing the occupying ticket ids, matching `remove_column`'s message), and core's `setBoard` gains the same check server-side so no GUI path can strand items.

## Release rail
GUI-only. Consumes Phase 1 `board.docs`/`deployment`. No tool-reference change.

## Verification
- `npm run typecheck -w @kanmer/gui`; `npm run build -w @kanmer/gui`.
- Manual: dialog is a fixed size, no giant scroll; each ColumnEditor full-width, inputs not clipped; Documents tab adds/reorders per-area doc types, edits gate rules (friendly phrasing), toggles deployment, shows inheritance + reset per area; a `requires` cycle and a gate naming an unknown stage both block save with a named error; removing an occupied stage/area blocks save listing the occupying ids; a pre-v2 board shows the "Upgrade board…" prompt with a dry-run preview before applying; a single Save round-trips through `setBoard`; Connect tab present (wired in Phase 6).
