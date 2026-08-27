# Open questions — CORE-115

None blocking. Scope decisions taken under the operator's delegation of routine scope calls (auto run 20260827T133106Z-claude-code), recorded so the plan does not silently assume them.

- **Batch mode split out.** Research shows FRD-030 batch mode (AC4, AC5) depends on the lease contract only through the `WORKSPACE_OCCUPIED` rule and is otherwise its own record/membership/cleanup feature. Recommendation, adopted: this ticket delivers leases + migration + recovery (AC1–AC3, both edge cases); [[CORE-124]] "Add deliberate batch workspaces on top of renewable leases" delivers AC4/AC5, is blocked by CORE-115 and blocks SKILL-036. This is a scope sequencing call, not a product-direction change: the FRD is unchanged and both halves land in HZN-008.
- **Reclaim stays on `transfer`.** No new `reclaim` action or tool: `transfer` gains evidence collection at the MCP boundary and records the summary; the roster stays at 38 and the installed skills' `transfer` contract keeps working.
- **Renewal token.** A lease-local `lease_revision` counter is the renewal revision (precise, unaffected by document writes); `expected_revision` (CORE-114 document-inclusive) remains accepted on every action in addition. Stale `lease_revision` → `Conflict:` (`REVISION_CONFLICT`); non-current `lease_id` → `LEASE_EXPIRED`.
- **Legacy migration is lazy.** `migrate_board` keeps its "never touches item files" rule; a legacy claim is read as a lease with the CORE-121 derived expiry and gets its full record on the first lease mutation. One rule, one function (`leaseState`).
- **Lock scope.** One board-wide `.kanmer/leases.lock` (gitignored on the board branch) rather than per-ticket locks, because acquisition scans sibling tickets for workspace occupancy.

## Parked (explicitly deferred)

- [ ] Should `force` on `take` be removed once every skill uses transfer? Kept unchanged here (FRD-016 R1 surfaces it); `force` never bypasses `WORKSPACE_OCCUPIED`.
- [ ] GUI lease badge (heartbeat/expiry) — after GUI-144.
- [ ] Mandatory `lease_id` on renew for legacy-lease tickets — only after the installed skills are rolled forward.
