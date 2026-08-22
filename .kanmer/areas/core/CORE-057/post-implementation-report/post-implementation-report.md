# Post-implementation report — CORE-057

*Author report before merge; proof belongs to merged-main verification.*

## Summary

CORE-057 closes the two CORE-044 source-fetch review gaps: DNS preflight results are carried into the actual HTTPS request so production transport does not perform an independent native resolution, and DNS resolution is covered by the same bounded request deadline as redirects and response-body reads. Existing source trust, same-origin, redirect, cache, and byte-limit behavior remains covered.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/mcp-server/src/sources.ts` | Added signal-aware DNS preflight, a bounded resolver race, and production `https.request` transport with a validated-address lookup callback; threaded timeout/request seams through root and linked retrieval. | Prevent DNS rebinding between validation and request, and prevent a resolver from exceeding the request deadline. |
| `packages/mcp-server/src/sources.test.mjs` | Added validated-address transport-seam and resolver-timeout regressions; updated redirect lookup count for the single preflight per request. | Deterministically prove address binding/deadline behavior while preserving existing coverage. |

No dependency, governing-document, or unrelated provider/UI changes were made.

## Governing docs

- FRD-027 requires HTTPS, public-destination validation, same-origin redirect handling, bounded retrieval, and deterministic source retrieval. The production request uses the validated DNS address with the original hostname/SNI, and lookup/redirect/body work shares one AbortSignal deadline.
- ADR-0020 requires fail-closed remote-fetch boundaries and treats declarations as preferences rather than trust authority. Private/local resolved addresses still fail closed before transport; resolver failure and deadline errors surface to the caller.
- CORE-044 PR #165 cumulative head `142af2f3b105b38b00d659019d1cfe99f3b50844` is the parent lineage and remains otherwise untouched.

## Risks / follow-ups

The deterministic tests use injected lookup/request seams; no live DNS rebinding, private-network, Windows host, packaged-app, or external network proof was available, so those acceptance boundaries remain INCONCLUSIVE for `kanmer-verify`. The injected local junction used to resolve the ticket-local `@kanmer/core` was environment-only and is not tracked.

The normal workspace typecheck remains FAIL (exit 1) on pre-existing GUI dispatch/provider/core-export mismatches (`dispatchDeliverableProven`, `verifyDeliverable`, `antigravity`), and `plugin:check` remains FAIL (exit 1) because this linked worktree resolves `@kanmer/core` to the main checkout. These failures are preserved; ticket-local MCP typecheck/build passed.

## Verification hand-off

On merged `main`, run the focused source tests and the authoritative MCP HTTP rail, then run core/server build and typecheck. Confirm the plugin bundle and protocol smoke from a normal checkout. Preserve external/live DNS and Windows/package evidence as INCONCLUSIVE unless an actual controlled host proves it.

Recorded rails: focused source 16/16 PASS; core source/store 91/91 PASS; MCP HTTP 84/84 PASS; build:core, MCP typecheck, MCP build/standalone, scripts 88/88, protocol smoke 46/46, docs/manual, and diff-check PASS. Root all-workspace typecheck and linked-worktree plugin check failures are recorded above.
