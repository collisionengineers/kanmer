# Post-implementation report — SKILL-027

## Summary

Added an evidence-first board-vs-reality sweep to `kanmer-groom`. It scans only open Backlog/Preparing tickets, searches `main` and merged PRs by ticket id and distinctive title phrase, verifies the matched commit/diff/PR before reporting, and emits advisory no-action/archive/rescope proposals behind the existing user sign-off. A focused static rail and negative fixture keep that safety contract from silently disappearing.

## Changes

| File | Change | Why |
|---|---|---|
| `plugins/kanmer/skills/kanmer-groom/SKILL.md` | Added the board-vs-reality scan finding with candidate bounds, exact history evidence, auditable proposal fields, manual-approval boundary, and historical CORE-028/GUI-076 calibration. | Makes shipped-ownerless/partially shipped tickets visible without turning grooming into an automatic archive engine. |
| `scripts/verify-skill-prose.mjs` | Added check 10 for bounded candidates, `main`/merged-PR evidence, match inspection, proposal-only outcomes, and no automatic mutation. | Keeps the new operational safety contract dependency-free and visible in `npm run verify:skills`. |
| `scripts/verify-skill-prose.test.mjs` | Added a temporary copied-skill-tree regression test that removes the wrapped `main` history phrase and requires verifier failure. | Proves the new check is meaningful instead of merely green on the repository’s current prose. |

## Governing docs

- No PRD, FRD, or ADR is linked or changed. This implements the adopted MASTERPLAN S-33 work order without changing a durable product or architecture contract.
- MASTERPLAN S-33 is met by the Backlog/Preparing candidate filter, id-and-subject history evidence, and proposed Outcome/archive/rescope outcomes.
- HZN-006’s shared requirement is met by making board-vs-reality drift auditable while preserving the human approval boundary.

## Risks / follow-ups

- Keyword/title matches remain intentionally non-authoritative: the skill requires inspection of the matched commit, diff, or PR before a candidate is reported.
- Missing local history or GitHub access produces unavailable evidence/no proposal, never an inference that the work is absent or shipped.
- CORE-028 and GUI-076 stay untouched. They are already archived/Done, so the live dry run correctly excludes them; their recorded histories are the archive-versus-rescope calibration. No follow-up ticket is needed.

## Verification hand-off

- `npm run verify:skills` — PASS: all ten checks, including check 10’s bounded/evidence-first/proposal-only sweep assertion.
- `node --test scripts/verify-skill-prose.test.mjs` — PASS: 3/3 tests, including the deliberately weakened groom-fixture rejection.
- `git diff --check` — PASS.
- Read-only board/history calibration — current roster contains 10 Backlog and 43 Preparing tickets; CORE-028 is archived and GUI-076 is Done, therefore neither is a candidate. `git log main` and merged PR metadata confirm CORE-028’s PRs #57/#59 whole-delivery history; `9ec7741` confirms GUI-076’s prior assets, which required rescoping rather than archiving.
- On merged `main`, rerun those two commands and inspect `kanmer-groom/SKILL.md` to confirm the checkout contains the advisory-only contract. No visual proof is required.
