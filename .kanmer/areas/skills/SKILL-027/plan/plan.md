# Plan — SKILL-027: kanmer-groom board-vs-reality sweep

## Approach

Extend the existing `kanmer-groom` **Scan → Propose → Apply** workflow with a conservative, evidence-first board-vs-reality sweep. It will inspect only non-archived Backlog and Preparing tickets, use both exact ticket-id and distinctive-title searches against local `main` history and merged PRs, and inspect resulting commits/PRs before reporting a candidate. The sweep emits an auditable proposal only: complete evidence suggests an Outcome note plus archive; partial evidence suggests a precise rescope; weak/unavailable evidence yields no action. This fits the current shared-board confirmation contract and avoids a new automated engine or data model.

## Governing docs

- No PRD, FRD, or ADR is linked; this skill-only ticket implements the adopted MASTERPLAN S-33 work order and does not alter a durable product or architecture contract.
- **MASTERPLAN S-33:** met by adding the open Backlog/Preparing history sweep, exact id and subject investigation, and proposed Outcome/archive/rescope dispositions.
- **HZN-006:** met by making board-state drift visible without rewriting a human’s board silently.
- The plan does not modify a governing document or introduce an architecture decision; no ADR is needed.

## Steps

1. Add a dedicated board-vs-reality finding to the groom **Scan** section. Bound the candidate list to non-archived Backlog/Preparing tickets and state that the board roster is read through Kanmer before repository-history investigation.
2. Define the evidence loop in the skill: search `main` separately for the exact ticket id and a distinctive title phrase; search merged PR metadata when GitHub is available; open the matched commit/diff/PR to establish what portion of the ticket actually shipped. Treat title/keyword matches and unavailable history as non-proof.
3. Define an auditable proposed-finding record: ticket id/current stage, commands or sources searched, commit/PR identifiers, shipped versus remaining scope, and one proposed disposition—no action, Outcome note + archive for wholly delivered work, or a concrete rescope for partial work. State again that the user signs off before Apply mutates any ticket.
4. Add the historical verification note: CORE-028 demonstrates whole-ticket archive evidence through PRs #57/#59; GUI-076 demonstrates partial-delivery rescope evidence through `9ec7741`. Because both live records are now repaired, do not flag them as current open candidates or mutate them to recreate a test.
5. Extend `scripts/verify-skill-prose.mjs` with a narrow readable check for the new groom sweep’s essential safety contract: bounded open candidates, `main` history/id-and-subject evidence, and proposal-only archive/rescope handling.
6. Extend `scripts/verify-skill-prose.test.mjs` using its temporary copied skill-tree fixture: remove or weaken the groom sweep contract and assert the verifier exits non-zero and identifies the failed sweep check.
7. Run the focused verifier and node:test suite, then perform a read-only dry run: enumerate current Backlog/Preparing tickets, confirm repaired CORE-028/GUI-076 are excluded by status/archive state, and inspect the recorded commit/PR evidence to demonstrate the intended archive-versus-rescope distinction. Inspect the diff to confirm only the planned skill/verifier/test paths changed.

## Verification

- `npm run verify:skills` passes and prints the groom sweep-contract result.
- `node --test scripts/verify-skill-prose.test.mjs` passes, including the regression fixture.
- A deliberately weakened fixture fails with the sweep-contract label, proving the static guard is meaningful.
- Read-only dry-run evidence records the candidate filter and the historical CORE-028/GUI-076 archive-versus-rescope distinction without changing the live board.
- `git diff --check` is clean; the diff is limited to `kanmer-groom/SKILL.md`, `verify-skill-prose.mjs`, and its test.

## Risks / open questions

- **False positive from a title match:** inspect commit/PR diff and report no action when scope does not match; never treat a keyword hit as shipped evidence.
- **Unavailable GitHub/history:** report the evidence source as unavailable and make no archival/rescope proposal from absence.
- **Overreach into automatic grooming:** keep all detected cases in Propose until the user confirms the batch.
- No open questions remain.
