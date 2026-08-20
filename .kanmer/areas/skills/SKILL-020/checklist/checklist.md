# Checklist — SKILL-020

## `kanmer-plan`

- [ ] Remove the universal statement that every plan must follow research and files regardless of live gates.
- [ ] Make `get_item`, group/link context, and `get_doc_gates` the first routing inputs.
- [ ] Fetch/create research and files when the live boundary requires them.
- [ ] Permit non-required research/files only when a concrete material uncertainty or exact-file/contract hole is named.
- [ ] State that generic usefulness/completeness is not a material hole.
- [ ] Preserve Preparing-stage, one-boundary, governing-doc, ADR, question, scope-split, plan, and checklist rules.
- [ ] Change the normal user-facing approval hand-off to a short outcome/scope/risk/approval-boundary paragraph.
- [ ] Preserve the closing successor to `kanmer-execute` after approval/questions are resolved.
- [ ] Confirm no named-profile document mapping was introduced.

## `kanmer-auto`

- [ ] Replace “Wave 0 — research everything in parallel” with live per-ticket gate routing.
- [ ] Call `get_doc_gates` for every retained ticket before phase dispatch.
- [ ] Route only the next required/current applicable phase for each ticket.
- [ ] Re-read gates after each completed phase.
- [ ] Do not normalize a batch by creating optional documents.
- [ ] Preserve archived/blocked/other-owner drop rules and user roster report.
- [ ] Preserve user-question parking/reporting at every phase.
- [ ] Preserve dependency ordering and file-overlap lane grouping.
- [ ] Preserve the approximate three-lane concurrency cap.
- [ ] Preserve the `.worktrees/kanmer` prohibition and per-ticket worktrees.
- [ ] Preserve target-point stopping, phase-skill delegation, rebase-after-main, failure release/report, and sequential fallback.
- [ ] Confirm no profile/document matrix or examples were added.

## Regression rail and proof

- [ ] Add a focused named check to `scripts/verify-skill-prose.mjs` for the two removed universal claims.
- [ ] Assert both skills still contain `get_doc_gates`.
- [ ] Reuse/retain existing checks for board-worktree and one-boundary invariants.
- [ ] Make failures name the affected skill/concept.
- [ ] Do not weaken FRD-023 R1 or encode profile requirements.
- [ ] Run the no-match `rg` for the legacy phrases and record its expected non-zero/no-match result correctly.
- [ ] Run positive searches for `get_doc_gates`, lane cap, and board-worktree safety.
- [ ] Run `npm run verify:skills` and retain complete output/exit code.
- [ ] Run `git diff --check`.
- [ ] Confirm the diff contains only the two SKILL.md files and `verify-skill-prose.mjs`.
- [ ] Confirm no template, profile/gate code, MCP/tool reference, generated plugin bundle, package manifest, or lockfile changed.
- [ ] Open the PR with `Kanmer: SKILL-020` and describe both corrected contradictions.
- [ ] Stop at review readiness; do not merge or start another ticket.

## Progress notes

Append exact removed/replacement passages, verifier output, searches, and any material-hole wording review here.
