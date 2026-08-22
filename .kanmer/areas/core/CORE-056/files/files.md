# Files — CORE-056 source refresh remediation

## Change map

| Path | Planned change | Proof / risk |
|---|---|---|
| packages/mcp-server/src/sources.ts | Serialize each cache read/fetch/revalidate/write transaction; account retained 304 bytes; reconstruct and retry missing direct links from the cached root. | Focused deterministic tests prove one refresh at a time, bounded returned/cache bytes, and recovery of a previously missing link. Existing redirect, DNS, credential, content-type, cache digest, and aggregate-read behavior stays intact. |
| packages/mcp-server/src/sources.test.mjs | Add exact regressions for concurrent refresh, 304 retained-byte accounting, and missing-link retry while retaining all existing assertions. | node --test source suite and authoritative test:http command with exit codes. |
| plugins/kanmer/mcp/kanmer-mcp.cjs | Regenerate the shipped standalone artifact from the ticket source after source changes. | Artifact contains the implementation; inherited normal-checkout bundle-provenance limitation remains explicitly reported and is not absorbed here. |
| packages/core/src/io.ts | Reuse existing withExclusiveFileLock/writeFileAtomic only; no intended source change. | Core lock contract is the governing synchronization seam and its current tests remain green. |

## Context files to read

| Context | Constraint |
|---|---|
| docs/functional/frd/FRD-027-project-declared-sources.md | Sources are bounded documentation preferences, with HTTPS/same-origin/depth/page/byte/cache requirements; no authority or unbounded crawl. |
| docs/architecture/adr/ADR-0020-project-declared-source-trust.md | Cache and fetched documents remain derived data; declarations do not grant trust or access. |
| CORE-044 research/files/plan/report and review scratch | Exact cumulative base, 21-finding dispositions, current PR threads, and explicit external boundaries. |
| packages/core/src/io.ts | Existing cross-process lock and atomic write primitive; preserve surfaced errors and stale-lock behavior. |
| packages/mcp-server/src/sources.ts | Existing canonical URL, redirect, DNS, content-type, validator, page/byte, and cache digest semantics to retain. |
| packages/mcp-server/package.json | sources.test.mjs is part of test:http and must remain authoritative. |

## Ripple effects and exclusions

The source helper affects fetch_source, cache freshness, plugin standalone output, and source rails. It does not alter board declarations, resolver selectors, remote exposure policy, DNS classifier, GUI/manual surfaces, board worktree ignore rules, or artifact path provenance. Those remain separate review findings/follow-up scope.

## Execution base

Branch from exact CORE-044 cumulative head 142af2f3b105b38b00d659019d1cfe99f3b50844, not origin/main. Use worktree .worktrees/core-056 and branch core-056-source-refresh.
