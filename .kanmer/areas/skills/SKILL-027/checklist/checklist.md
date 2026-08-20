# Checklist — SKILL-027

- [x] Add the bounded Backlog/Preparing board-vs-reality candidate scan to `kanmer-groom`.
- [x] Document separate exact ticket-id and distinctive-title searches against `main` commits and merged PRs.
- [x] Require commit/PR/diff inspection before a candidate is reported as shipped work.
- [x] Define the auditable proposal record with evidence, scope assessment, and no-action/archive/rescope disposition.
- [x] Preserve user sign-off before Outcome/archive/rescope changes reach Apply.
- [x] Document CORE-028 as the whole-delivery/archive example and GUI-076/`9ec7741` as the partial-delivery/rescope example, without altering either live ticket.
- [x] Add a dependency-free verifier check for the bounded, evidence-first, proposal-only sweep contract.
- [x] Add a temporary-fixture node:test that proves removing or weakening the sweep contract fails verification.
- [x] Run `npm run verify:skills` and inspect the sweep-check output.
- [x] Run `node --test scripts/verify-skill-prose.test.mjs`.
- [x] Perform the read-only current-board dry run and record why the repaired known cases are excluded while their history demonstrates both dispositions.
- [x] Run `git diff --check` and confirm only the planned skill/verifier/test paths changed.
- [x] Write the post-implementation report with commands, dry-run evidence, scope, and any unavailable history source.

## Progress notes

- Research and plan completed before implementation; this checklist remains intentionally unticked until its own worktree execution.
- Implemented the bounded advisory sweep and its focused static guard. The negative fixture first missed a wrapped `main`/history phrase; it was corrected to remove whitespace-separated text and now proves the verifier fails when the contract is weakened.
- Focused verification passed: `npm run verify:skills` (all 10 checks), `node --test scripts/verify-skill-prose.test.mjs` (3/3), and `git diff --check`.
- Read-only calibration: the current board has 10 Backlog and 43 Preparing tickets; CORE-028 is archived and GUI-076 is Done, so neither is a candidate. Main history and merged PR metadata confirm the whole-delivery archive evidence (PRs #57/#59) and the partial-delivery rescope evidence (`9ec7741`). No live ticket was changed.
- Committed implementation as `1e5e761a4106d2e5e58f51d39ccdc098c9e2319d` and wrote the post-implementation report for review.
