# Open questions — SKILL-016

## Resolved decisions

- **Where is durable state stored?** In the explicitly targeted group's free-form docs: `automation/current.md` plus `automation/runs/<run-id>.md`.
- **Can `kanmer-auto` run without a group?** No. Stop before dispatch rather than create hidden board-wide or arbitrary first-ticket state.
- **Does run state satisfy ticket gates?** No. It is operational group context only.
- **Who writes the run record?** The single controller. Workers mutate/report through normal ticket/Git/PR contracts; this ticket does not add distributed locking.
- **What if another controller owns a `running` current run?** Stop and report it. Do not overwrite or force takeover without operator direction.
- **What identifies the project?** Store the `get_status.project.fingerprint` when supported; on older servers record roots/server compatibility and do not send unsupported tokens.
- **What is authoritative after restart?** Live ticket/docs/links/taken/activity/PR state. Reconcile the ledger; never replay a mutation merely because state says pending.
- **When is state written?** Before first dispatch, after assignment/result/mutation, before wait/stop, after reconciliation, and at completion/abort.
- **Does a new run overwrite history?** No. It writes a new run path and updates only the current pointer.
- **What statuses are allowed?** `running`, `paused`, `blocked`, `completed`, `aborted`.
- **What does completed mean?** Every selected non-skipped ticket reached the declared target boundary and no lane remains active/waiting.
- **Can this add leases or automatic merging?** No.
- **Is plugin bundle regeneration needed?** No for skill/template-only changes; run `verify:skills`.

No unresolved implementation questions remain.
