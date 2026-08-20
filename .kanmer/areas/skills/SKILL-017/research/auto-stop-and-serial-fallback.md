# Research — SKILL-017 `kanmer-auto` stop contract and serial fallback

## Problem

An orchestrator skill needs two explicit contracts:

1. when it must stop rather than continue, declare success, or silently change scope;
2. what “serial fallback” means when parallel worker dispatch is unavailable.

Ambiguous prose commonly creates two unsafe behaviors: an unbounded “continue until everything is done” loop that crosses review/merge/verification boundaries, or a fallback that collapses implementer, reviewer, and verifier into one context and therefore removes independence without saying so.

## Governing model

`kanmer-auto` is a controller, not a pipeline exemption. Every ticket still follows its resolved profile, gate report, plan/checklist, take/worktree contract, PR/review boundary, exact-SHA verification, and proof requirements. The run's durable state from SKILL-016 records progress; it does not authorize work.

The controller advances **one safe action at a time** per lane. After each worker result it must re-read the ticket, dependencies, taken state, documents, and gates, reconcile durable state, and decide the next action. A worker's final text is not sufficient evidence that a stage or checklist is complete.

## Normal stop conditions

A run must stop or pause before further dispatch when any of these applies:

- project fingerprint/server capability or board-worktree health is wrong/unknown for a required write;
- durable run-state write/readback fails;
- selected ticket has unresolved non-parked questions;
- a required governing/pipeline document is absent or changed materially after approval;
- dependency is live, ticket is occupied by another actor, or worktree/branch conflicts;
- worker reports a deviation, ambiguous requirement, failed verification, destructive migration risk, security/secret issue, or inability to execute a required command;
- required GitHub/check/merge state cannot be established;
- the ticket reaches the execution brief's explicit Stop condition;
- no safe next action exists for any queued ticket;
- operator-specified target boundary, time/budget limit, or cancellation is reached;
- all selected tickets reach the run target (completed).

A stop must be persisted first when safe: run status, exact stop reason, affected ticket(s), evidence already obtained, remaining work, and one deterministic resume action. Never output a generic “blocked” without the failed predicate.

## Ticket versus run completion

A worker ending is not ticket completion. A ticket is complete for a lane only when the live board reaches the lane's declared target boundary and required artifacts are present. A run is complete only when every selected non-skipped ticket reaches the run target and no lane remains active/waiting.

The controller must not automatically begin another ticket from a worker context. It returns control to the controller, which reconciles state and selects the next item in the stored order.

## Serial fallback

Serial fallback means the same controller algorithm with `lane_limit: 1`:

- same ordered roster and gates-first readiness checks;
- same durable-state writes before/after action;
- same per-ticket branch/worktree/take contract;
- same execution packet and stop condition;
- one worker/role at a time;
- no parallel takes or hidden second task;
- no scope broadening merely to keep the model busy.

It is not permission for one context to impersonate every role. Role separation remains:

- preparation/planning may be performed serially by the controller when the plan skill authorizes it;
- implementation may run serially in a designated executor context;
- review requiring independence must use a different reviewer/context/actor from implementation;
- post-merge verification must use the exact merge SHA and must not be fabricated if no capable verifier/environment exists.

If the runtime cannot create a sufficiently independent review/verification context, serial fallback stops at the relevant boundary and records the required hand-off. It does not self-approve or waive evidence.

## Worker dispatch failure

If parallel dispatch is unavailable before any worker starts, set lane limit to one, persist the change/event, and continue serially. If a particular worker launch fails:

1. record the failed attempt;
2. re-read live ticket state;
3. retry at most once only for a clearly transient launch/transport failure with no mutation;
4. otherwise either run the same permitted role serially or stop with the exact missing capability.

Do not retry failed implementation/test commands automatically. Do not start a different ticket while an uncertain worker may still be running.

## Stage boundaries

- Do not move a ticket merely because a worker says it is ready; verify the required documents/report and use Kanmer gates.
- Do not merge from the execution phase.
- Do not proceed to verification until the PR is actually merged and merge SHA is known.
- Do not mark done until exact-SHA proof satisfies the live gate.
- Do not use `force` takeover as fallback.

## Verification scenarios

A disposable scenario should prove:

- parallel-capable run and lane-limit-one run produce the same ticket order and predicates;
- dispatch unavailable before start cleanly changes to serial and persists it;
- implementation stop condition returns to controller before next ticket;
- unresolved question, live blocker, occupied ticket, stale plan version, failed command, and state-write failure stop with distinct reasons;
- no independent reviewer causes a review-boundary hand-off, not self-approval;
- a worker launch with uncertain status prevents another dispatch;
- completion requires live target stages/artifacts, not worker claims;
- resumption continues exactly from recorded next action.

## Non-goals

- No automatic force takeover.
- No retries around failed tests/implementation.
- No self-review waiver.
- No new stages, leases, or run MCP tools.
- No automatic scope expansion.
- No claim that serial execution preserves independence when it does not.
