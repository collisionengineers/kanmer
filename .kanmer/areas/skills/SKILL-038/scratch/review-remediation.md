## Exact-head automated review — F-013/F-014

At PR #304 head `0eece7d6eaa1272696095e84eee7e43397702729`, exact-head Codex review added two P2 findings and the fresh independent reviewer confirmed both are real majors:

- F-013, thread `PRRT_kwDOT2PEds6dkgjh`: evidence bootstrap accepts only `result: INCONCLUSIVE`, excluding canonical actual-red-command proof `result: FAIL` + `failure_class: inconclusive` before the evidence needed to earn `transient`.
- F-014, thread `PRRT_kwDOT2PEds6dkgjj`: the one permitted confirmed pre-mutation launch retry can increment `Transient` twice for one logical verifier attempt, consuming the later classified-transient slot.

Disposition: one bounded retry-state remediation. Accept `FAIL | INCONCLUSIVE` with exact `failure_class: inconclusive` plus all existing request/evidence obligations and retained failed attempt; reserve the durable count once per logical verifier attempt, reuse it for the single confirmed pre-mutation launch retry, never decrement/reset it, and dispatch nothing on unknown status. Mirror and mutation-pin both clauses.
