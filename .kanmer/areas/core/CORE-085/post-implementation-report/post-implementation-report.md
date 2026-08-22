# Post-implementation report — CORE-085

*Author claim before independent review; proof remains post-merge work.*

## Summary

CORE-085 closes the two current CORE-081 review findings without changing the seven already-implemented source lifecycle protections. Cached validators are now scoped to the cached effective final redirect URL, so redirect traversal does not send them to intermediate same-origin targets. A forced caller that joins an active refresh now waits for it and performs its own forced refresh. Deterministic regressions cover both behaviors.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/mcp-server/src/sources.ts` | Added an optional cached effective URL to the existing fetch seam; conditional validators are sent only when the live URL matches that target. A forced caller now retries through the existing active-refresh path after an in-flight refresh completes. | Fixes review findings #3836700730 and #3836700726 while reusing the existing transport/cache coordination. |
| `packages/mcp-server/src/sources.test.mjs` | Added a multi-hop redirect regression asserting no validator on the root/intermediate requests and the validator only on the final request; added a deterministic fresh-cache/concurrent-force regression. | Proves the production fetch/cache behavior and prevents both findings from recurring. |

Implementation commit: `b2c51779a4ee0a5d95c8b3bce51cd4408490dc68`.

## Governing docs

- FRD-027 R5/R6: HTTPS same-origin redirects remain bounded, cached final URL/validator metadata is used only for the effective representation, and 304 revalidation remains validator-aware.
- ADR-0020: the source remains a bounded preference/cache surface; no authority, provider, credential, or network boundary is widened.
- No governing-document wording required modification; the existing FRD/ADR already state the applicable redirect, validator, 304, and bounded-cache contract.

## Risks / follow-ups

- CORE-081's seven prior findings and their exact failed/INCONCLUSIVE evidence remain inherited and unchanged.
- Live external source-provider/network behavior remains INCONCLUSIVE; deterministic fixtures make no hosted or credential claim.
- CORE-082 and CORE-083 remain separate linked CORE-026 remediations and were not changed.

## Verification hand-off

Run on merged `main`:

- `node --test packages/mcp-server/src/sources.test.mjs` — expected 26/26.
- `npm test -w @kanmer/core` — expected 303/303.
- `npm run typecheck -w @kanmer/mcp-server`, `npm run build:core`, and `npm run build:server`.
- `npm run test:scripts` and `git diff --check`.
- Preserve the external source/network boundary as INCONCLUSIVE unless real authorized evidence is available.

Recorded implementation evidence:

- Source tests: exit 0, 26/26 after `npm run build:server` exit 0.
- Core tests: exit 0, 303/303.
- MCP typecheck: exit 0.
- Core build: exit 0.
- Server build: exit 0.
- First fresh-worktree scripts run: exit 1, 86/88; exact failures were `auto-run-state` and `release-notes` because `packages/core/dist/index.js` was absent. After `npm run build:core` exit 0, scripts rerun exit 0, 88/88.
- `git diff --check`: exit 0.
- During test development, the first run of the two new regressions exited 1 on two fixture mistakes; assertions were corrected and the exact source suite then passed 26/26. This failed attempt is retained as part of the execution record.
