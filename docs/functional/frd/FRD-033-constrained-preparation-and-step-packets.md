---
status: draft
---

# FRD-033 — Constrained preparation and step packets

**Implements:** PRD-002 requirement 6.

## Behaviour

Non-trivial work has two evidence layers: shared group research for architecture,
domain rules, provider behaviour, terminology, common constraints and repeated
evidence; and ticket impact research for the exact production path, files,
symbols, callers, failure cases, affected tests/contracts, active-work conflicts
and source versions. Deep research remains conditional rather than ceremonial.

A constrained-worker plan states its observable outcome, non-goals, evidence
versions, current production path, required state/scenario table where relevant,
affected files/symbols, ordered checkable steps, acceptance mapping, complexity
budget, rollback/deletion approach and exact stop condition. Each step names its
preconditions, exact change, preserved behaviour, negative cases, tests,
commands, done condition and deviation stop. Validation rejects or flags
unresolved vague instructions unless the sentence resolves the exact decision,
file, caller, error or test.

The approved plan compiles into a versioned step packet containing project,
ticket/batch/workspace, plan and step identity, allowed files/symbols, required
and forbidden behaviour, negative cases, tests, commands, expected output and
stop/deviation conditions. A worker returns after one bounded step; the
controller reconciles actual changes and evidence before dispatching another.

## Acceptance criteria

1. A non-trivial ticket cannot enter unattended execution without current
   required evidence, a concrete plan, resolved/parked questions, known workspace
   policy/target and executable or explicitly manual acceptance checks.
2. Plan validation identifies unresolved vague language and missing
   risk-sensitive evidence for state, migration, service, runtime, public
   contract, security and release work.
3. A generated packet limits a worker to its allowed files and symbols and
   records its exact tests, outputs and stop condition.
4. A controller detects forbidden-file changes, stale document versions and
   plan deviation before another step advances.

## Edge cases

- Obvious wording or trivial local edits do not receive invented deep-research
  debt.
- A packet refusal leaves board stage, claim and workspace unchanged.
