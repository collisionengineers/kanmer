---
status: draft
covers: new (v3): the Help menu today offers only update-check and a GitHub link
---

# FRD-024 — In-app manual

## Overview

Kanmer ships its own manual, readable offline inside the app. Help → **Kanmer Manual** (and F1) opens a navigable, searchable guide. The content is *written for the user* and compiled into the renderer at build time; only the shortcuts chapter is derived from source.

> **Amended (DOC-007).** This overview previously read "the content is *generated from the durable FRDs* — the documentation system documenting the product it governs". That premise is withdrawn. It was elegant and it produced a manual users could not use: nine of twelve chapters shipped as specification text, eight of them a bare H1 and a pointer to a path the packaged app does not contain, and one — board sync — as 1761 characters of verbatim requirement list naming an internal source file and a feature marked "not built". An FRD is normative for an implementer; a manual is useful to someone who cannot see the repository. Those are different documents and no amount of prose in the first makes it the second.

## Requirements

- R1. **Access:** Help menu item + F1; opens an in-app viewer (dedicated window or full-container view) with a chapter sidebar, in-page search, and theme-consistent rendering (existing marked pipeline, FRD-019 styling).
- R2. **Chapters** (amended DOC-007 — nineteen, in reading order, superseding the eleven previously listed here): What Kanmer is · Install and open a project · Connect an agent · Your first ticket, end to end · The six stages · Profiles: what a ticket owes · Why can't I move this? · Ticket documents · Reference files and scratch · Proof · Areas, epics and horizons · Dispatching agents · Sharing a board over Git · Staying in sync · Settings, tab by tab · Keyboard shortcuts · Keeping Kanmer up to date · Troubleshooting · Glossary.

  There is deliberately **no backlog chapter**: GUI-070 withdrew the separate Backlog view while this ticket was in flight, so Backlog is a stage like any other and the stages chapter covers it. A chapter describing a table view that no longer exists would be the same class of defect this ticket removes.

  Chapter ids are the deep-link surface and are treated as stable: the viewer falls back to the first chapter for an id it does not recognise, so a rename opens the wrong chapter silently rather than erroring.

- R3. **Content pipeline** (amended DOC-007): chapters are **hand-written** markdown under `/docs/manual/`, compiled at build time into a committed TypeScript module the bundler picks up like any other source. The renderer CSP is `default-src 'self'` and the packaged app does not ship `/docs/`, so compiling in and committing the artifact are both load-bearing, not incidental. **Only the shortcuts chapter is generated**, from the app's own binding table, so it cannot drift from what the keys do.

  R3a. **The build refuses a chapter that is not fit to ship.** It rejects: a missing chapter file; a top-level `# ` heading in an authored body (the title is supplied by the generator, so an H1 there is the shape the withdrawn derivation produced); fewer than 400 characters of prose once code fences, tables, headings and list markers are stripped; a `FRD-`/`ADR-`/`PRD-` token or a requirement-list line (`R1.`, `AC2.`) in any title or body; and any `docs/…` path, which is a dead end for a reader. Paths under `.kanmer/` and `.worktrees/` are explicitly permitted — those exist on the user's own disk. The rules that are not viewer-specific apply to the generated chapter too.

  R3b. **`--check` must be reached by something.** It runs in the root `test` script and as a named step in the release verification gate. Before DOC-007 nothing invoked it, so a stale committed artifact could ship silently.
- R4. **Contextual entry points — withdrawn (GUI-074, GUI-081):** Kanmer has no contextual manual-help affordance. GUI-074 removed the Settings-tab "?" because F1 / Help → **Kanmer Manual** already provide access; the separate gate-block-message "?" was never built and is withdrawn by GUI-081 rather than being described as a removed feature. Gate refusals use their own human-facing guidance (GUI-087); the manual remains available through F1 and the Help menu.
- R5. Versioned with the app; no network required.

## Acceptance criteria

1. Fresh install, offline: F1 opens the manual; searching "profile" lands on the profiles chapter.
2. The shortcuts chapter matches every live binding (test compares the binding table to the rendered chapter).
3. Dark/light/system themes all render the manual natively (no white flash, no unstyled content).
4. *(added DOC-007)* The build refuses a chapter reduced to its heading, or one carrying a requirement id or a `docs/…` path, and names the reason. The guard this replaces could never fire: the lead-prose extractor trimmed the lead and then stripped the H1 with a regex requiring a trailing newline `trim()` had already removed, so the heading survived and the `if (!body)` check tested a value the preceding line guaranteed non-empty.

Related: user request (R9) · FRD-019 · FRD-002 · content written for the user, fact-checked against shipped code.
