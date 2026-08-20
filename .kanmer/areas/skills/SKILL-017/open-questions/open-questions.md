# Open questions — SKILL-017

## Resolved decisions

- **What is serial fallback?** The same controller algorithm with `lane_limit: 1`, not a different shortcut workflow.
- **Can one context implement, independently review, and verify the same change?** No. Where independence is required and unavailable, stop at the boundary with an explicit hand-off.
- **When does control return from a worker?** At the execution brief's Stop condition or any mandatory stop predicate; the controller then re-reads live state before choosing another action.
- **Does a worker's “done” message complete a ticket?** No. Live stage, documents, gates, PR/check state, and proof determine progress.
- **Can auto start the next ticket directly from the worker context?** No. Reconcile and persist through the controller first.
- **What if parallel dispatch is unavailable before work begins?** Persist `lane_limit: 1` and continue serially when the required role can be performed safely.
- **What if a worker launch may have succeeded but the response is lost?** Stop new dispatch, inspect taken/activity/Git/PR state, and resolve occupancy before proceeding.
- **Are retries allowed?** At most one launch retry for a proven transient transport failure with no mutation. Never automatically retry failed implementation/test commands.
- **Can auto force-take a ticket?** No, absent explicit operator instruction.
- **When is a run completed?** All selected non-skipped tickets meet the declared live target and no lane is active/waiting; otherwise use paused/blocked/aborted.
- **Must stop state be persisted?** Yes, before intentional stop when safe, with exact predicate and deterministic resume action.
- **Does this ticket change durable-state paths/schema?** No; consume SKILL-016's canonical group-doc format.
- **Is plugin bundle regeneration needed?** No for skill-only changes.

No unresolved implementation questions remain.
