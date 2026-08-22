# CORE-046 files

## Files to change

| File | Change | Risk / proof |
| --- | --- | --- |
| 'packages/core/src/io.ts' | Replace stale-lock path unlink with unique same-directory atomic quarantine/rename; preserve legacy PID parsing, stale age/dead-owner checks, bounded retries, and callback cleanup. | Concurrency and Windows filesystem semantics; deterministic injected race test plus full inherited IO suite. |
| 'packages/core/src/io.test.ts' | Append a deterministic concurrent-reclaimer test and retain every existing rename, atomic-write, temp-file, and lock assertion. | Test must prove a losing reclaimer cannot remove the winner's newly claimed lock. |
| 'packages/mcp-server/src/sources.ts' | Extend the existing IPv6 non-global classifier for 64:ff9b:1::/48, 100:0:0:1::/64, and 5f00::/16. | Network safety; source tests must fail closed before fetch for representative in-range addresses. |
| 'packages/mcp-server/src/sources.test.mjs' | Add deterministic fixtures for each new IPv6 range while preserving mapped and prior special-use fixtures. | Prevent regression or accidental narrowing of the destination policy. |
| 'plugins/kanmer/mcp/kanmer-mcp.cjs' | Regenerate the committed standalone plugin artifact if the server build changes it. | Byte-sync/plugin checks must remain green. |

## Context files

| File | Why it matters |
| --- | --- |
| 'docs/functional/frd/FRD-027-project-declared-sources.md' | Bounded HTTPS/same-origin retrieval, cache serialization, and destination safety contract. |
| 'docs/architecture/adr/ADR-0020-project-declared-source-trust.md' | Security boundary: declarations are preferences, not authority or permission. |
| 'packages/core/src/io.ts' | Existing atomic write, exclusive claim, stale metadata, and retry implementation to extend. |
| 'packages/core/src/io.test.ts' | Inherited assertions that must not be deleted or weakened. |
| 'packages/mcp-server/src/sources.ts' | Existing parser, mapped IPv4 handling, DNS lookup seam, and redirect checks. |
| 'packages/mcp-server/src/sources.test.mjs' | Existing deterministic destination, cache, redirect, and aggregate-budget fixtures. |
| 'AGENTS.md' | No swallowed concurrency errors, no deleted assertions, and exact exit-code evidence. |

## Ripple effects

The core lock helper is consumed by cache writes and other serialized file updates; its public behavior remains bounded and fail-closed. The source classifier is used at the URL and DNS-resolution boundary, so the new ranges reject before 'fetch'. A server build changes the standalone plugin artifact, which must stay synchronized.

## Explicitly out of scope

No new source kinds, DNS resolver, dependency, cache policy, redirect behavior, GUI/provider work, or changes to CORE-044/CORE-045. Live DNS rebinding between lookup and connect, PID reuse, and exact process-crash timing remain environmental limits and are not fabricated as proven by deterministic unit tests.
