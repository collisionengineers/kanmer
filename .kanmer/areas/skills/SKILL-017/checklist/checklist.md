# Checklist — SKILL-017

## Audit

- [x] Read full auto skill and every referenced asset.
- [x] Extract all continue/stop/done/retry/fallback/role statements.
- [x] Compare with SKILL-016/020/021 and FRD-023.
- [x] Remove contradictory/unbounded instructions.
- [x] Preserve correct lane cap/gates/worktree rules.

## Controller loop

- [x] Read live ticket/links/taken/docs/gates before assignment.
- [x] Persist assignment before dispatch.
- [x] Give worker exact role/scope/packet/Stop condition.
- [x] Return every result/timeout to controller.
- [x] Re-read live board/Git/PR evidence.
- [x] Compare actual changes with scope/checklist.
- [x] Persist reconciliation before next action.
- [x] Stop dispatch while state is uncertain.

## Mandatory stop predicates

- [x] Wrong project/capability.
- [x] Unhealthy/unknown board worktree for required action.
- [x] Durable-state write/readback failure.
- [x] Unresolved non-parked questions.
- [x] Missing required governing/pipeline doc.
- [x] Materially stale approved plan/version.
- [x] Live dependency.
- [x] Ticket occupied by another actor.
- [x] Branch/worktree mismatch.
- [x] Plan deviation/ambiguity/destructive/security/secret risk.
- [x] Required command/environment unavailable.
- [x] Failed test/verification.
- [x] Unknown PR/check/merge state.
- [x] Plan `## Stop condition` reached.
- [x] Operator target/time/budget/cancel boundary.
- [x] No safe ready work.
- [x] True run completion.

## Persisted hand-off

- [x] Choose correct paused/blocked/completed/aborted status.
- [x] Record exact predicate and affected tickets.
- [x] Record observed stage/gates/doc versions/worker/attempt/evidence.
- [x] Record remaining roster.
- [x] Record one deterministic resume action.
- [x] Append stop event.
- [x] Write/readback full record then pointer.
- [x] Never claim durable hand-off after persistence failure.

## Completion definitions

- [x] Worker end means assigned Stop condition only.
- [x] Ticket finish requires live target evidence.
- [x] Run completion requires all selected non-skipped targets.
- [x] No active/waiting lane at completion.
- [x] Preserve blocked/skipped reasons.
- [x] Ignore unsupported “done” text without evidence.

## Serial fallback

- [x] Persist `lane_limit: 1` and reason/event.
- [x] Preserve same order/gates/controller loop/state cadence.
- [x] Preserve take/worktree/packet/stop rules.
- [x] Permit one active/uncertain ticket only.
- [x] Reconcile/persist before next ticket.
- [x] Do not pre-take future tickets.
- [x] Enter any adopted role explicitly.
- [x] Return to controller after role Stop condition.
- [x] Do not self-review implementation.
- [x] Stop for missing independent review/verifier.
- [x] Do not waive merge-SHA proof.

## Dispatch failures

- [x] Distinguish definite pre-mutation failure from unknown status.
- [x] Permit at most one transient pre-mutation launch retry.
- [x] Re-read live state before retry.
- [x] Stop conflicting dispatch when status unknown.
- [x] Never auto-retry failed implementation/test commands.
- [x] Never use force takeover.

## Phase boundaries

- [x] Use profile/gates for preparation.
- [x] Use execution packet/checklist/ticket worktree for execute.
- [x] Keep execute no-merge boundary.
- [x] Require current-head independent review/checks.
- [x] Verify only confirmed merge SHA.
- [x] Move done only with live proof/questions gates.
- [x] Use Kanmer, never direct board-file edits.

## Validation

- [x] Add all exact required skill sections.
- [x] Reference one SKILL-016 state template.
- [x] Add positive/negative prose validator assertions.
- [x] Run parallel-versus-serial equivalence scenario.
- [ ] Run every distinct stop scenario.
- [ ] Prove safe one-retry case.
- [ ] Prove unknown worker blocks dispatch.
- [ ] Prove no-reviewer/no-verifier hand-offs.
- [ ] Prove worker “done” cannot complete run alone.
- [x] Prove resume follows persisted action.
- [x] Run `npm run verify:skills`.
- [ ] Run root tests/typecheck/verify.
- [x] Run `git diff --check` and inspect status.
- [x] Record evidence in post-implementation report.
- [x] Stop before merge.

- 2026-08-22 — Full packet/dependency audit completed: current auto skill, both run-state assets, SKILL-016 durable-state, SKILL-020 gates-first, SKILL-021 packet/SHA boundaries, FRD-023, and related phase/tool contracts read. Source scope is auto stopping/reconciliation/serial fallback plus canonical prose validator/tests; no bundle or MCP changes.
- 2026-08-22 — Disposable scenario EPIC-013 with SKILL-029/030/031 (varied fix/chore/spike profiles and backlog/preparing/implementing stages) read through list_items/get_doc_gates. State was written/read back before dispatch, then lane_limit: 1 and parallel-unavailable were persisted before a serial result reconciliation; pointer paused on an operator-only question. Group and tickets were archived after readback; no active scenario records remain.
