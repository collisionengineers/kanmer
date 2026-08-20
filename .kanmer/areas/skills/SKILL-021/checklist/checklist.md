# Checklist — SKILL-021

## Dependency and contract check

- [ ] Confirm MCP-023 and MCP-024 are merged before editing the skills.
- [ ] Read the shipped packet output and canonical record schemas; copy final field names exactly.
- [ ] Confirm the live compatibility key spelling/value from `get_status`.

## Execute skill

- [ ] Make `get_execution_packet` the first ticket-specific data call.
- [ ] Stop on `ready:false` before take, Git, worktree, or writes; report reason/missing.
- [ ] Retain packet fingerprint, project identity, plan/checklist/files, group context, gates, commands hint, and stop condition.
- [ ] Sniff `get_status.compat.expectedProject` before sending `expected_project`; omit for unsupported old servers.
- [ ] Use only `.worktrees/<id-lowercase>` and never `.worktrees/kanmer`.
- [ ] Validate actual branch/worktree before `take_ticket` and record exactly what exists.
- [ ] Apply version-aware checklist writes; re-read/reapply on conflict.
- [ ] Stop and replan on deviation rather than redesigning silently.
- [ ] Preserve report, traceability, PR footer, and one-stage move to Review.
- [ ] State execute never merges and never starts another ticket.
- [ ] Obey the packet stop condition and retain pause/release/resume rules.

## Review skill

- [ ] Gather ticket timestamp, plan content/version, files/report/refs/groups, diff, current head, reviews/comments/checks, and actual unresolved-thread state.
- [ ] Use `gh pr view --json headRefOid,...` and `gh pr diff` against the actual PR.
- [ ] Read current `scratch/review` version before replacement.
- [ ] Write exact MCP-024 review frontmatter by whole-file `set_ticket_doc(doc:"scratch/review")`.
- [ ] Never use `append_scratch` for the attestation.
- [ ] Record truthful reviewer identity and `independent` value.
- [ ] Include every GitHub/reviewer/CI finding with stable ID, severity, summary, and disposition.
- [ ] Require reasons/tickets for the corresponding dispositions.
- [ ] Set `needs-changes` while blocker/major findings, relevant questions, conflicts, unmet docs, or non-green required checks remain.
- [ ] Re-query head, checks, thread state, and PR state immediately before merge.
- [ ] Treat any head/check/thread change as stale and rerun/replace review.
- [ ] Require user or standing delegation before merge; no auto-merge.
- [ ] Move exactly one stage to Verifying only after successful merge.
- [ ] Leave the ticket in Review and update evidence if merge fails.
- [ ] Do not delete old review assets; SKILL-015 owns deletion.

## Verify skill

- [ ] Query PR `state` and `mergeCommit`; stop if not merged or commit missing.
- [ ] Fetch objects without pulling/resetting/checking out mutable main.
- [ ] Create a detached `.worktrees/verify-<id>-<merged_sha>` worktree at the exact full merge SHA.
- [ ] Confirm detached HEAD, exact SHA, clean tree, and non-board/non-implementation path before running checks.
- [ ] Run named plan/checklist/repository checks from the detached worktree only.
- [ ] Record each attempt with exact timestamp, command/check, cwd, exit code, result, and summary.
- [ ] Retain every failed/inconclusive attempt after reruns.
- [ ] Read proof/version and replace whole-file proof with exact MCP-024 frontmatter.
- [ ] Keep ticket Verifying on FAIL/INCONCLUSIVE; create/link remediation as needed.
- [ ] Permit Done only on top-level PASS (or explicitly governed operator disposition, never implicit waiver).
- [ ] Remove clean temporary verification worktree after evidence; report cleanup failure.
- [ ] Confirm no checkout’s `main`, feature branch, implementation worktree, or board worktree changed.

## Rail and handoff

- [ ] Add only narrow verifier assertions if existing rails cannot prove packet/review/detach rules.
- [ ] Do not encode profiles or full record schemas in the verifier.
- [ ] Run `npm run verify:skills`.
- [ ] Run positive searches for packet, compatibility, head SHA, status checks, whole-file record, merge commit, detached worktree, PASS-only, and no-main mutation.
- [ ] Run negative searches for append-only review and pull/update-main verification, inspecting context for harmless prohibition text.
- [ ] Walk all listed source fixtures, including head change, red check, unresolved thread, unmerged PR, failed-then-passed proof, and unchanged main.
- [ ] Confirm diff contains only the three skill files and optional targeted verifier.
- [ ] Confirm no MCP/core/GUI/tool-reference/plugin/schema/profile/old-asset change.
- [ ] Open PR with `Kanmer: SKILL-021` and link CORE-035 as the pending integration proof.
- [ ] Stop at review readiness; do not merge or begin CORE-035.

## Progress notes

Append exact packet/refusal examples, status capability result, GitHub queries, record versions, fixture outcomes, and skill-verifier output here.
