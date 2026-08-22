# GUI-118 plan

1. Reproduce each current-head finding against the production caller and identify the existing lifecycle lock/state seam.
2. Make branch preference persistence transactional with successful rename, serialize open/preferences/Connect with sync lifecycles, and preserve provider errors/handoff warnings through Retry.
3. Mark native provider reconnect state on observed handoff and persist it at the correct user-scoped boundary; verify staged native descriptors carry the branch.
4. Add deterministic regressions, run GUI/typecheck/build/docs/scripts/diff rails, update CORE-043 packet, and stop at Review.

Governing refs: FRD-020, FRD-012, ADR-0016. Live native/provider/protection evidence remains INCONCLUSIVE.
