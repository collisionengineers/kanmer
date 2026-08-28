# Open questions — SKILL-036

*The open questions. Not scratch — these **block** the ticket at three real
gates; scratch is a notepad and is never gated.*

Everything below that is answerable as an implementation choice has been
answered and ticked, with the answer recorded on its own bullet. One question is
genuinely operator-only and is parked, with its recommendation implemented as
the default so no lane is blocked.

- [x] **Does SKILL-036 formalise, extend or supersede `kanmer-auto`?** —
      **Extends, in place.** `kanmer-auto` already owns the durable run record,
      the status vocabulary, the reconciliation loop, the stop predicates and
      role independence, and `scripts/verify-skill-prose.mjs` checks 13/14/18
      assert that prose verbatim. A second orchestrator skill would duplicate
      ~90 % of it, collide on trigger description, and give two skills authority
      over one run record — the "silently fork it" defect. SKILL-036 adds the
      five FRD-034 scopes, the frozen roster, preflight, wider overlap
      detection, the escalation boundary and the operating-evidence rules.
      `EXPECTED_SKILLS` stays 12.
- [x] **Where does a non-group `/goal` run keep its durable record?** —
      In a **named run host group's** `automation/` folder, exactly as today.
      `set_group_doc` is the only durable non-ticket writer, so a ticket-, area-,
      list- or board-scoped run names the host group whose `automation/` owns the
      record. The frozen roster lives in `## Selection contract` and is
      **independent of that group's membership**, which is what makes "new
      tickets and captures cannot join a running roster" true by construction.
      This keeps `kanmer-auto`'s existing "no durable batch owner → stop before
      mutation" rule intact rather than contradicting it.
- [x] **FRD-034 says the controller merges; `kanmer-auto` says it never runs
      `gh pr merge`. Which wins?** — Both, read correctly: the controller
      **coordinates** the merge, the independent reviewer **executes** it. That
      is the live run's own invariant ("merges are performed by the independent
      reviewer under the operator's standing delegation") and the shipped check
      13 asserts the `gh pr merge` sentence verbatim. Trivial default taken; no
      operator input needed.
- [x] **Do Phase 12's extra verification routes need a fifth `failure_class`?**
      — No. Stale review, unavailable external service and owner-only decision
      are **controller routing** over the four classes `kanmer-verify` already
      defines (`implementation | plan | transient | inconclusive`). Adding a
      fifth would contradict SKILL-037's shipped table, which check 18 asserts
      row by row. Trivial default taken.
- [x] **`get_status.boardSync` does not exist on the installed v0.3.12 server —
      can the sync-before-gate rule reference it?** — Only as the candidate-server
      form. The rule is written as a git fact the stable server can produce
      today — compare the board worktree's `kanmer-board` tip with
      `origin/kanmer-board` using absolute paths — and names
      `get_status.boardSync` as the equivalent once the candidate is promoted.
      Verified by calling `get_status` on this board: `server.version 0.3.12`,
      no `boardSync` key. Otherwise the contract would be written but not usable,
      which is the failure this ticket exists to avoid.
- [x] **Should this ticket add any core/MCP surface?** — No. Every mechanism
      FRD-034 names already merged (CORE-114/115/116/117/118/121/123/124,
      SKILL-037). The change is skills prose plus `scripts/verify-skill-prose.mjs`
      checks, which also keeps it clear of the CORE-131 and CORE-128 lanes.

## Parked (explicitly deferred)

Everything below this heading is **not counted** by `questions-resolved`.

- [ ] **After `REMEDIATION_BUDGET_EXHAUSTED`, may the controller take Phase 12's
      "one automatic replan" (`review → preparing`) on its own authority, or
      must the lane block for the operator?**

      *Why it is operator-only.* This is an authority decision, not an
      implementation choice. `Store.backwardMoveEffects` gates only
      `review → implementing`; `review → preparing` is store-legal on a bare
      reason. So the controller *can* replan automatically — which means the
      only thing standing between "one bounded replan" and "a laundering route
      around the operator gate CORE-121 installed" is a policy the operator owns.
      `goal.md` PHASE 12 reads as though the replan is automatic ("return the
      ticket to Preparing; spawn one fresh planning/research subagent; revise the
      plan once; re-execute"). The shipped skills read the other way:
      `kanmer-auto` says a `REMEDIATION_BUDGET_EXHAUSTED` refusal "is an
      operator-only question, quoted verbatim, never a retry", and `kanmer-review`
      says "only an operator may re-open the loop". The live HZN-008 run followed
      the shipped reading — the GUI-144 lane parked on predicate 4/15 and waited
      for "operator authorised GUI-144 remediation round 2
      (remediation_budget 1→2)".

      *Recommendation, implemented as the default so nothing is blocked.*
      Preserve the shipped operator gate. The one automatic replan is available
      **before** the remediation budget is spent — it is the route the controller
      takes when a delta review's blocking finding is a **plan** defect rather
      than an implementation defect, and it is recorded once per ticket as
      `replan_used` in the run record. Once `REMEDIATION_BUDGET_EXHAUSTED` has
      actually been raised, the lane goes `blocked` with the exact refusal quoted
      and the controller never uses `review → preparing` to route around it.

      *Why it is safe to defer.* The conservative default is strictly more
      restrictive than either reading, so adopting the operator's answer later
      only ever loosens it; no work is blocked meanwhile, and the run record's
      `replan_used` field already carries the state the looser policy would need.

      *What would reopen it.* An operator decision that an unattended `/goal`
      must clear a budget-exhausted lane without a human, or a CORE-119
      golden-board scenario that cannot terminate under the conservative rule.
