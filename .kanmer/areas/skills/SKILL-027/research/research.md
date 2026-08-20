# Research — SKILL-027: board-vs-reality sweep

## Question

How should `kanmer-groom` detect an open Backlog or Preparing ticket whose requested work has already landed on `main`, while keeping a match advisory until the human approves the board change?

## Findings

- `plugins/kanmer/skills/kanmer-groom/SKILL.md` already separates **Scan**, **Propose**, and **Apply**. Its opening rule forbids a silent reshuffle of the shared backlog, and its archive rule uses reversible `archived: true`. The new sweep belongs in Scan and must feed Propose; it must not apply archive/rescope itself.
- MASTERPLAN S-33 is the controlling work order: examine open Backlog/Preparing tickets against `main` history by ticket id and subject, then propose an Outcome note plus archive or rescope. It explicitly describes a board-vs-reality correction, not a new status or automatic classifier.
- MCP ticket reads supply the candidate roster and current status. They do not prove repository history, so the groom agent must separately inspect local `main` with `git log`/show and merged GitHub PR metadata with `gh` when available. A title-only hit is a lead, not proof.
- Historical evidence validates the intended two dispositions. CORE-028’s Outcome records that the duplicate-ADR rail shipped through merged PRs #57/#59 while the ticket remained Backlog, so it was archived as `shipped-ownerless`. GUI-076’s original root assets were already committed in `9ec7741`; the ticket was correctly rescoped to the remaining wiring work and later reached Done.
- The live board has already been repaired: CORE-028 is archived and GUI-076 is Done. Therefore a current live-board sweep must not falsely flag either as an open candidate. Verification of the historical detection path needs an evidence-backed dry run or a temporary board copy, never mutating the live board merely to recreate an old defect.
- `scripts/verify-skill-prose.mjs` is the existing dependency-free rail for durable skill-prose contracts. If the new workflow wording is made mechanically checkable, its node:test companion can prove a removed/disabled sweep contract makes that verifier fail.

## Implications

- Add a clearly bounded Scan finding for only non-archived Backlog/Preparing tickets. For each candidate, search the exact id and a distinctive subject phrase in `main` commits and merged PRs, inspect the diff/PR rather than accepting a keyword match, and report the commit/PR evidence plus the affected scope.
- Preserve conservative outcomes: no credible evidence means no proposal; full delivery proposes an Outcome note plus archive; partial delivery proposes a concrete rescope. All proposed edits stay behind the groom skill’s existing user sign-off.
- The plan should update only the groom workflow and the focused prose verification/test support. It must not add MCP/core history queries, ticket fields, automatic archival, status moves, or a release/plugin-bundle change.

## Open questions

- None. MASTERPLAN S-33 and the existing groom confirmation contract decide the evidence and approval boundaries.
