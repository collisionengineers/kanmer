---
kind: review-attestation
pr: "163"
head_sha: "b5ae6f36e007a05fffd9bb2f1c6ea4a87a860477"
verdict: pass
reviewer: "gui099-executor"
independent: true
plan_hash: "9916aa9641b6a15d"
ticket_updated: "2026-08-22T09:09:14.004Z"
findings:
  - id: F-001
    severity: blocker
    summary: "fetch_source previously validated an enriched ResolvedSource against the strict declaration schema"
    disposition: fixed
    reason: "b5ae6f36 projects only declaration fields before strict validation; the resolver metadata is not parsed as declaration input. The enriched-declaration regression passes and a temporary-board fetch_source call reaches the expected network fetch failure rather than reporting unrecognized resolver keys."
  - id: F-002
    severity: major
    summary: "llms.txt aggregate byte policy was previously enforced after linked responses were downloaded"
    disposition: fixed
    reason: "b5ae6f36 passes the remaining aggregate budget into the streaming reader, cancels an over-budget response while consuming it, and records the bounded failure. The two-chunk over-budget network regression passes."
  - id: F-003
    severity: minor
    summary: "Research packet previously named superseded FRD-026 and ADR-0019"
    disposition: fixed
    reason: "Current research readback explicitly reconciles all governing-document references to FRD-027 and ADR-0020; the ticket refs, plan, report, FRD, and ADR also use the current numbers. FRD-026 remains the unrelated OpenAI Secure MCP Tunnel document."
---
# Independent review — CORE-026

## Verdict

PASS. Fresh head b5ae6f36 resolves all findings from the prior independent review. The source declaration schema/resolver boundary remains strict and correctly separates declaration fields from resolver metadata. The llms.txt reader now enforces the aggregate byte budget while consuming linked response chunks, preserving the bounded same-origin/depth/page policy. The packet's governing-document traceability is current.

## Hosted evidence

- PASS: GitHub Actions run 32564155523 for b5ae6f36; verify job 97010200322 PASS and kanmer-gate job 97010200239 PASS.
- Preserved prior hosted failure: run 32563585675 failed verify because smoke.mjs still expected 34 tools while the server exposed 37; commit 8eff8482 corrected that stale assertion. The b5 head's hosted run is green.
- The prior attestation at 8eff8482 is superseded by this SHA-bound attestation.

## Local evidence

- PASS (exit 0): `node --test packages/mcp-server/src/sources.test.mjs` — 7/7, including enriched resolver declaration validation and aggregate over-budget streaming coverage.
- PASS (exit 0): `npm run test:http -w @kanmer/mcp-server` — 68/68.
- PASS (exit 0): `npm run build:core` and `npm run build:server`.
- PASS (exit 0): `npm run smoke:protocol` — 46/46.
- PASS (exit 0): `npm run typecheck` — core, MCP server, UI, and GUI.
- PASS (exit 0): `npm run plugin:check`, `npm run check:manual`, `npm run verify:docs`, `npm run verify:skills`, and `git diff --check origin/main...b5ae6f36`.
- PASS behavior check: a temporary-board MCP `fetch_source` call for a valid declared HTTPS source reaches the unavailable network and returns the expected `Error: fetch failed`, with no resolver-metadata schema error.
- Earlier full rail preserved in the post-implementation report: `npm test` exit 0 (core 288/288, GUI 382/382, MCP HTTP 68/68, scripts 88/88); the b5-specific MCP source regressions and current HTTP rail were rerun above.

## Scope and external boundaries

The diff remains scoped to CORE-026's core/MCP source contract, bounded cache/fetch behavior, deterministic tests, generated standalone plugin bundle, smoke count, and governing/tool/skill documentation. No GUI/provider registration, installation/authentication, remote transport, or unrelated ticket changes were introduced.

Connected-provider/plugin availability, packaged-update behavior, live external llms.txt retrieval, and visual GUI evidence remain INCONCLUSIVE; no claim is made for those boundaries.

No merge, move, or cleanup was performed.
