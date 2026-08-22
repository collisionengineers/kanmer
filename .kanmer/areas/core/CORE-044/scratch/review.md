---
kind: review-attestation
pr: "165"
head_sha: "33f32e3aae9819f1c2344863272dacb5c958fbac"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "0054b4cf8d795d56"
ticket_updated: "2026-08-22T10:05:03.751Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Per-hop redirects"
    disposition: fixed
    reason: "Manual bounded redirects validate every Location and final response."
  - id: F-002
    severity: blocker
    summary: "set_sources board concurrency"
    disposition: fixed
    reason: "updateBoard rereads and mutates under the core board lock."
  - id: F-003
    severity: major
    summary: "Stale cache locks are not recovered"
    disposition: open
    reason: "withExclusiveFileLock retries EEXIST for about 2.2 seconds then rethrows; it never checks ownership/age or recovers a lock left by a crashed process. The plan explicitly requires bounded stale-lock recovery. Direct built-core fixture returned EEXIST after 2223 ms."
  - id: F-004
    severity: blocker
    summary: "Canonical MCP roster"
    disposition: fixed
    reason: "AGENTS, tool-reference, generated manual/plugin surfaces and synchronization checks agree."
  - id: F-005
    severity: major
    summary: "Aggregate byte accounting"
    disposition: fixed
    reason: "Streaming reads charge consumed bytes and cancel on over-budget reads."
  - id: F-006
    severity: blocker
    summary: "Root query credentials"
    disposition: fixed
    reason: "Shared schema rejects credentials, query, and fragment-bearing roots."
  - id: F-007
    severity: blocker
    summary: "Linked query credentials"
    disposition: fixed
    reason: "Query-bearing linked candidates are rejected before fetch/persistence."
  - id: F-008
    severity: major
    summary: "Root 304 linked freshness"
    disposition: fixed
    reason: "Root 304 revalidates retained linked documents and refreshes digest/timestamps."
  - id: F-009
    severity: blocker
    summary: "Non-global DNS destinations"
    disposition: open
    reason: "The preflight misses otherwise non-global IPv4 ranges such as 192.0.0/24, 192.0.2/24, 198.18/15, 198.51.100/24 and 203.0.113/24, plus all mapped equivalents. The plan requires private, link-local and otherwise non-global destinations to fail closed."
  - id: F-010
    severity: major
    summary: "Board cache leakage"
    disposition: fixed
    reason: "Source cache directory is ignored and reconciliation evidence is recorded."
  - id: F-011
    severity: minor
    summary: "Empty selectors"
    disposition: fixed
    reason: "Empty area/label arrays now match globally with core regression coverage."
  - id: F-012
    severity: minor
    summary: "Canonical URL identity"
    disposition: fixed
    reason: "Schema duplicate keys and fetch/cache identity normalize safe HTTPS URL spelling."
  - id: F-013
    severity: minor
    summary: "Redirect-relative links"
    disposition: fixed
    reason: "Validated final root URL is used as the markdown base."
  - id: F-014
    severity: minor
    summary: "Images consuming page budget"
    disposition: fixed
    reason: "Image syntax is excluded before the direct-page cap."
  - id: F-015
    severity: minor
    summary: "Fragment links"
    disposition: fixed
    reason: "Fragments are removed before same-origin checking and deduplication."
  - id: F-016
    severity: minor
    summary: "Unavailable-source guidance"
    disposition: fixed
    reason: "Research guidance records unknown/unavailable entries as skipped."
  - id: F-017
    severity: major
    summary: "Source test rail"
    disposition: fixed
    reason: "sources.test.mjs is registered in test:http; source rail is 12/12."
  - id: F-018
    severity: major
    summary: "Duplicated MCP schema"
    disposition: fixed
    reason: "set_sources uses the exported core SourceDeclarationArraySchema."
  - id: F-019
    severity: major
    summary: "Missing Content-Type"
    disposition: fixed
    reason: "Responses now require text/* or application/json."
  - id: F-020
    severity: minor
    summary: "GUI acceptance ambiguity"
    disposition: accepted-risk
    reason: "FRD/ADR preservation is documented; GUI source editing is explicitly out of scope and visual/package evidence is INCONCLUSIVE."
  - id: F-021
    severity: blocker
    summary: "Credential-bearing linked persistence"
    disposition: fixed
    reason: "Query-bearing links are rejected before fetch/cache persistence."
---
# Independent review — CORE-044

## Verdict

NEEDS-CHANGES. The exact stacked head is scoped and most of the 21-finding inventory is addressed, but F-003 and F-009 remain open merge-blocking findings.

## Packet and diff

I read the complete CORE-044 research, files, plan, checklist, open-questions, post-implementation report and execution scratch; HZN-007 context; FRD-027; ADR-0020; linked CORE-026 context; and the diff from b5ae6f36e007a05fffd9bb2f1c6ea4a87a860477 to 33f32e3aae9819f1c2344863272dacb5c958fbac. The 19-file diff is scoped to source schema/store, fetch/cache, MCP source tools/tests, docs/manual, skills, AGENTS/tool roster and generated artifacts. No unrelated GUI/provider implementation was found.

## Evidence

- PASS exit 0: core focused rail 91/91.
- PASS exit 0: focused MCP source rail 12/12.
- PASS as recorded: typecheck, core/server builds, scripts 88/88, protocol/discovery/headless smoke, docs/skills/managed-block/plugin synchronization and diff-check.
- The first wrong-workspace invocation, malformed 304 fixture, stale manual freshness attempt and full-test timeout outcomes remain preserved.
- Full npm test is INCONCLUSIVE, not PASS: corrected run was core 290/290 and GUI 382/382 but HTTP 78/80 due environment-sensitive project-resolution/tunnel readiness timeouts; targeted HTTP/readiness was 12/12.
- GitHub workflow lookup for commit 33f32e3aae9819f1c2344863272dacb5c958fbac returned no associated PR workflow runs. The PR currently has no unresolved review threads/comments, so there is no hosted verify/gate evidence to upgrade the local result.

## Required remediation

Implement bounded ownership-aware stale-lock recovery with regression coverage while retaining surfaced errors for live locks, and make the public-destination classifier reject the complete documented non-global IPv4/IPv6 space including mapped forms. Re-run focused and authoritative rails, update the report/checklist and this SHA-bound attestation, then request fresh independent review. No merge, move or cleanup was performed.
