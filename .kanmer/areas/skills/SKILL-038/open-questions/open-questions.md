# Open questions — SKILL-038

Nothing here blocks planning or implementation. The one genuinely operator-owned
choice is parked below with a recommendation, and the recommendation is
implemented as the default so no lane waits on it.

## Parked (explicitly deferred)

- **What number bounds `transient` re-runs per ticket per run?** The ticket
  requires "a numeric bound", not a specific number, and how many re-runs a
  flaky rail deserves before an operator looks at it is an operating-cost
  judgement that belongs to the operator, not to this agent.

  **Recommendation, implemented as the default: `transient_retry_limit: 2`.**
  Two re-runs is the smallest number that can still discharge the horizon's own
  documented flake-evidence rule — that rule requires a same-SHA re-run before
  `transient` may be claimed at all, so a limit of 1 would spend the whole
  budget proving the first classification and leave nothing for a genuinely
  flaky second check. It is recorded in the run record's frontmatter, so an
  operator raises it explicitly, per run, without editing the skill.

  Verbatim, for the report: *"What number bounds `transient` re-runs per ticket
  per run? Recommendation: `transient_retry_limit: 2`, recorded in the run
  record, raised explicitly by the operator when a rail genuinely needs more."*
