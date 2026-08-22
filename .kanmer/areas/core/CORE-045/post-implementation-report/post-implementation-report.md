# Post-implementation report — CORE-045 cumulative head

## Outcome

CORE-045 completes the stale-lock and DNS destination-policy remediation for CORE-044. Its child CORE-046 then incorporated the tokenized ownership protocol, bounded retry, source-range completion and all lock-security follow-ups; CORE-047/049/050 and the CORE-051/053 destination-policy chain are merged into this branch. The cumulative PR #166 is ready for fresh independent review before merge.

## Traceability

- CORE-045 implementation: `1234264b292e574d38f276b91592ea0b8bef9361`
- CORE-046 cumulative merge into this branch: `0f9af92ba7bf332a3fffbc49b3273bd71b59c49a` (PR #167)
- CORE-051 cumulative merge into this branch: `02389045b7d26ad46e470af1d96a3084b486bf68` (PR #173; child #174 merge `36b57a93`)
- PR #166 current head: `02389045b7d26ad46e470af1d96a3084b486bf68`
- Child lineage: CORE-047 `0f7ccc4e`, CORE-049 `311c6eef`, CORE-050 `31e572dc`, CORE-053 `36b57a93`; all independently reviewed/merged in the stack.

## Verification evidence

- Cumulative lock IO: 25/25; full core: 303/303; source: 14/14.
- Typecheck/build/plugin parity: PASS.
- Inherited broad HTTP remains 81/82 on readiness timing; isolated readiness 7/7. Live DNS rebinding, Windows handle/crash/PID evidence remains INCONCLUSIVE.
- No hosted run is attached to the stacked head; no external claim is fabricated.

## Review hand-off

Fresh independent review must validate the exact cumulative head and inherited source-policy evidence. After PASS, merge PR #166 independently; verify this ticket and its child chain on merged main before proof/closeout.

## CORE-051/053 remediation handoff

CORE-051 PR #173 final head `36b57a93` and child CORE-053 PR #174 merge `36b57a93` are merged into this branch at `02389045`. The chain narrows incorrect globally-reachable special-use predicates, preserves the 192.0.0.9/.10 exceptions, corrects `3fff::/20`, validates NAT64 embedded IPv4, retains public `2001:20::/28`, rejects `fec0::/10`, surfaces final claim errors, and composes claimant-marker cleanup failures. Deterministic IO/source/build/type/plugin/script rails pass; broad HTTP/live Windows-DNS evidence remains INCONCLUSIVE.
