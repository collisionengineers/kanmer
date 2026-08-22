# CORE-088 plan

1. Inspect the exact cumulative source/cache and orphan implementations and preserve existing successful rails.
2. Add fail-closed cache-directory/document validation with bounded reads and origin checks; retain stale diagnostics and force semantics; persist replacement validators after 304.
3. Make pinned DNS compatible with Node all-mode callbacks while keeping HTTPS/public-destination policy fail closed.
4. Guard orphan cleanup with the existing lock and a fresh source-tree fingerprint comparison; preserve both trees on mismatch.
5. Add focused deterministic tests, run core/MCP/GUI/typecheck/build/script/plugin/diff rails as applicable, update CORE-026 evidence, and stop at Review.

Governing refs: FRD-027-project-declared-sources.md and ADR-0020-project-declared-source-trust.md. Live provider/network and packaged Windows evidence remain INCONCLUSIVE unless directly exercised.
