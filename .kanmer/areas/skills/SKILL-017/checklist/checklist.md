# Checklist — SKILL-017

## Audit

- [ ] Read full auto skill and every referenced asset.
- [ ] Extract all continue/stop/done/retry/fallback/role statements.
- [ ] Compare with SKILL-016/020/021 and FRD-023.
- [ ] Remove contradictory/unbounded instructions.
- [ ] Preserve correct lane cap/gates/worktree rules.

## Controller loop

- [ ] Read live ticket/links/taken/docs/gates before assignment.
- [ ] Persist assignment before dispatch.
- [ ] Give worker exact role/scope/packet/Stop condition.
- [ ] Return every result/timeout to controller.
- [ ] Re-read live board/Git/PR evidence.
- [ ] Compare actual changes with scope/checklist.
- [ ] Persist reconciliation before next action.
- [ ] Stop dispatch while state is uncertain.

## Mandatory stop predicates

- [ ] Wrong project/capability.
- [ ] Unhealthy/unknown board worktree for required action.
- [ ] Durable-state write/readback failure.
- [ ] Unresolved non-parked questions.
- [ ] Missing required governing/pipeline doc.
- [ ] Materially stale approved plan/version.
- [ ] Live dependency.
- [ ] Ticket occupied by another actor.
- [ ] Branch/worktree mismatch.
- [ ] Plan deviation/ambiguity/destructive/security/secret risk.
- [ ] Required command/environment unavailable.
- [ ] Failed test/verification.
- [ ] Unknown PR/check/merge state.
- [ ] Plan `## Stop condition` reached.
- [ ] Operator target/time/budget/cancel boundary.
- [ ] No safe ready work.
- [ ] True run completion.

## Persisted hand-off

- [ ] Choose correct paused/blocked/completed/aborted status.
- [ ] Record exact predicate and affected tickets.
- [ ] Record observed stage/gates/doc versions/worker/attempt/evidence.
- [ ] Record remaining roster.
- [ ] Record one deterministic resume action.
- [ ] Append stop event.
- [ ] Write/readback full record then pointer.
- [ ] Never claim durable hand-off after persistence failure.

## Completion definitions

- [ ] Worker end means assigned Stop condition only.
- [ ] Ticket finish requires live target evidence.
- [ ] Run completion requires all selected non-skipped targets.
- [ ] No active/waiting lane at completion.
- [ ] Preserve blocked/skipped reasons.
- [ ] Ignore unsupported “done” text without evidence.

## Serial fallback

- [ ] Persist `lane_limit: 1` and reason/event.
- [ ] Preserve same order/gates/controller loop/state cadence.
- [ ] Preserve take/worktree/packet/stop rules.
- [ ] Permit one active/uncertain ticket only.
- [ ] Reconcile/persist before next ticket.
- [ ] Do not pre-take future tickets.
- [ ] Enter any adopted role explicitly.
- [ ] Return to controller after role Stop condition.
- [ ] Do not self-review implementation.
- [ ] Stop for missing independent review/verifier.
- [ ] Do not waive merge-SHA proof.

## Dispatch failures

- [ ] Distinguish definite pre-mutation failure from unknown status.
- [ ] Permit at most one transient pre-mutation launch retry.
- [ ] Re-read live state before retry.
- [ ] Stop conflicting dispatch when status unknown.
- [ ] Never auto-retry failed implementation/test commands.
- [ ] Never use force takeover.

## Phase boundaries

- [ ] Use profile/gates for preparation.
- [ ] Use execution packet/checklist/ticket worktree for execute.
- [ ] Keep execute no-merge boundary.
- [ ] Require current-head independent review/checks.
- [ ] Verify only confirmed merge SHA.
- [ ] Move done only with live proof/questions gates.
- [ ] Use Kanmer, never direct board-file edits.

## Validation

- [ ] Add all exact required skill sections.
- [ ] Reference one SKILL-016 state template.
- [ ] Add positive/negative prose validator assertions.
- [ ] Run parallel-versus-serial equivalence scenario.
- [ ] Run every distinct stop scenario.
- [ ] Prove safe one-retry case.
- [ ] Prove unknown worker blocks dispatch.
- [ ] Prove no-reviewer/no-verifier hand-offs.
- [ ] Prove worker “done” cannot complete run alone.
- [ ] Prove resume follows persisted action.
- [ ] Run `npm run verify:skills`.
- [ ] Run root tests/typecheck/verify.
- [ ] Run `git diff --check` and inspect status.
- [ ] Record evidence in post-implementation report.
- [ ] Stop before merge.
