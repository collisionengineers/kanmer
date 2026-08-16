---
status: draft
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
