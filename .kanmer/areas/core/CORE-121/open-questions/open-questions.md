# Open questions — CORE-121

None open. Decisions taken in research (recorded so the plan does not silently assume them):

- Legacy claims without `claim_expires_at` are treated as expired once `taken_at + claimExpiryMinutes` has passed (FRD-030 one-migration-path). Expiry never releases or deletes anything; it only makes `transfer` legal.
- Operator override is expressed as a `reason` beginning with `operator:` because v0.3.12 has no operator identity; SKILL-037 owns the conduct rule that agents never fabricate it.
- The Review → Implementing attestation check binds to `scratch/review.md` (`verdict: needs-changes`, `pr` ∈ `prs`), not to the live PR head, because core cannot query GitHub; live-head binding stays with the reviewer and CI (CORE-123).

## Parked (explicitly deferred)

- Heartbeat/renewal cadence configuration beyond a single `claimExpiryMinutes` — CORE-115.
- Surfacing claim expiry in the GUI — follow-up after GUI-144.
