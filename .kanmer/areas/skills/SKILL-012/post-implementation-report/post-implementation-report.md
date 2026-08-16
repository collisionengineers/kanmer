# Post-implementation report — SKILL-012

## Summary

Open questions are now a gate rather than advice. While `open-questions/` holds
an unticked `- [ ]` above the `## Parked (explicitly deferred)` heading, a ticket
cannot leave Preparing, enter Review, or reach Done. Answering and ticking clears
it; so does parking it with a reason. A ticket that raised no questions is never
blocked.

The mechanism is `questions-resolved`, a pseudo-requirement beside
`governing-doc` — deliberately **not** the `open-questions` doc type, because
requirements are satisfied by a document *existing* and a file of four unanswered
questions would have satisfied that, enforcing the paperwork instead of the rule.
ADR-0011 bounds the exception: this is the only requirement that reads inside a
document, and the default stays existence.

Two defects were found by running it against a copy of the real board, both after
the unit tests were green. They are the substance of this report.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/core/src/docpaths.ts` | modified | `countCheckboxes` + `PARKED_HEADING_RE`. One regex now serves checklist progress and the questions gate — two copies would drift, and they are meant to be the same convention. `stopAtParked` is what makes "answered or explicitly parked" mechanical. |
| `packages/core/src/profiles.ts` | modified | `QUESTIONS_RESOLVED`; accepted by `validateProfileMap`; added to all four shipped profiles at whichever of the three boundaries each declares. |
| `packages/core/src/gates.ts` | modified | `EvidenceProbe.unresolvedQuestions()` and a `statusOf` branch. Sets **no** `warning` even when unsatisfied — warnings are the report's non-blocking channel and must keep meaning one thing. |
| `packages/core/src/board.ts` | modified | **`resolveProfiles` injects the requirement into the profiles in force.** Without this the feature reached new boards only. Two limits enforced: never `leave-backlog`, and never a boundary the profile did not already declare. |
| `packages/core/src/store.ts` | modified | Wires the probe; replaces the inline checklist loop with the shared counter; the move refusal gains a clause saying `questions-resolved` is not a document and naming both escapes. |
| `apps/gui/.../lib/profileDraft.ts` | modified | The renderer duplicates the pseudo-types; without this Settings rejects a profile core accepts. |
| `plugins/kanmer/skills/kanmer-plan/SKILL.md` | modified | Step 7: put the questions to the user, then revise the plan around the answers — the moment the ticket was filed about. |
| `plugins/kanmer/skills/kanmer-review/SKILL.md` | modified | The one stop that **cannot** be a gate, labelled as a convention with the reason. |
| `plugins/kanmer/skills/kanmer-auto/SKILL.md` | modified | A lane that stops on a question is reported as such, quoted, not rolled into the failure bucket. |
| `plugins/kanmer/skills/kanmer-research/SKILL.md` | modified | Points at `get_doc_gates` instead of asserting the rule (FRD-023 R1). |
| `.../assets/open-questions-template.md` | modified | The format is load-bearing now: one question per checkbox, and `## Parked` is normative. |
| `docs/functional/frd/FRD-009-*.md` | modified | R5 (enforcement) added; R3 restated; AC4 added. |
| `docs/functional/frd/FRD-002-*.md` | modified | P4a and the shipped-profile table. |
| `apps/gui/release-notes.md` | modified | 0.3.3 section: what changes, and the upgrade warning with its escape. |
| `plugins/kanmer/mcp/kanmer-mcp.cjs` | modified | Rebuilt **at the repo root** (PR #32's lesson). |
| tests | modified | +23 in core (159 → 182), +1 in GUI. |

## Governing docs

**ADR-0011 — meets, and extends it in two places the ADR did not anticipate.**
The satisfaction rule, the three boundaries, every-profile coverage, the
`## Parked` exact-string test, and the GUI duplication are all implemented as
written. The ADR did **not** say that the requirement must skip `leave-backlog`,
nor that it must never add an undeclared boundary; both were discovered here and
are now documented in `board.ts`. Neither contradicts the ADR — they are limits
it should have stated. Worth folding back into it on a later pass.

**FRD-009 — modifies, authorized.** New R5 makes asking enforced rather than
instructed. R3 restated: dispatch is for work whose specifics are settled, so a
dispatched task raising a question is one that was not ready to dispatch, and the
gate implements R3's "stop at the deliverable" rather than conflicting with it.

**FRD-002 — modifies, authorized.** P4a describes the second pseudo-type and why
it is not the doc type; the profile table shows the requirement on all four.

**FRD-023 — meets.** R1 is the reason this is a requirement and not prose: the
four skill edits add no rule, they point at `get_doc_gates` or cover the one case
gates cannot reach. R5's rail ran.

## Risks / follow-ups

- **`fix` and `chore` have no `enter-review` boundary**, so for those profiles a
  question raised during implementation is caught at `enter-done` rather than at
  review. Accepted deliberately: adding the boundary would change which
  multi-stage moves are legal and would break `spike`'s Backlog → Done jump.
- **`board.yml` no longer lists every effective requirement.** The operator chose
  injection over migrating the file. Stated in `board.ts` rather than left for
  someone to discover.
- **ADR-0011 should gain the two limits** found here. Not done in this PR to keep
  the merged ADR stable; a one-paragraph amendment.
- **Skill prose is untested**, as always. The `kanmer-review` convention in
  particular is unenforceable by construction and will hold only as well as the
  skill is followed.
- **[[MCP-007]]** (make `plugin:check` refuse inside a worktree) remains the real
  fix for the trap that bit SKILL-011; this PR only avoided it by hand.

## Verification hand-off

On merged `main`:

- `npm test` — core **182**, GUI **202**.
- `npm run plugin:check` — 29 tools, bundle bytes match. Then
  `grep -c questions-resolved plugins/kanmer/mcp/kanmer-mcp.cjs` → **1**. Check
  the artifact, not the build; SKILL-011 shipped a bundle that lacked its feature
  and every other signal said it was fine.
- `npm run smoke:protocol`, `npm run verify:agents-block` — 26/26 each.
- `npm run typecheck -w @kanmer/gui` — clean.
- **The behavioural check:** on a *copy* of a real board, un-tick one question in
  a ticket's `open-questions` and confirm `move_item` refuses with a message
  naming both escapes; re-tick and confirm it passes; park it instead and confirm
  it passes; and confirm a ticket with no `open-questions` document is
  unaffected. Run it against a board whose `board.yml` has its own `profiles:`
  block — a board on the shipped defaults would pass even with the injection
  missing, which is exactly how this nearly shipped broken.
