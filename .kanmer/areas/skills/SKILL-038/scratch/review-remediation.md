## Exact-head automated review — F-013/F-014

At PR #304 head `0eece7d6eaa1272696095e84eee7e43397702729`, exact-head Codex review added two P2 findings and the fresh independent reviewer confirmed both are real majors:

- F-013, thread `PRRT_kwDOT2PEds6dkgjh`: evidence bootstrap accepts only `result: INCONCLUSIVE`, excluding canonical actual-red-command proof `result: FAIL` + `failure_class: inconclusive` before the evidence needed to earn `transient`.
- F-014, thread `PRRT_kwDOT2PEds6dkgjj`: the one permitted confirmed pre-mutation launch retry can increment `Transient` twice for one logical verifier attempt, consuming the later classified-transient slot.

Disposition: one bounded retry-state remediation. Accept `FAIL | INCONCLUSIVE` with exact `failure_class: inconclusive` plus all existing request/evidence obligations and retained failed attempt; reserve the durable count once per logical verifier attempt, reuse it for the single confirmed pre-mutation launch retry, never decrement/reset it, and dispatch nothing on unknown status. Mirror and mutation-pin both clauses.

## Exact-head independent delta review — F-015

At pushed head `d10e79d1ac506e2e3b81a219a7c6749e670d45d9`, the independent reviewer found one major changed-line contradiction: the final prose says exactly two logical verification *attempts*, while `transient_retry_limit` is configurable and the operator may raise it. That literal cap makes values above 2 ineffective.

Disposition: fixed in the same retry-state remediation. The invariant is exactly two authorization paths, not two total executions. Bootstrap is the one evidence-establishing path; the classified-transient path may admit another fresh independent logical attempt only while durable budget remains. Every admitted attempt reserves one count, and raising the limit adds classified-path capacity without adding a third path. Mirror and mutation-pin the distinction.

## Settled exact-head review — F-016–F-021

At head `1d319fd86e9f5ab74684fe6d9d46538b01a0ad20`, settled Codex review and the fresh independent delta reviewer confirmed six current P2 findings as majors:

- F-016 `PRRT_kwDOT2PEds6dkrTM`: a frozen roster re-reads dependency state but does not reapply safety closures when it changes.
- F-017 `PRRT_kwDOT2PEds6dkrTV`: a member already at the requested target is dependency-filtered before target satisfaction.
- F-018 `PRRT_kwDOT2PEds6dkrTX`: terminal legacy close → successor creation → pointer switch is not restart-safe.
- F-019 `PRRT_kwDOT2PEds6dkx-7`: an expired claim is transferred before the member survives dependency/target feasibility.
- F-020 `PRRT_kwDOT2PEds6dkx-9`: implicit fresh selection can expand a legacy frozen roster during schema handoff.
- F-021 `PRRT_kwDOT2PEds6dkx-_`: a retained blocker's later terminal non-success is not propagated downstream.

Disposition: one consolidated controller-state remediation. Keep frozen membership while continuously revalidating live eligibility, defer claim mutation until assignment, propagate terminal blocker failure, and make legacy succession deterministic, roster-preserving by default and restart-safe. No new ticket, stage, engine or package scope.
