# CORE-046 post-implementation report

## Summary

CORE-046 closes the two independent CORE-045 review blockers and the additional F-009 destination-policy finding. Stale-lock recovery now transfers ownership through an atomic same-directory quarantine rename, and source fetching rejects the named non-global IPv6/IPv4 ranges before network access while proving lookup on every redirect and linked-page hop. CORE-047 was independently reviewed and merged into the CORE-046 branch; CORE-049 is the bounded follow-up that routes quarantine renames through the existing Windows retry contract and is now under independent review.

## Cumulative child remediation

- CORE-047 source head `67e2be792e8480d29df7ff13128fb8c7886056a9` was independently reviewed PASS and merged by PR #169 into `core-046-lock-reclaim-race-ipv6` as merge commit `0f7ccc4efad0aeae2295f3ba08e0b6e886356679`.
- CORE-047 preserves tokenized owner leases, token-aware double-sweep release, active-owner quarantine retention, the third-claimant regression, inherited source/DNS behavior, and the regenerated plugin artifact.
- CORE-049 implementation commit `8edfede9` on `core-049-quarantine-rename-retry` routes the injected quarantine rename seam through `renameWithRetry` and adds deterministic `EPERM`/`EBUSY`/`EACCES` coverage. It is not included as a merged CORE-046 commit until its PR is independently reviewed and merged.
- The live Windows handle/crash/PID-reuse/process-termination boundaries remain explicitly INCONCLUSIVE.

## Changed files

- packages/core/src/io.ts: replaced stale-lock unlink with exact-path atomic quarantine/rename, inode identity checks, and a test seam for deterministic coordination; CORE-049 now applies the existing bounded retry contract to quarantine renames.
- packages/core/src/io.test.ts: added the deterministic concurrent-reclaimer regression, retained all inherited rename/atomic-write/temp-file/lock assertions, and added transient quarantine rename coverage for all three Windows codes.
- packages/mcp-server/src/sources.ts: added 64:ff9b:1::/48, 100:0:0:1::/64, 5f00::/16, and 192.175.48.0/24 to the non-global classifier.
- packages/mcp-server/src/sources.test.mjs: added all new range fixtures and the redirect/linked-hop DNS lookup-count regression.
- plugins/kanmer/mcp/kanmer-mcp.cjs: regenerated from the server build; plugin byte/tool synchronization passes.

## Governing-doc alignment

- FRD-027 remains satisfied: bounded HTTPS, same-origin redirects, serialized cache writes, and fail-closed destination checks are preserved and tightened.
- ADR-0020 remains satisfied: no new source kind, authority grant, dependency, resolver, or host registration behavior was introduced.

## Verification

| Command | Exit | Result |
| --- | ---: | --- |
| npm run test -w @kanmer/core | 0 | 294/294 on CORE-046; CORE-047 cumulative head 296/296; CORE-049 head 297/297 |
| npm run test -w @kanmer/core -- src/io.test.ts | 0 | 16/16 on CORE-046; 18/18 on CORE-047; 19/19 on CORE-049 |
| npm run test -w @kanmer/core -- src/io.test.ts src/sources.test.ts src/store.test.ts | 0 | 110/110 on CORE-049 |
| node --test packages/mcp-server/src/sources.test.mjs | 0 | 14/14 |
| npm run test:http -w @kanmer/mcp-server | 1 | 81/82 twice; unchanged readiness fixture timed out under the broad concurrent rail; isolated readiness rerun 7/7 |
| npm run test:scripts | 0 | 88/88 (inherited CORE-046 evidence) |
| npm run smoke:protocol | 0 | 46/46 (inherited CORE-046 evidence) |
| npm run smoke:discovery | 0 | 13/13 (inherited CORE-046 evidence) |
| npm run typecheck | 0 | all workspaces on CORE-049 |
| npm run build:core; npm run build:server | 0 | core/server builds on CORE-049 after worktree-local package resolution |
| npm run plugin:build; npm run plugin:check | 0 | 37 tools, bytes, manifests synchronized |
| npm run verify:docs; npm run verify:skills; npm run verify:agents-block | 0 | all checks pass (inherited CORE-046 evidence) |
| git diff --check | 0 | clean |

## Preserved first failures

- CORE-046 first focused IO run timed out; the deterministic barrier was corrected and the rerun passed 16/16.
- CORE-046 first standalone server build resolved a stale root @kanmer/core artifact; an ignored local worktree junction restored package resolution and the rerun passed.
- CORE-049 first plugin build reproduced the stale ancestor package-resolution failure; the worktree-local junction was applied without source or lockfile changes and the rerun plugin build/check passed.
- CORE-049 broad HTTP first and second runs each recorded the unchanged readiness timeout at `src/tunnels/readiness.test.mjs:54`; isolated readiness passed 7/7. No readiness assertion was weakened.

## Risks and evidence limits

The quarantine rename and deterministic concurrent-reclaimer tests cover the reviewed path-TOCTOU and bounded transient retry contract. Live DNS rebinding between lookup and connection, PID reuse, exact process crash timing, and genuine Windows handle contention remain INCONCLUSIVE and are explicitly deferred; no live-host evidence is claimed.

## Traceability

- Original base: CORE-045 head `1234264b292e574d38f276b91592ea0b8bef9361`.
- CORE-046 implementation commit: `54651a3c77b8ca8d02d9d309e36baf9b62ebca3c`.
- CORE-047 source head: `67e2be792e8480d29df7ff13128fb8c7886056a9`; merged commit: `0f7ccc4efad0aeae2295f3ba08e0b6e886356679`; PR #169.
- CORE-049 follow-up commit: `8edfede9`; branch `core-049-quarantine-rename-retry`; PR pending independent review.
- CORE-046 branch/worktree: `core-046-lock-reclaim-race-ipv6` / `.worktrees/core-046`.
- CORE-049 branch/worktree: `core-049-quarantine-rename-retry` / `.worktrees/core-049`.
- Existing PR #167 remains the original CORE-046 implementation PR.

## Verify on merged main

Rerun the CORE-049 IO suite including all transient rename cases, the full core/source/HTTP rails, all-workspace typecheck/build/plugin checks, and inspect the merged CORE-046 cumulative head against CORE-045. Preserve the external DNS/PID/crash/Windows-handle boundaries above as INCONCLUSIVE unless real evidence becomes available.

## CORE-049 PR traceability update (2026-08-22)

The pending child remediation is now PR #171: https://github.com/collisionengineers/kanmer/pull/171, head `8edfede9bdb663171601cb326a67bd03792065e2`, based on merged cumulative head `0f7ccc4efad0aeae2295f3ba08e0b6e886356679`. This supersedes the earlier “PR pending” wording above. CORE-049 remains unmerged and requires independent review before it can be added to the merged commit list.
