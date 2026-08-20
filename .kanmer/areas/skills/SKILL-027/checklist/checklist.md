# Checklist — SKILL-027

- [ ] Add the bounded Backlog/Preparing board-vs-reality candidate scan to `kanmer-groom`.
- [ ] Document separate exact ticket-id and distinctive-title searches against `main` commits and merged PRs.
- [ ] Require commit/PR/diff inspection before a candidate is reported as shipped work.
- [ ] Define the auditable proposal record with evidence, scope assessment, and no-action/archive/rescope disposition.
- [ ] Preserve user sign-off before Outcome/archive/rescope changes reach Apply.
- [ ] Document CORE-028 as the whole-delivery/archive example and GUI-076/`9ec7741` as the partial-delivery/rescope example, without altering either live ticket.
- [ ] Add a dependency-free verifier check for the bounded, evidence-first, proposal-only sweep contract.
- [ ] Add a temporary-fixture node:test that proves removing or weakening the sweep contract fails verification.
- [ ] Run `npm run verify:skills` and inspect the sweep-check output.
- [ ] Run `node --test scripts/verify-skill-prose.test.mjs`.
- [ ] Perform the read-only current-board dry run and record why the repaired known cases are excluded while their history demonstrates both dispositions.
- [ ] Run `git diff --check` and confirm only the planned skill/verifier/test paths changed.
- [ ] Write the post-implementation report with commands, dry-run evidence, scope, and any unavailable history source.

## Progress notes

- Research and plan completed before implementation; this checklist remains intentionally unticked until its own worktree execution.
