---
kind: review-attestation
pr: "163"
head_sha: "b5ae6f36e007a05fffd9bb2f1c6ea4a87a860477"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "9916aa9641b6a15d"
ticket_updated: "2026-08-22T09:09:14.004Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Redirect handling follows cross-origin hops before checking the final URL"
    disposition: open
    reason: "fetchText uses redirect follow and validates only response.url after the request chain. The FRD/ADR require same-origin redirects, so every Location must be validated before the next request. This is a true trust-boundary blocker and must prevent merge."
  - id: F-002
    severity: blocker
    summary: "set_sources can overwrite a concurrent board edit"
    disposition: open
    reason: "The handler reads a whole board, replaces sources, and calls setBoard without a content-version/CAS token. expected_project is only a project identity check, not a board revision guard. This violates the repository concurrency rule and must prevent merge."
  - id: F-003
    severity: blocker
    summary: "Source cache persistence is not atomic or cross-process coordinated"
    disposition: open
    reason: "writeCache uses direct writeFile and a process-local promise map, while core already provides atomic temp-and-rename writes. Independent MCP/GUI processes or termination can expose partial JSON or lose a result. FRD-027 promises serialized cache writes; this must prevent merge."
  - id: F-004
    severity: blocker
    summary: "The canonical AGENTS MCP roster remains stale"
    disposition: open
    reason: "AGENTS.md still says 31 tools and lists the old read/write/destructive rosters without get_sources, set_sources, or fetch_source, while the implementation and plugin reference expose 37 tools. The repository instructions require command/convention changes to update AGENTS.md in the same PR; this must prevent merge."
  - id: F-005
    severity: major
    summary: "Aggregate byte budget was previously enforced after linked downloads"
    disposition: fixed
    reason: "b5ae6f36 passes the remaining aggregate allowance into the streaming reader, cancels over-budget responses, and adds the two-chunk regression. The source suite is 7/7 PASS."
  - id: F-006
    severity: blocker
    summary: "Declared llms-txt URLs may persist query credentials"
    disposition: open
    reason: "The URL validator rejects userinfo and fragments but allows search parameters. set_sources persists a URL such as token=secret in board.yml and fetch/cache metadata. This contradicts the no-credentials boundary and must prevent merge."
  - id: F-007
    severity: minor
    summary: "Root 304 can keep linked documents stale indefinitely"
    disposition: accepted-risk
    reason: "The first release explicitly bounds cache retention to 24 hours and validates the root manifest; independently validating every linked page on a root 304 is not stated as a separate acceptance check. The stale-linked-page risk is real but bounded and is recorded for follow-up."
  - id: F-008
    severity: minor
    summary: "Fetched source cache files are included under board synchronization"
    disposition: accepted-risk
    reason: "FRD-027 and ADR-0020 explicitly place bounded cached text and metadata below .kanmer/data; no requirement says these derived cache files must be ignored. The bounded 2 MiB project-local cache is intentional, although repository history/privacy tradeoffs remain."
  - id: F-009
    severity: blocker
    summary: "Remote fetch_source can read arbitrary HTTPS destinations"
    disposition: open
    reason: "remoteHttpToolNames excludes only dispatch tools, so authenticated remote HTTP exposes fetch_source. A bearer can declare an internal HTTPS address and retrieve it because no loopback/link-local/private-destination policy is applied. This is an SSRF blocker and must prevent merge."
  - id: F-010
    severity: minor
    summary: "Empty selector arrays do not implement the documented global selector"
    disposition: open
    reason: "SourceSelectorSchema accepts areas: [] or labels: [], but selectorMatches treats present empty arrays as truthy and matches nothing. FRD-027 says an empty selector is global; this is an in-scope correctness fix."
  - id: F-011
    severity: minor
    summary: "Equivalent llms-txt URL spellings are not canonicalized for duplicate detection"
    disposition: open
    reason: "SourceDeclarationArraySchema keys raw kind:id strings, so host-case or URL-normalization variants can duplicate one fetch identity. The duplicate declaration guarantee and shared cache identity require canonical URL keys."
  - id: F-012
    severity: minor
    summary: "Relative links are resolved against the declared URL after a root path redirect"
    disposition: open
    reason: "fetchText checks response.url but discards it; markdownLinks still uses the declared root as base. A same-origin redirect from /llms.txt to /docs/llms.txt therefore resolves guide.md incorrectly. This is an in-scope bounded-fetch correctness fix."
  - id: F-013
    severity: minor
    summary: "Markdown image destinations consume the direct-page budget"
    disposition: open
    reason: "markdownLinks accepts the optional image marker and slices candidates before content-type filtering. Thirty-two image references can starve documentation links, contrary to the direct documentation-page budget."
  - id: F-014
    severity: major
    summary: "The source-fetch regression suite is absent from the authoritative test rail"
    disposition: open
    reason: "Root npm test delegates MCP tests to the explicit test:http file list, which omits src/sources.test.mjs, and verify.mjs does not add it. The seven source regressions can therefore regress while hosted verify remains green; the mandatory rail must include them."
  - id: F-015
    severity: minor
    summary: "Fragment-bearing documentation links are discarded instead of normalized"
    disposition: open
    reason: "markdownLinks rejects resolved.hash before clearing it, so guide.md#setup is omitted even though the underlying same-origin page is valid. This is a bounded-fetch correctness gap."
  - id: F-016
    severity: minor
    summary: "Research guidance does not tell agents to skip unavailable declarations"
    disposition: open
    reason: "get_sources returns unknown and unavailable declarations, but kanmer-research says to use applicable declarations as inputs without restricting use to availability: available. FRD-027 requires unavailable entries to be reported and skipped before general search."
  - id: F-017
    severity: major
    summary: "MCP duplicates the core source declaration schema"
    disposition: open
    reason: "sourceDeclarationInput recreates kind/id/selector/priority and omits core selector length constraints before the handler reparses with SourceDeclarationArraySchema. Runtime rejection is safe, but the published tool contract can drift from the core authority, violating the single-contract rule."
  - id: F-018
    severity: major
    summary: "Responses without Content-Type bypass the advertised content check"
    disposition: open
    reason: "fetchText rejects unsupported types only when a header is present; a missing header accepts arbitrary bytes as decoded text. FRD-027 requires content type checks, so missing or unsupported types must be surfaced."
  - id: F-019
    severity: minor
    summary: "The FRD describes a GUI source configuration/confirmation surface that is absent"
    disposition: accepted-risk
    reason: "The implementation plan explicitly defers GUI source editing and discovery to a future ticket, while the FRD includes GUI preservation/configuration language. The MCP set_sources surface is intentionally in scope here; this is a documented scope deviation requiring follow-up before claiming the full GUI acceptance criterion."
  - id: F-020
    severity: blocker
    summary: "Linked URLs with query credentials are persisted in cache and diagnostics"
    disposition: open
    reason: "markdownLinks accepts guide.md?token=secret and cache documents/failure messages retain the complete URL. Even if root query URLs are later rejected, linked credentials remain a disclosure path. This must prevent merge."
  - id: F-021
    severity: major
    summary: "Failed oversized linked downloads do not charge consumed bytes"
    disposition: open
    reason: "When a linked reader exceeds its remaining budget, fetchText throws and the catch leaves bytes unchanged, so each subsequent candidate receives the same allowance. A manifest with many oversized links can still transfer roughly 64 MiB; the aggregate network budget remains unenforced on failure paths."
