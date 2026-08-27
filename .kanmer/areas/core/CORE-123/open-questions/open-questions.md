# Open questions — CORE-123

None blocking. The ticket body fixes the strict-flag default (off for one release), the `SYNC_REQUIRED` semantics, the workflow triggers and the sync default; the decisions below are recorded so the plan does not silently assume them.

## Parked (explicitly deferred)

- [ ] Push-to-main `verify` run: included as a one-line trigger so every merge SHA gets a bound rail result; it costs one full rail (~14 min hosted) per merge. If runner minutes matter, the operator can remove `main` from `on.push.branches` — no code depends on it.
- [ ] `regate` job re-runs the `kanmer-gate` job of the latest workflow run for every open PR targeting `main` on each `kanmer-board` push (`gh run rerun --job`). It needs `permissions: actions: write`. If the repository restricts workflow permissions, the job logs and exits 0; the fallback remains `workflow_dispatch`.
- [ ] `expected_reviewers` / `threads_snapshot` are parsed and carried into the gate's `details` only; settlement rules belong to SKILL-037.
- [ ] Strict mode flip (removing the compatibility warnings) is a later release decision, not part of this ticket.
