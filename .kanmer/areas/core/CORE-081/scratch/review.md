test

## Independent review — NEEDS-CHANGES

- Reviewed SHA: `13b6ce22a8363c0f467e96c775eb9a09891b7bb2`
- Base: `3a05ab7a21f55152a4f493169300ac9e622baab7` (`core-026-project-declared-sources`)
- PR: #202
- Review date: 2026-08-22

### Evidence

- `node --test packages/mcp-server/src/sources.test.mjs` — exit 0, 24/24 passed.
- `git diff --check 3a05ab7a21f55152a4f493169300ac9e622baab7..13b6ce22a8363c0f467e96c775eb9a09891b7bb2` — exit 0.
- The packet's recorded core/server typecheck, builds, scripts (88/88), and aggregate source evidence were inspected; live external-provider/network behavior remains INCONCLUSIVE as documented.

### Required changes

1. **P2 — validator scope across redirects (automated finding #3836700730).** `fetchText` initializes `requestHeaders` with the cached manifest validators and carries them through every redirect hop. A same-origin intermediate redirect can evaluate the final document's `If-None-Match`/`If-Modified-Since` and return 304; the implementation then treats that as the cached representation's response before reaching the final target. Scope validators to the cached final URL: do not send them on redirect hops, and attach them only when requesting the final cached document (or otherwise prove the redirect chain cannot consume them).

2. **P2 — preserve concurrent `force` semantics (automated finding #3836700726).** `fetchLlmsTxt` joins any existing `activeRefreshes` promise before considering `options.force`. A normal fetch that is checking a fresh cache can therefore cause a concurrent `force: true` caller to receive the ordinary cached result without performing the promised forced revalidation. Check `options.force` before coalescing, or await the active request and then run a forced refresh; add a deterministic concurrency regression.

### Dispositions for the seven CORE-081 findings

- Same-origin manifest redirect validator handling: **NEEDS-CHANGES** — the two-hop validator bug above remains.
- Cancel response bodies on every early abandon: **PASS** — 24/24 includes the early-abandon cancellation regression.
- Wait/reuse active refresh beyond the short lock retry: **PASS** — deterministic concurrent refresh test passes.
- Explicit request identity/content encoding behavior: **PASS for the current documented identity contract** — `Accept-Encoding: identity` is asserted; no external compressed-provider claim made.
- Charge partial read failures to aggregate budget: **PASS** — deterministic partial-read test passes.
- Bound linked-page discovery at 32: **PASS** — hard page cap test passes.
- Surface uncached linked 304 and avoid empty cache writes: **PASS** — root/linked 304 tests pass.

### Scope / lineage

Diff is limited to `packages/mcp-server/src/sources.ts` and `packages/mcp-server/src/sources.test.mjs`; no unrelated changes found. No merge or Review→Verifying move performed. CORE-085 is the linked blocking remediation for these findings; CORE-081 remains open for remediation and independent re-review.

Review scratch integrity note: the initial `test` line was a transport probe before the attestation was appended; it is non-evidence and is superseded by the SHA-bound review below.

Additional command record: the packet-suggested `npm test -w @kanmer/mcp-server -- --run src/sources.test.mjs` was attempted and exited 1 because this workspace has no `test` script; the package's declared deterministic rail is `node --test src/sources.test.mjs`, which exited 0 with 24/24 passing. This does not alter the implementation verdict.

---
kind: review-attestation
pr: "202/204"
head_sha: "fcd998550714811edac99032ea7118f9b2084d38"
base_sha: "3a05ab7a21f55152a4f493169300ac9e622baab7"
verdict: needs-changes
reviewer: "codex-gui082-executor"
independent: true
plan_hash: "2e7bd28945cb88e7"
findings:
  - id: F-086
    severity: blocker
    disposition: needs-remediation-CORE-086
    reason: "Hosted PR #163 verify run 32591279782 fails mcpb:check: the built MCPB server differs from committed plugins/kanmer/mcp/kanmer-mcp.cjs after CORE-081/085 source changes. The committed runtime artifact must be regenerated and parity/authoritative rails rerun; do not weaken check-mcpb-sync."
  - id: CORE-081-F-001/F-007
    severity: major
    disposition: fixed-in-cumulative-stack
    reason: "The seven original CORE-081 lifecycle findings remain covered, and CORE-085 fixes #3836700730/#3836700726 in b2c51779, merged as fcd99855. Exact b2 source suite is 26/26."
  - id: external-network
    severity: accepted-risk
    disposition: accepted-risk
    reason: "Live provider/network behavior remains INCONCLUSIVE as documented."
---

## Fresh cumulative review — NEEDS-CHANGES

Reviewed exact cumulative target `fcd998550714811edac99032ea7118f9b2084d38` on `core-026-project-declared-sources`. The merge tree is identical to CORE-085 head `b2c51779a4ee0a5d95c8b3bce51cd4408490dc68`; merge parents are CORE-026 `3a05ab7a` and CORE-085 `b2c51779`. CORE-085's two automated findings are fixed and all seven original CORE-081 fixes remain present.

### Evidence

- Exact CORE-085 tree source rail (`.worktrees/core-085`, tree-equivalent to fcd): `node --test packages/mcp-server/src/sources.test.mjs` — exit 0, 26/26.
- Core rail on cumulative worktree: `npm test -w @kanmer/core` — exit 0, 303/303.
- `git diff --check 13b6ce22a8363c0f467e96c775eb9a09891b7bb2..fcd998550714811edac99032ea7118f9b2084d38` — exit 0; fcd and b2 trees compare equal.
- Hosted PR #163 run `32591279782`: `kanmer-gate` exit 1 because CORE-026 still has live blockers (CORE-081/082/083), plus its old parent attestation has invalid finding IDs; `verify` exit 1 at `scripts/check-mcpb-sync.mjs` with `Error: MCPB server differs from distributed plugin copy`.
- Local `npm run mcpb:check` could not execute the packaged parity check because the `@anthropic-ai/mcpb` CLI is absent (`MODULE_NOT_FOUND`), so local packaged-artifact evidence is INCONCLUSIVE.
- Local `npm run plugin:check` exit 1 because the shared node_modules resolves `@kanmer/core` from the main checkout instead of this linked worktree; this environment limitation is retained, not treated as a parity PASS.
- Current PR #163 comments are historical findings; no new inline comment was created after the fcd head. The hosted artifact failure is nevertheless a current blocker.

### Required blocker

**F-086 (blocker): regenerate the committed MCP plugin artifact.** The authoritative hosted verify on the exact cumulative head builds a server from the current sources and compares it to `plugins/kanmer/mcp/kanmer-mcp.cjs`; they differ after CORE-081/085. CORE-086 was created in Core, linked to CORE-081, and blocks CORE-081. It must regenerate the artifact from the exact cumulative tree and rerun `plugin:check`, `mcpb:check`, and `npm run verify`/hosted verification without weakening parity assertions.

### Dispositions

- CORE-081 original seven findings: **fixed-in-cumulative-stack**; body cancellation, active refresh reuse, identity encoding, partial-read accounting, link cap, uncached linked 304, and redirect validator retention remain exercised by the exact source suite.
- CORE-085 #3836700730: **fixed-in-cumulative-stack**; final-target-only conditional headers are covered by the multi-hop test.
- CORE-085 #3836700726: **fixed-in-cumulative-stack**; forced concurrent revalidation is covered by the deterministic concurrency test.
- External/live provider/network behavior: **accepted INCONCLUSIVE boundary**; no external claim made.
- MCP artifact parity F-086: **needs-changes**, filed as CORE-086 and linked/blocking.

### Verdict and state

NEEDS-CHANGES. No traceability update or Review→Verifying move was made for CORE-081; its existing block on CORE-026 remains. CORE-086 is the required artifact remediation. CORE-026 was not merged, verified, or closed.

Correction to the preceding verdict paragraph: after recording NEEDS-CHANGES, CORE-081 traceability was updated via MCP to commits `13b6ce22`, `b2c51779`, `fcd99855` and PRs `202`, `204`. Its `blocks: [CORE-026]` edge and Review stage were intentionally retained because CORE-086 remains blocking; no Review→Verifying move was made.
