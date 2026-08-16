---
status: draft
covers: existing stage/board behaviour (v2) + fixed stages & format 3 (v3)
---

# FRD-007 — The fixed six-stage board

## Overview

Every Kanmer board has the same six stages, in the same order, non-customizable: **Backlog → Preparing → Implementing → Review → Verifying → Done**. Fixed stages are what make the rest of the system honest: gates can never reference an absent stage, skills and the GUI may hardcode stage knowledge safely, and every board a user or agent encounters works identically.

## The stages (durable semantics)

| Stage | Meaning | Typical owner |
|---|---|---|
| **Backlog** | Captured, not started. The only stage a governing-doc gate can guard the exit of. | kanmer-tickets / groom |
| **Preparing** | Research, file mapping, planning — everything before code changes. (Merges v2's Researching+Planning; the docs' own `requires` chain preserves internal order.) | kanmer-research, kanmer-plan |
| **Implementing** | Code changes in the ticket's own worktree/branch; ends with the PR open. | kanmer-execute |
| **Review** | **Pre-merge**: the PR is checked against plan and governing docs; feedback becomes tickets; ends at merge. | kanmer-review |
| **Verifying** | **Post-merge**: the shipped result is validated on merged `main`; proof is written here. "Merged but unconfirmed" is a real state worth a column. | kanmer-verify |
| **Done** | Verified. Closeout (records, cleanup) happens after entry. | kanmer-closeout |

## Behaviour (absorbed + changed)

- B1. Stage ids/names/order/colours are constants in `@kanmer/core`; `statuses:` no longer exists in `board.yml` (ADR-0002).
- B2. Movement: any stage → any stage in one call, gated per FRD-002 G2. Taken semantics (`taken_at`/`branch`/`worktree`) and blocked derivation (`blocks:` edges vs. final stage) are unchanged from v2.
- B3. Removed surfaces: the GUI Board-settings stage editor; the MCP status-column mutations (`add/update/remove/reorder_column` for statuses). Areas remain fully editable; deployment environments, doc-type vocabulary, and profiles remain configurable (D21).
- B4. The kanban renders Preparing → Done; Backlog renders as the dedicated list view (FRD-011).
- B5. Skills and the GUI may reference stage ids literally; defensive stage resolution (`list_board` before every move) is no longer required, though `list_board` still reports the stages for orientation.

## Delivery requirement: the format-3 migration (per ADR-0008)

- M1. `version.json` → `{"format": 3}`. Detection: format 2 = version file says 2; format 1 = legacy layout (both remain readable; migration code is permanent).
- M2. One migration performs, atomically per ticket file: **(a)** status mapping via the hardcoded alias table — `todo`, `to do`, `not started`, `backlog` → backlog; `researching`, `planning`, `preparing` → preparing; `in progress`, `doing`, `implementing` → implementing; `review`, `reviewing` → review; `verifying` → verifying; `done`, `shipped`, `complete` → done — case-insensitive, trimmed; **(b)** unmappable statuses → backlog + a `needs-restage` label, each listed in the report; **(c)** loose pipeline docs moved into their type folders — every v2 default type has a v3 home, so the move is total: `research.md` → `research/research.md`, `open-questions.md` → `open-questions/open-questions.md`, `plan.md`/`checklist.md`/`post-implementation-report.md`/`proof.md` likewise, and `impact.md` → `files/impact.md` with a rename note (the one type that changes name; FRD-003 T4). `scratch-<slug>.md` files move to `scratch/<slug>.md`; **(d)** `priority:` stripped (FRD-008); **(e)** `statuses:` and `priorities:` removed from `board.yml`; profile assignment per FRD-002's implementation note.
- M3. Delivered through the existing migration prompt: dry-run preview first (counts per mapping, the unmappable list, the folder moves), blockers reported, one press to apply; `migrate_board` (MCP) performs the same with `dry_run`.
- M4. Idempotent: re-running on a format-3 board is a no-op; a partially-applied migration resumes safely. Resumption is **per ticket**, not per board: a ticket already in its format-3 shape (a `profile`, no `priority`) is skipped rather than rewritten, so a re-run does only the work left. `version.json` is stamped last, so a run that dies part-way leaves the board reading format 2 and correctly re-entering.

  This is stated precisely because the first implementation got it wrong. It carried forward only v1→v2's *document-move* guards and relied on a whole-board `detectFormat()` check for everything else — which cannot distinguish a half-migrated board from an untouched one, so every retry rewrote every ticket. On a real 242-ticket board that meant three attempts, each dying earlier than the last.

- M5. The migration survives transient filesystem contention. On Windows `rename` fails `EPERM`/`EBUSY`/`EACCES` whenever anything holds the destination open — a virus scanner reading a just-created file, the search indexer, `git add` hashing the tree — which is ordinary rather than exceptional during a bulk write. Atomic writes retry with a short backoff and never leave their temp file behind. The GUI additionally stops its board watcher and git-sync timer for the duration, so the app is not competing with its own migration for the files it is writing.

## Acceptance criteria

1. A fresh board and a migrated board expose identical stage sets; no code path can add, remove, rename, or reorder a stage.
2. A legacy board running `todo` / `in progress` / `review` / `done` maps with zero manual intervention and zero `needs-restage` labels.
3. A board containing a status `triage` migrates with those tickets in Backlog, labelled `needs-restage`, and the report lists each by id.
4. Every default gate is live on every board (no dangling-stage inertness is possible).
5. `smoke.mjs` passes with stage constants; no test resolves stages dynamically.
6. Opening a format-2 board shows the migration prompt; declining leaves it fully readable (read-only compatibility until migrated).

## Implementation notes (delta — removable after landing)

GUI Board tab shrinks to areas only; palette/context-menu Move verbs use the constant list; kanmer-setup no longer proposes stages (its brief shortens accordingly).

## Related

ADR-0002 (fixed stages) · ADR-0008 (single migration) · FRD-002 (boundaries) · FRD-008 (priority removal) · FRD-011 (backlog view) · PRD-001.
