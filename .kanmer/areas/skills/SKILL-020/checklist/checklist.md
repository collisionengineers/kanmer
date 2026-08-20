# Checklist — SKILL-020

## `kanmer-plan`

- [x] Remove the universal statement that every plan must follow research and files regardless of live gates.
- [x] Make `get_item`, group/link context, and `get_doc_gates` the first routing inputs.
- [x] Fetch/create research and files when the live boundary requires them.
- [x] Permit non-required research/files only when a concrete material uncertainty or exact-file/contract hole is named.
- [x] State that generic usefulness/completeness is not a material hole.
- [x] Preserve Preparing-stage, one-boundary, governing-doc, ADR, question, scope-split, plan, and checklist rules.
- [x] Change the normal user-facing approval hand-off to a short outcome/scope/risk/approval-boundary paragraph.
- [x] Preserve the closing successor to `kanmer-execute` after approval/questions are resolved.
- [x] Confirm no named-profile document mapping was introduced.

## `kanmer-auto`

- [x] Replace “Wave 0 — research everything in parallel” with live per-ticket gate routing.
- [x] Call `get_doc_gates` for every retained ticket before phase dispatch.
- [x] Route only the next required/current applicable phase for each ticket.
- [x] Re-read gates after each completed phase.
- [x] Do not normalize a batch by creating optional documents.
- [x] Preserve archived/blocked/other-owner drop rules and user roster report.
- [x] Preserve user-question parking/reporting at every phase.
- [x] Preserve dependency ordering and file-overlap lane grouping.
- [x] Preserve the approximate three-lane concurrency cap.
- [x] Preserve the `.worktrees/kanmer` prohibition and per-ticket worktrees.
- [x] Preserve target-point stopping, phase-skill delegation, rebase-after-main, failure release/report, and sequential fallback.
- [x] Confirm no profile/document matrix or examples were added.

## Regression rail and proof

- [x] Add a focused named check to `scripts/verify-skill-prose.mjs` for the two removed universal claims.
- [x] Assert both skills still contain `get_doc_gates`.
- [x] Reuse/retain existing checks for board-worktree and one-boundary invariants.
- [x] Make failures name the affected skill/concept.
- [x] Do not weaken FRD-023 R1 or encode profile requirements.
- [x] Run the no-match `rg` for the legacy phrases and record its expected non-zero/no-match result correctly.
- [x] Run positive searches for `get_doc_gates`, lane cap, and board-worktree safety.
- [x] Run `npm run verify:skills` and retain complete output/exit code.
- [x] Run the focused `node --test scripts/verify-skill-prose.test.mjs`.
- [x] Run `git diff --check`.
- [x] Confirm the diff contains only the two SKILL.md files and `verify-skill-prose.mjs`.
- [x] Confirm no template, profile/gate code, MCP/tool reference, generated plugin bundle, package manifest, or lockfile changed.
- [x] Opened PR [#89](https://github.com/collisionengineers/kanmer/pull/89) with `Kanmer: SKILL-020` and both corrected contradictions.
- [x] Stop at review readiness; do not merge or start another ticket.

## Progress notes

- Corrected planner input routing to live gates with an explicitly bounded material-hole exception.
- Replaced universal research Wave 0 with ticket-by-ticket gate routing; `verify-skill-prose` now guards both regressions.
- Opened PR #89; ticket is ready for independent review without a merge.
