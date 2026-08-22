# Post-implementation report — CORE-081

*Author claim before independent review; proof remains post-merge work.*

## Summary

CORE-081 hardens the seven remaining CORE-026 source transport/cache lifecycle findings at cumulative base `3a05ab7a21f55152a4f493169300ac9e622baab7`. The implementation is limited to the MCP source fetch/cache seam and deterministic source tests: same-origin manifest validators now survive redirects, abandoned response bodies are canceled, active refreshes are reused beyond the short lock retry, raw HTTPS requests explicitly request identity encoding, partial stream failures charge the aggregate budget, Markdown link collection stops at 32 pages, and uncached linked-page 304 responses are surfaced as failures. No external credentials, live source, or network capability is claimed.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/mcp-server/src/sources.ts` | Modified fetch redirect/header/body lifecycle, bounded link collection, partial-read accounting, active-refresh coordination, and fresh linked-page 304 handling. | Fixes findings #3836536172, #3836536170, #3836536166, #3836536177, #3836612410, #3836612417, and #3836612420 without changing the existing SSRF/DNS/canonical/atomic-cache contract. |
| `packages/mcp-server/src/sources.test.mjs` | Added deterministic regressions for all seven findings; expanded the refresh concurrency case beyond the former ~2.1-second lock retry. | Keeps every new boundary executable and preserves prior source assertions. |

## Governing docs

The existing linked `docs/functional/frd/FRD-027-project-declared-sources.md` and `docs/architecture/adr/ADR-0020-project-declared-source-trust.md` already state the applicable HTTPS/same-origin, 32-page, 2 MiB, validator, 304, serialization, and bounded-retrieval contract. No governing-doc edit was necessary.

## Risks / follow-ups

- CORE-082 remains responsible for PID-reuse and malformed-lock lifecycle findings; CORE-083 remains responsible for source/board orphan and ignore reconciliation findings. They are not changed here.
- The in-process active-refresh registry lets concurrent MCP callers wait for and reuse the completing result; the existing file lock and atomic cache write remain the cross-process persistence boundary.
- Live external source/network evidence remains INCONCLUSIVE and is intentionally not fabricated.
- The first build/typecheck attempt in this linked worktree exited 1 because the shared parent `node_modules` junction resolved an older generated `@kanmer/core` bundle without `SourceDeclarationArraySchema`, `withExclusiveFileLock`, `resolveSources`, and related exports. After refreshing the ignored generated core bundle from this exact worktree, reruns passed; the initial failure is preserved rather than erased.

## Verification hand-off

Independent review should inspect commit `13b6ce22a8363c0f467e96c775eb9a09891b7bb2` and PR #202, targeting `core-026-project-declared-sources`.

Recorded local evidence:

- `node --test packages/mcp-server/src/sources.test.mjs`: exit 0, 24/24.
- `npm test -w @kanmer/core`: exit 0, 303/303.
- `npm run typecheck -w @kanmer/core`: exit 0.
- `npm run typecheck -w @kanmer/mcp-server`: exit 0.
- `npm run build:core`: exit 0.
- `npm run build:server`: exit 0 (ESM and standalone).
- `npm run test:scripts`: exit 0, 88/88.
- `git diff --check`: exit 0.
- Initial stale-generated-core build/typecheck attempt: exit 1; exact inherited failure is retained above.

After merge, `kanmer-verify` should rerun the source test, core tests/typecheck, MCP typecheck/build, script rail, and authoritative verify on merged `main`. Post-merge proof is intentionally not written in this implementation report.
