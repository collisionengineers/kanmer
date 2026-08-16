---
status: draft
covers: existing gate engine (v2) + profiles (v3)
---

# FRD-002 — Requirement profiles

## Overview

Every ticket carries a **profile** that determines which documents each stage boundary requires of it. Profiles are how Kanmer right-sizes its evidence pipeline: a feature earns the full pipeline, a chore earns a plan and a proof, a spike's research *is* its deliverable. The gate engine enforces profiles server-side — the GUI and agents can only ever be blocked honestly, with the missing document named.

## The gate engine (absorbed from v2, unchanged mechanics)

- G1. `move_item` validates every stage transition against the ticket's resolved requirements; a blocked move returns an error naming the unmet boundary and the missing document type(s).
- G2. A multi-stage jump is checked against **every** boundary it crosses and blocked by the first unmet one. A ticket whose profile leaves a boundary empty crosses it freely.
- G3. **Creation is ungated** — a ticket may be created directly in any stage (this is what makes historical backfill possible; ADR-0010).
- G4. `get_doc_gates(id)` reports, per boundary, the required types, which are satisfied, and what the next move needs. It is the single source agents consult (ADR-0009: skills derive, never restate).
- G5. A requirement is satisfied by ≥1 markdown document of the required type (storage semantics in FRD-003); a custom profile may instead require **named** documents (`research/auth`).

## Profiles

- P1. Profiles are defined in `board.yml` as named maps: stage boundary → required doc types. Boundaries are the fixed set from FRD-007 (`leave-backlog`, `leave-preparing`, `enter-review`, `enter-done`; a profile may also gate `enter-verifying` if configured).
- P2. **Shipped defaults** (present on every new board, editable):

| Profile | leave-backlog | leave-preparing | enter-review | enter-done |
|---|---|---|---|---|
| feature | governing-doc | research, files, plan, checklist | post-implementation-report | proof |
| fix | — | files, plan | — | proof |
| chore | — | plan | — | proof |
| spike | — | — | — | research |

- P3. `custom` is always available: the ticket carries an inline `requires:` map of the same shape (may name specific files). An empty map = no requirements (used by historical backfill).
- P4. The `governing-doc` requirement is satisfied by a non-empty `refs` (repo-doc links, maintained by `link_doc`) **or** `docs_todo: true` (absorbed v2 behaviour).
- P5. Proof requirements may carry a type and source (`proof:visual`, `proof:visual@staging`) — semantics in FRD-006.
- P6. Resolution order for a ticket's profile: explicit `profile:` on the ticket → the ticket's area's default profile (optional per-area setting) → the board default (`fix` on new boards).
- P7. Profile is mutable (`update_item`); gates re-evaluate immediately. Changing area does not change an explicitly set profile.

## Surfaces

- S1. **MCP:** `create_item`/`create_items`/`update_item` accept `profile` (and `requires` when custom); `list_board` surfaces the profile definitions; `get_doc_gates` is profile-aware; tool descriptions teach the concept in two sentences (ADR-0009 layer 2).
- S2. **GUI:** the Documents settings tab becomes the **Profiles editor** (replacing the v2 per-area doc-set editor, ADR-0003); the add-ticket dialog and the editor show a profile picker; a card blocked by a gate shows which boundary and what's missing; drag onto a gated column surfaces the same.
- S3. **Skills:** kanmer-tickets owns the intake judgment — picking the profile from the ticket's nature, asking the user when genuinely unsure (D4); every phase skill begins from `get_doc_gates`.
- S4. **AGENTS block:** states that profiles exist and that `get_doc_gates` precedes any move (ADR-0009 layer 3).

## Acceptance criteria

1. A `chore` ticket moves Backlog → Implementing in one call with only `plan/` populated; the same ticket is blocked entering Done until `proof/` has a document.
2. A `spike` ticket moves Backlog → Done once `research/` is non-empty; it never requires files/plan/proof.
3. A `feature` ticket without `refs` or `docs_todo` cannot leave Backlog; the error names the governing-doc requirement.
4. A `custom` ticket requiring `research/auth` is not satisfied by `research/db.md`.
5. Changing a ticket's profile from feature to chore immediately unblocks a move that the feature gates blocked.
6. `get_doc_gates` output alone is sufficient for an agent to know every next requirement (verified by skill prose containing no gate rules).
7. The GUI profile editor cannot produce a profile referencing an unknown doc type or boundary (validated on save).

## Implementation notes (delta from shipped v2 — removable after landing)

- Replaces `board.docs` per-area doc sets; GUI per-area Documents editor removed.
- **Format-3 migration default:** existing active tickets receive **`feature`** — in-flight work is assumed to deserve the full pipeline, and a migrated board should surface that debt rather than hide it. Done/archived tickets receive `custom` with an empty map (nothing retroactively nags). Both listed in the migration report. *(Assistant proposed `fix` for active tickets; the user chose `feature`.)*

## Related

ADR-0003 (profiles replace per-area sets) · ADR-0009 (contract layers) · FRD-003 (document storage) · FRD-006 (typed proof) · FRD-007 (the boundaries) · PRD-001.
