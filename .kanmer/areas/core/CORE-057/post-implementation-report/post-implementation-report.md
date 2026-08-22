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


## Post-conflict resolution refresh — 2026-08-22

PR #178 was updated by a non-squash merge of the current cumulative CORE-044 base 3c0706627cc73038d91a624e5d494d0148dce4c4 (CORE-056) into this ticket branch. The merge conflict in sources.ts was resolved by retaining both CORE-057 DNS-bound transport/deadline behavior and CORE-056 locked cache refresh/304 linked-document reconciliation. Final branch head is 5f63571ecc7d71c102fc134b72d065207b11eae9; PR #178 remains OPEN, MERGEABLE, and Review-only pending fresh independent review.

Post-sync deterministic evidence: node --test packages/mcp-server/src/sources.test.mjs = 19/19 PASS (exit 0); npm run test:http -w @kanmer/mcp-server = 87/87 PASS (exit 0); npm run build:core = 0; npm run build:server = 0; npm run typecheck = 0; npm run test:scripts = 88/88 PASS (exit 0); npm run smoke:protocol = 46/46 PASS (exit 0); npm run verify:docs = 0; git diff --check = 0. A normal-checkout rebuild from the exact merged tree produced standalone plugin SHA256 06110A9E0CA2007A51CC2AEDCDD0E2BD353B627484C184AADB709A52AF686878; plugin:check passed there with 37 tools and isolated handshake.

Preserved failure: the first attempted normal-checkout command was accidentally launched from the repository root; npm ci hit Windows EPERM unlinking node_modules/@rollup/rollup-win32-x64-msvc/rollup.win32-x64-msvc.node (exit 1), followed by missing-dependency build/plugin-check failures. It did not modify tracked root files; this is retained as an environment/setup failure, not a ticket PASS. Live DNS rebinding/private-network, Windows host/package, hosted CI, and external network evidence remain INCONCLUSIVE. Fresh independent review is required after this changed head; author will not review or merge.
