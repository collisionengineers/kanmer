## Exact-head automated review — F-013/F-014

At PR #304 head `0eece7d6eaa1272696095e84eee7e43397702729`, exact-head Codex review added two P2 findings and the fresh independent reviewer confirmed both are real majors:

- F-013, thread `PRRT_kwDOT2PEds6dkgjh`: evidence bootstrap accepts only `result: INCONCLUSIVE`, excluding canonical actual-red-command proof `result: FAIL` + `failure_class: inconclusive` before the evidence needed to earn `transient`.
- F-014, thread `PRRT_kwDOT2PEds6dkgjj`: the one permitted confirmed pre-mutation launch retry can increment `Transient` twice for one logical verifier attempt, consuming the later classified-transient slot.

Disposition: one bounded retry-state remediation. Accept `FAIL | INCONCLUSIVE` with exact `failure_class: inconclusive` plus all existing request/evidence obligations and retained failed attempt; reserve the durable count once per logical verifier attempt, reuse it for the single confirmed pre-mutation launch retry, never decrement/reset it, and dispatch nothing on unknown status. Mirror and mutation-pin both clauses.

## Exact-head independent delta review — F-015

At pushed head `d10e79d1ac506e2e3b81a219a7c6749e670d45d9`, the independent reviewer found one major changed-line contradiction: the final prose says exactly two logical verification *attempts*, while `transient_retry_limit` is configurable and the operator may raise it. That literal cap makes values above 2 ineffective.

Disposition: fixed in the same retry-state remediation. The invariant is exactly two authorization paths, not two total executions. Bootstrap is the one evidence-establishing path; the classified-transient path may admit another fresh independent logical attempt only while durable budget remains. Every admitted attempt reserves one count, and raising the limit adds classified-path capacity without adding a third path. Mirror and mutation-pin the distinction.
