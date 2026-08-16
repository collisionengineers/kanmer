---
status: draft
covers: new (v3): the Help menu today offers only update-check and a GitHub link
---

# FRD-024 — In-app manual

## Overview

Kanmer ships its own manual, readable offline inside the app. Help → **Kanmer Manual** (and F1) opens a navigable, searchable guide. The content is *generated from the durable FRDs* — the documentation system documenting the product it governs.

## Requirements

- R1. **Access:** Help menu item + F1; opens an in-app viewer (dedicated window or full-container view) with a chapter sidebar, in-page search, and theme-consistent rendering (existing marked pipeline, FRD-019 styling).
- R2. **Chapters:** Getting started (open a project, connect an agent) · The board & the six stages · Tickets, profiles & gates ("why can't I move this?") · Documents, reference files & proof · Groups (epics & horizons) · The backlog view · Working with agents (skills, dispatch, asking) · Git board sync · Settings · Keyboard shortcuts · Troubleshooting.
- R3. **Content pipeline:** chapters are markdown bundled with the app, generated at build time from the FRD set plus hand-written getting-started/troubleshooting; the shortcuts chapter is generated from the actual binding table so it can never drift.
- R4. Contextual entry points: a "?" affordance on gate-block messages deep-links to the relevant chapter. (A matching "?" on Settings tabs was removed — GUI-074 — since it deep-linked into chapters that were mostly unwritten stubs, and F1 / Help → Manual already provide entry to the manual without it. The gate-block-message affordance below was never implemented; see GUI-081, which will implement it or formally withdraw this clause.)
- R5. Versioned with the app; no network required.

## Acceptance criteria

1. Fresh install, offline: F1 opens the manual; searching "profile" lands on the profiles chapter.
2. The shortcuts chapter matches every live binding (test compares the binding table to the rendered chapter).
3. A gate-block message's "?" opens "Tickets, profiles & gates".
4. Dark/light/system themes all render the manual natively (no white flash, no unstyled content).

Related: user request (R9) · FRD-019 · FRD-002 · content sourced from all FRDs.
