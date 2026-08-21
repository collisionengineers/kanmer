# Checklist — SKILL-021

## Dependency and contract check

- [x] Confirm MCP-023 and MCP-024 are merged before editing the skills.
- [x] Read the shipped packet output and canonical record schemas; copy final field names exactly.
- [x] Confirm the live compatibility key spelling/value from `get_status`.

## Execute skill

- [x] Make `get_execution_packet` the first ticket-specific data call.
- [x] Stop on `ready:false` before take, Git, worktree, or writes; report reason/missing.
- [x] Retain packet fingerprint, project identity, plan/checklist/files, group context, gates, commands hint, and stop condition.
- [x] Sniff `get_status.compat.expectedProject` before sending `expected_project`; omit for unsupported old servers.
- [x] Use only `.worktrees/<id-lowercase>` and never `.worktrees/kanmer`.
- [x] Validate actual branch/worktree before `take_ticket` and record exactly what exists.
- [x] Apply version-aware checklist writes; re-read/reapply on conflict.
- [x] Stop and replan on deviation rather than redesigning silently.
- [x] Preserve report, traceability, PR footer, and one-stage move to Review.
- [x] State execute never merges and never starts another ticket.
- [x] Obey the packet stop condition and retain pause/release/resume rules.

## Review skill

- [x] Gather ticket timestamp, plan content/version, files/report/refs/groups, diff, current head, reviews/comments/checks, and actual unresolved-thread state.
- [x] Use `gh pr view --json headRefOid,...` and `gh pr diff` against the actual PR.
- [x] Read current `scratch/review` version before replacement.
- [x] Write exact MCP-024 review frontmatter by whole-file `set_ticket_doc(doc:"scratch/review")`.
- [x] Never use `append_scratch` for the attestation.
- [x] Record truthful reviewer identity and `independent` value.
- [x] Include every GitHub/reviewer/CI finding with stable ID, severity, summary, and disposition.
- [x] Require reasons/tickets for the corresponding dispositions.
- [x] Set `needs-changes` while blocker/major findings, relevant questions, conflicts, unmet docs, or non-green required checks remain.
- [x] Re-query head, checks, thread state, and PR state immediately before merge.
- [x] Treat any head/check/thread change as stale and rerun/replace review.
- [x] Require user or standing delegation before merge; no auto-merge.
- [x] Move exactly one stage to Verifying only after successful merge.
- [x] Leave the ticket in Review and update evidence if merge fails.
- [x] Do not delete old review assets; SKILL-015 owns deletion.

## Verify skill

- [x] Query PR `state` and `mergeCommit`; stop if not merged or commit missing.
- [x] Fetch objects without pulling/resetting/checking out mutable main.
- [x] Create a detached `.worktrees/verify-<id>-<merged_sha>` worktree at the exact full merge SHA.
- [x] Confirm detached HEAD, exact SHA, clean tree, and non-board/non-implementation path before running checks.
- [x] Run named plan/checklist/repository checks from the detached worktree only.
- [x] Record each attempt with exact timestamp, command/check, cwd, exit code, result, and summary.
- [x] Retain every failed/inconclusive attempt after reruns.
- [x] Read proof/version and replace whole-file proof with exact MCP-024 frontmatter.
- [x] Keep ticket Verifying on FAIL/INCONCLUSIVE; create/link remediation as needed.
- [x] Permit Done only on top-level PASS (or explicitly governed operator disposition, never implicit waiver).
- [x] Remove clean temporary verification worktree after evidence; report cleanup failure.
- [x] Confirm no checkout’s `main`, feature branch, implementation worktree, or board worktree changed.

## Rail and handoff

- [x] Add only narrow verifier assertions if existing rails cannot prove packet/review/detach rules.
- [x] Do not encode profiles or full record schemas in the verifier.
- [x] Run `npm run verify:skills`.
- [x] Run positive searches for packet, compatibility, head SHA, status checks, whole-file record, merge commit, detached worktree, PASS-only, and no-main mutation.
- [x] Run negative searches for append-only review and pull/update-main verification, inspecting context for harmless prohibition text.
- [x] Walk all listed source fixtures, including head change, red check, unresolved thread, unmerged PR, failed-then-passed proof, and unchanged main.
- [x] Confirm diff contains only the three skill files and optional targeted verifier.
- [x] Confirm no MCP/core/GUI/tool-reference/plugin/schema/profile/old-asset change.
- [ ] Open PR with `Kanmer: SKILL-021` and link CORE-035 as the pending integration proof.
- [ ] Stop at review readiness; do not merge or begin CORE-035.

## Progress notes

Append exact packet/refusal examples, status capability result, GitHub queries, record versions, fixture outcomes, and skill-verifier output here.


### Progress notes

- 2026-08-22T00:25:15+01:00 — Full packet, HZN-007/EPIC-009 context, HZN-004 unavailable context, MCP-023/MCP-024 dependencies, links/activity, and live gates reread before implementation. MCP-023 (PR #135, source 2cdd0c68) and MCP-024 (PR #134, source 0d2b7893) are merged dependencies; get_status reported compat.expectedProject=optional on plugin server 0.3.3.
- 2026-08-22T00:25:15+01:00 — Implemented only the three scoped phase skills on skill-021-packet-sha-skills. Commit df56503baafe3ef5a2e3fa78e2d9d3376495af12. No MCP/core/GUI/tool-reference/schema/profile/old-review-asset changes.
- 2026-08-22T00:25:15+01:00 — npm run verify:skills exit 0; git diff --check exit 0; positive packet/compat/head/whole-file/mergeCommit/detached/PASS checks passed; legacy unsafe-text negative searches returned zero matches. Static source fixture walkthrough for packet refusal/no writes, old-server token omission, execute PR stop, review head/check/thread staleness, unmerged verification, failed-then-passed attempt retention, and unchanged main passed.
- 2026-08-22T00:25:15+01:00 — npm run test:scripts first exited 1 because packages/core/dist/index.js was absent in the fresh worktree (ERR_MODULE_NOT_FOUND in auto-run-state.test.mjs and release-notes.test.mjs). npm run build:core exited 0; the exact test:scripts rerun exited 0 with 80/80 passing. The first failure is retained in the implementation report.
- 2026-08-22T00:25:15+01:00 — PR and Implementing→Review move remain pending; author will not self-review, merge, begin CORE-035, or clean up.
