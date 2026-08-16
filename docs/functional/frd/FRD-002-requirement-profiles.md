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
- G2a. **A single move may cross at most one _gated_ boundary** — one the resolved profile declares with at least one requirement. A declared boundary with an empty requirement list is vacuous and does not count, so `custom: {}` and `custom: { "leave-backlog": [] }` behave identically. Backwards moves cross nothing and are unaffected.

  G2 alone let a ticket satisfy the entire pipeline at once: write all six documents, then move Backlog → Done in a single call. Every gate passes, because gates test that a document *exists*, never that it existed before the work it gates. The result is a ticket that looks fully worked with no pipeline behind it — PRD-001 problem 1 in a form the gate engine cannot see. Observed on Kanmer's own board, where 26 v3 roadmap tickets were closed exactly that way.

  The rule counts **gated boundaries, not stages**, and that distinction is load-bearing: `chore`'s one-jump from Backlog to Implementing crosses two stages but only one gated boundary, and `spike` reaches Done across five stages and one gated boundary. Counting stages would break both shipped acceptance cases.

  The refusal is distinct from the missing-document error and must not borrow its wording, because it fires when every document is present.

  **Rejected alternatives**, recorded so they are not re-proposed:

  - *"`done` is entered only from `verifying`."* Contradicts the `spike`-straight-to-Done acceptance case.
  - *"A gating document must predate the transition it gates."* Unimplementable as stated. The activity log is gitignored (`ensureBoardWorktree` writes it into the board worktree's `.gitignore`), so stage-entry history does not survive a clone; and git does not carry mtimes, so on a fresh checkout every document looks written after everything else. Both timestamps would have to become committed data. Even then it would not catch the case it was invented for: write the code, then the plan, then move — every timestamp is correctly ordered, because nothing in the board records when the *code* was written.

  - *"A document's first-write time against the first commit on the ticket's branch."* This was carried as the open design question until it was researched properly, and it fails twice.

    It has no timestamps to compare. `setDoc` records no write time — its `version` is a content hash — and `syncBoard` commits the whole board in a single `git add -- .kanmer` per sync, so every document written between two syncs shares one commit time. With automatic sync off, an entire ticket's documents can carry a stamp dated *after* the code they describe.

    Even given committed timestamps, it is aimed at the wrong moment. It only sees code committed to the **ticket's own branch**. Work done in the main checkout before the branch exists is invisible to it — and that is precisely how this repository's own tickets went wrong: research written, code edited in the main checkout, plan written, worktree created afterwards. The check would never have fired.

    For the record, since the naive form looks plausible and is not: counting commits on the branch means counting those *unique* to it (`rev-list --count <branch> --not <every other ref>`), which is base-free and behaves correctly. A plain `rev-list --count <branch>` returns the whole inherited history — **147** on a freshly created branch in this repo — and would refuse every move out of Preparing forever.

    The cost that settled it: the check would introduce the first subprocess into `@kanmer/core`, which is bundled into the shipped MCP server, and spend two git spawns on every drag in the GUI. See the parked ticket for the full measurement.

  **What the gates can and cannot establish.** They enforce **sequence**, not **causation**. G2a guarantees the pipeline was walked rather than satisfied in one move; nothing here can tell that a plan written first actually guided the work, because a plan written first and then ignored satisfies every mechanical check there is. That is review's job, or nobody's. The distinction is worth stating plainly: a gate advertised as proving more than it does is one people learn to route around.
- G2b. An item records `stageEntered` — when it first entered each stage, keyed by stage id, stamped on the way in and never overwritten. This is committed history the gitignored activity log cannot provide. It does not enable G2a's rejected timestamp rule and is not intended to; it exists for time-in-stage reporting and so a future timing rule needs no migration.
- G3. **Creation is ungated** — a ticket may be created directly in any stage (this is what makes historical backfill possible; ADR-0010).
- G4. `get_doc_gates(id)` reports, per boundary, the required types, which are satisfied, and what the next move needs. It is the single source agents consult (ADR-0009: skills derive, never restate).
- G5. A requirement is satisfied by ≥1 markdown document of the required type (storage semantics in FRD-003); a custom profile may instead require **named** documents (`research/auth`).

## Profiles

- P1. Profiles are defined in `board.yml` as named maps: stage boundary → required doc types. Boundaries are the fixed set from FRD-007 (`leave-backlog`, `leave-preparing`, `enter-review`, `enter-done`; a profile may also gate `enter-verifying` if configured).
- P2. **Shipped defaults** (present on every new board, editable):

| Profile | leave-backlog | leave-preparing | enter-review | enter-done |
|---|---|---|---|---|
| feature | governing-doc | research, files, plan, checklist, questions-resolved | post-implementation-report, questions-resolved | proof, questions-resolved |
| fix | — | files, plan, questions-resolved | — | proof, questions-resolved |
| chore | — | plan, questions-resolved | — | proof, questions-resolved |
| spike | — | — | — | research, questions-resolved |

- P3. `custom` is always available: the ticket carries an inline `requires:` map of the same shape (may name specific files). An empty map = no requirements (used by historical backfill).
- P4. The `governing-doc` requirement is satisfied by a non-empty `refs` (repo-doc links, maintained by `link_doc`) **or** `docs_todo: true` (absorbed v2 behaviour).
- P4a. **`questions-resolved`** (ADR-0011, FRD-009 R5) is the second pseudo-type: satisfied when `open-questions/` holds no unticked `- [ ]` above the `## Parked (explicitly deferred)` heading, and by an absent document. It is deliberately **not** the `open-questions` doc type — requirements are satisfied by a document existing, so requiring the document would be satisfied by a file of unanswered questions. It is the only requirement that reads a document's *content*; ADR-0011 bounds that exception and any further content-reading requirement must amend it. Every shipped profile carries it, `spike` included: a carve-out by work type would assert that some work is inherently unambiguous.
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