---
# Independent review — CORE-026

## Verdict

NEEDS-CHANGES. I re-gathered the live PR #163 head, all 21 unresolved Codex review threads (including outdated threads), current reviews/comments, the complete ticket packet, FRD-027, ADR-0020, HZN-007 context, and the b5 diff. F-005 is fixed by b5; F-007, F-008, and F-019 are explicitly accepted bounded/scope risks. The remaining P1/P2 findings are substantive and no merge is safe until the blocker/major items are fixed or converted into linked remediation tickets and re-reviewed.

## Live PR and hosted evidence

- Current PR: #163, base main, head b5ae6f36e007a05fffd9bb2f1c6ea4a87a860477, open and unmerged.
- Hosted run 32564155523 is green: verify job 97010200322 PASS and kanmer-gate job 97010200239 PASS.
- The earlier aggregate-budget thread was outdated at the current head and is dispositioned fixed; the earlier 34-versus-37 smoke failure remains preserved in the post-implementation report.

## Thread audit

- F-001 / PRRT_kwDOT2PEds6bXxBz / comment 3835667021 — open blocker: redirect chain trust boundary.
- F-002 / PRRT_kwDOT2PEds6bXxB2 / comment 3835667024 — open blocker: board CAS.
- F-003 / PRRT_kwDOT2PEds6bXxB4 / comment 3835667026 — open blocker: atomic cache writes.
- F-004 / PRRT_kwDOT2PEds6bXxB5 / comment 3835667028 — open blocker: AGENTS roster.
- F-005 / PRRT_kwDOT2PEds6bXxB6 / comment 3835667029 — fixed in b5: streaming aggregate bound.
- F-006 / PRRT_kwDOT2PEds6bXxB7 / comment 3835667030 — open blocker: root query credentials.
- F-007 / PRRT_kwDOT2PEds6bXxB8 / comment 3835667031 — accepted risk: linked revalidation is not a separate first-release check, bounded by the documented cache policy.
- F-008 / PRRT_kwDOT2PEds6bXxB9 / comment 3835667032 — accepted risk: project-local bounded cache persistence is specified by FRD/ADR.
- F-009 / PRRT_kwDOT2PEds6bXxB- / comment 3835667033 — open blocker: remote SSRF.
- F-010 / PRRT_kwDOT2PEds6bXxB_ / comment 3835667035 — open minor: empty selector semantics.
- F-011 / PRRT_kwDOT2PEds6bXxCB / comment 3835667037 — open minor: canonical URL duplicate identity.
- F-012 / comment 3835679108 — open minor: redirected-root relative link base.
- F-013 / comment 3835679111 — open minor: image links consume page budget.
- F-014 / comment 3835679113 — open major: source tests omitted from mandatory rail.
- F-015 / comment 3835679116 — open minor: fragment links discarded.
- F-016 / comment 3835679118 — open minor: unavailable sources not explicitly skipped in skill guidance.
- F-017 / comment 3835679120 — open major: duplicate MCP/core schema.
- F-018 / comment 3835679122 — open major: missing content type accepted.
- F-019 / comment 3835679125 — accepted risk: GUI source surface explicitly deferred by plan, but FRD wording requires follow-up.
- F-020 / comment 3835696321 — open blocker: linked query credentials.
- F-021 / comment 3835696322 — open major: failed oversized downloads do not consume aggregate budget.

## Local evidence

- PASS (exit 0): b5 source regressions, 7/7.
- PASS (exit 0): npm run test:http -w @kanmer/mcp-server, 68/68; note this confirms the omission in F-014 because the source suite is not in that command.
- PASS (exit 0): npm run build:core and npm run build:server.
- PASS (exit 0): npm run smoke:protocol, 46/46.
- PASS (exit 0): npm run typecheck.
- PASS (exit 0): npm run plugin:check, check:manual, verify:docs, verify:skills, and git diff --check.
- PASS behavior check: temporary-board fetch_source for a valid declared HTTPS source reached the expected unavailable-network Error: fetch failed rather than a resolver-schema error.
- External connected-provider/plugin, live external llms.txt, packaged-update, and GUI visual evidence remain INCONCLUSIVE.

## Scope and residual risk

The implementation's core/MCP source contract, bounded cache, generated plugin, skills, and governing docs are materially in scope. No merge, move, cleanup, or source changes were performed. The accepted-risk items are explicitly named above; open blocker/major findings remain merge-blocking.
