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

---
kind: review-attestation
pr: "165"
head_sha: "142af2f3b105b38b00d659019d1cfe99f3b50844"
base_sha: "b5ae6f36e007a05fffd9bb2f1c6ea4a87a860477"
verdict: needs-changes
reviewer: "gui082-executor"
independent: true
---
# Independent review — CORE-044

## Verdict

NEEDS-CHANGES. I reviewed the complete refreshed CORE-044 packet, HZN-007 context, FRD-027, ADR-0020, the exact stacked diff from b5ae6f36 to 142af2f3, all 21 original finding dispositions, the generated/manual/workflow surfaces, and all current PR165 inline findings. The cumulative lock/DNS child commits address several earlier findings, but the current head still has merge-blocking cache, artifact, board-worktree, timeout, and DNS-rebinding gaps.

## Original 21-finding disposition audit

1. Per-hop redirects — FIXED; manual same-origin HTTPS redirects validate every Location and response URL.
2. set_sources board concurrency — FIXED; updateBoard rereads and mutates under the core board lock.
3. Cache atomicity — PARTIAL; atomic locked writes and stale-lock recovery are present, but the refresh transaction is not serialized (see current P1 below).
4. Canonical MCP roster — FIXED; 37-tool references and synchronization inputs agree.
5. Aggregate download accounting — FIXED for fresh reads; the 304 revalidation path still understates cached bytes (see P2 below).
6. Root credential-bearing query — FIXED by the shared schema.
7. Linked credential-bearing query — FIXED before fetch/cache persistence.
8. Root 304 linked freshness — PARTIAL; retained linked pages are revalidated, but missing links are not rediscovered/retried and 304 cached bytes are not charged.
9. Board Git cache leakage — PARTIAL; the source checkout ignore was added, but the canonical .worktrees/kanmer board worktree ignore is not updated.
10. Remote SSRF — PARTIAL; per-hop preflight rejects listed non-global results, but native fetch is not pinned to the validated DNS result, so rebinding remains possible.
11. Empty selector arrays — FIXED with shared core resolver semantics.
12. Canonical URL identity — FIXED for safe HTTPS duplicate/cache identity.
13. Redirect-relative links — FIXED using the validated final response URL.
14. Image page-budget consumption — FIXED by excluding image syntax before the cap.
15. Fragment links — FIXED by removing fragments before validation/deduplication.
16. Unavailable-source guidance — FIXED; unavailable/unknown declarations are recorded as skipped.
17. Source test rail — FIXED; sources.test.mjs is in test:http.
18. Duplicated MCP schema — FIXED; set_sources derives from the exported core schema.
19. Missing Content-Type — FIXED; only text/* and application/json are accepted.
20. GUI acceptance ambiguity — ACCEPTED RISK / OUT OF SCOPE; set_sources is the documented headless editor and GUI/setup preserves declarations. No GUI editor is claimed.
21. Credential-bearing linked persistence — FIXED before fetch, diagnostics, or cache.

## Current PR165 findings requiring remediation

- P1 DNS rebinding: assertPublicDestination performs a DNS preflight, then native fetch resolves independently. The current implementation does not bind the request to the validated address. The packet calls live rebinding INCONCLUSIVE, which is an honest evidence limit but not a PASS for this security claim; implement a pinned transport or narrow/document the contract and disposition the thread explicitly.
- P1 cache refresh transaction: writeCache locks only the final write. readCache, network refresh, and replacement computation happen before that lock, so two forced/expired fetches can race and the last writer can overwrite newer content/validators. Serialize the per-source read/fetch/write transaction or add version/CAS conflict handling.
- P2 root 304 aggregate budget: revalidateLinkedDocuments appends a cached document on 304 without adding its UTF-8 byte length to bytes. Subsequent network reads can therefore exceed the advertised 2 MiB aggregate limit. Charge retained cached bytes or enforce the final document-set budget.
- P2 missing linked-page retry: root 304 revalidation iterates only cached.documents. If a prior linked fetch failed and was omitted, the unchanged root is not reparsed and that link is never retried; the incomplete cache receives a refreshed TTL. Rediscover links from the cached root and retry missing candidates within the bounded policy.
- P2 board cache ignore: the diff adds .kanmer/data/sources/ to the source checkout .gitignore, but apps/gui/src/main/kanmerGit.ts still creates the board worktree ignore with only activity.jsonl and temp entries. syncBoard stages the board worktree's .kanmer, so canonical board caches can still be committed. Add the sources rule to existing and newly created board-worktree reconciliation and test it.
- P1 committed plugin bundle provenance: the exact head bundle contains ../../../../node_modules/... labels from the nested ticket worktree, while a normal checkout fresh build contains ../../node_modules/... labels. check-plugin-sync compares bytes, so the committed artifact is not reproducible from a normal checkout after merge. Rebuild/copy the bundle from a normal checkout and prove plugin:check there.
- P2 DNS timeout: the 10-second AbortController starts before fetch but assertPublicDestination awaits dnsLookup without a deadline or abort race. A slow resolver can hold fetch_source beyond the documented timeout. Bound DNS resolution within the same deadline.
- The hexadecimal IPv4-mapped IPv6 issue and stale-lock ownership/reclaim issue are FIXED by the current source and deterministic tests; they are not blockers in this review.

## Independent checks

- npm run test -w @kanmer/core -- src/io.test.ts src/sources.test.ts src/store.test.ts: exit 0, 116/116.
- npm run build:server: exit 0.
- node --test packages/mcp-server/src/sources.test.mjs: exit 0, 14/14 after the exact-head server build.
- npm run typecheck -w @kanmer/core: exit 0.
- npm run typecheck -w @kanmer/mcp-server: exit 0.
- npm run test:scripts: exit 0, 88/88.
- npm run verify:docs: exit 0.
- git diff --check: exit 0.
- PR hosted status currently reports no checks; no hosted PASS is claimed.

## External and parked boundaries

Live external llms.txt retrieval, DNS rebinding/private-network reachability, crash-at-exact-write proof, packaged update/install proof, GUI source-editor interaction, cache history migration, and a complete independent validator model for every linked page remain INCONCLUSIVE or explicitly parked per the packet. These limits are preserved and are not reclassified as PASS.

Do not merge PR #165 until the current findings receive fixes or explicit, governing-document-backed dispositions and fresh exact-head evidence.

---
kind: review-attestation
pr: "165"
head_sha: "5053af23b87fe591015b14042b920c4cf41259b4"
base_sha: "b5ae6f36e007a05fffd9bb2f1c6ea4a87a860477"
verdict: pass
reviewer: "codex-core044-final-review"
independent: true
plan_hash: "0054b4cf8d795d56"
ticket_updated: "2026-08-22T10:05:03.751Z"
---

# Independent cumulative review — PASS

Exact PR #165 head 5053af23b87fe591015b14042b920c4cf41259b4, base CORE-026 review head b5ae6f36e007a05fffd9bb2f1c6ea4a87a860477. The cumulative first-parent lineage includes CORE-045/051/053, CORE-056/057, and the CORE-058 chain through CORE-062..073 plus CORE-074/076. The cumulative source diff remains within FRD-027/ADR-0020: source declaration/fetch/cache hardening, DNS and lock safety, board cache-ignore reconciliation, generated plugin parity, and their test/docs surfaces. No unrelated provider or GUI feature scope was found.

Prior review dispositions:
- F-003 stale-lock recovery is FIXED by the CORE-045/046/047/049/050 lineage. The current core IO suite covers dead-owner recovery, concurrent reclaimer ownership, replacement-lock preservation, third-claimant safety, and transient quarantine rename retry.
- F-009 non-global destination classification and DNS-before-every-hop are FIXED by the CORE-045/046 lineage. The current source tests cover mapped IPv4, IPv4 special-use ranges, IPv6 special-use ranges, redirect hops, and linked requests.
- F-005/F-008/F-017/F-018/F-019 and the remaining original source findings are fixed or explicitly parked as documented. F-020 GUI source-editor scope remains accepted/out-of-scope with no visual editor claim. Live DNS rebinding/private-network, crash-at-write, packaged update, and complete independent linked-site validator evidence remain INCONCLUSIVE as the packet states.
- CORE-058 board cache-ignore findings are fixed by the cumulative CORE-062..073/CORE-074/CORE-076 merges; exact GUI Git regressions cover attachment, root preservation, retry/idempotence, branch binding, concurrent/atomic edits, orphan cleanup, and timer re-arm.
- The parent report's historical narrative predates the latest child merges, but the current ticket item records the reachable child commits/PRs through merge 5053af23, and each child packet carries its own report/checklist/review evidence. No untracked cumulative source scope or unreachable commit was found.

Exact rails:
- Core focused declaration/io/store: exit 0, 116/116.
- Core full suite: exit 0, 303/303.
- MCP source suite: exit 0, 19/19.
- GUI focused Git/branch/timer: exit 0, 34/34.
- GUI full suite: exit 0, 404/404.
- npm run build:core: exit 0.
- npm run build:server: exit 0.
- npm run build: exit 0.
- all-workspace npm run typecheck: exit 0.
- npm run test:scripts: exit 0, 88/88.
- npm run smoke:protocol: exit 0, 46/46.
- npm run smoke:discovery: exit 0, 13/13.
- npm run smoke:headless: exit 0; all six reported checks passed.
- npm run verify:docs: exit 0; manual current, 22 chapters.
- npm run check:manual: exit 0; manual current, 22 chapters.
- npm run verify:skills: exit 0.
- npm run verify:agents-block: exit 0, 31/31.
- git diff check against b5ae6f36 to 5053af23: exit 0.
- In the exact linked review worktree, the initial plugin:check exit 1 was the expected workspace-layout/path guard/mismatch boundary; after local build-plugin it passed but produced path-comment differences. A separate normal non-linked checkout at this exact head ran npm install, npm run build, and npm run plugin:check successfully: 37 tools, isolated handshake, byte parity. The committed artifact SHA-256 in that normal checkout is 06110A9E0CA2007A51CC2AEDCDD0E2BD353B627484C184AADB709A52AF686878.

PR #165 is OPEN/MERGEABLE with no hosted status rollup; no hosted PASS is claimed. Verdict PASS for the exact cumulative head and declared scope. No merge or ticket move performed by this reviewer.
