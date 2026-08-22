# CORE-046 post-implementation report

## Summary

CORE-046 closes the two independent CORE-045 review blockers and the additional F-009 destination-policy finding. Stale-lock recovery now transfers ownership through an atomic same-directory quarantine rename, and source fetching rejects the named non-global IPv6/IPv4 ranges before network access while proving lookup on every redirect and linked-page hop.

## Changed files

- packages/core/src/io.ts: replaced stale-lock unlink with exact-path atomic quarantine/rename, inode identity checks, and a test seam for deterministic coordination; bounded retries and callback cleanup remain unchanged.
- packages/core/src/io.test.ts: added the deterministic concurrent-reclaimer regression; all inherited rename, atomic-write, temp-file, and lock assertions remain present.
- packages/mcp-server/src/sources.ts: added 64:ff9b:1::/48, 100:0:0:1::/64, 5f00::/16, and 192.175.48.0/24 to the non-global classifier.
- packages/mcp-server/src/sources.test.mjs: added all new range fixtures and the redirect/linked-hop DNS lookup-count regression.
- plugins/kanmer/mcp/kanmer-mcp.cjs: regenerated from the server build; plugin byte/tool synchronization passes.

## Governing-doc alignment

- FRD-027 remains satisfied: bounded HTTPS, same-origin redirects, serialized cache writes, and fail-closed destination checks are preserved and tightened.
- ADR-0020 remains satisfied: no new source kind, authority grant, dependency, resolver, or host registration behavior was introduced.

## Verification

| Command | Exit | Result |
| --- | ---: | --- |
| npm run test -w @kanmer/core | 0 | 294/294 |
| npm run test -w @kanmer/core -- src/io.test.ts | 0 | 16/16 |
| node --test packages/mcp-server/src/sources.test.mjs | 0 | 14/14 |
| npm run test:http -w @kanmer/mcp-server | 0 | 82/82 |
| npm run test:scripts | 0 | 88/88 |
| npm run smoke:protocol | 0 | 46/46 |
| npm run smoke:discovery | 0 | 13/13 |
| npm run typecheck | 0 | all workspaces |
| npm run build:core; npm run build:server | 0 | core/server builds |
| npm run plugin:build; npm run plugin:check | 0 | 37 tools, bytes, manifests synchronized |
| npm run verify:docs; npm run verify:skills; npm run verify:agents-block | 0 | all checks pass |
| git diff --check | 0 | clean |

## Preserved first failures

- The first focused IO run exited 1 because the new race test timed out at Vitest's 5000 ms limit. The deterministic barrier was corrected; the rerun is 16/16.
- The first standalone server build exited 1 because the worktree resolved a stale root @kanmer/core artifact without current exports. An ignored local worktree junction to this worktree's packages/core restored package resolution; the rerun passed. No source or lockfile change was made for the environment setup.

## Risks and evidence limits

The quarantine rename and deterministic two-reclaimer test cover the reviewed path-TOCTOU. Live DNS rebinding between lookup and connection, PID reuse, and an exact process crash between quarantine and cleanup remain INCONCLUSIVE and are explicitly deferred to independent verification; no live-host evidence is claimed.

## Traceability

- Base: CORE-045 head 1234264b292e574d38f276b91592ea0b8bef9361
- Commit: 54651a3c
- Branch: core-046-lock-reclaim-race-ipv6
- Worktree: .worktrees/core-046
- PR: #167 (https://github.com/collisionengineers/kanmer/pull/167), base core-045-lock-dns-remediation

## Verify on merged main

Rerun the core IO suite, MCP source/HTTP rails, all-workspace typecheck/build/plugin checks, and inspect the merged PR head against CORE-045. Preserve the external DNS/PID/crash boundaries above as INCONCLUSIVE unless real evidence becomes available.
