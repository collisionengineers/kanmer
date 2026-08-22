# Post-implementation report — CORE-044

## Outcome

CORE-044 is Review-ready as a stacked remediation of the still-unmerged CORE-026 implementation. The implementation branch is core-044-source-fetch-remediation, worktree .worktrees/core-044, commit 33f32e3aae9819f1c2344863272dacb5c958fbac. Its exact base is CORE-026 PR #163 review head b5ae6f36e007a05fffd9bb2f1c6ea4a87a860477; it is not based on bare origin/main. The ticket-linked PR is #165, based on core-026-project-declared-sources.

No merge, self-review, Verifying/Done move, or cleanup was performed. The next action is independent review of PR #165 against CORE-026, followed by the normal merge/verify gates owned by another agent.

## Scope and changed surfaces

The diff is limited to the 21 CORE-026 review findings: canonical core source validation and selector behavior; serialized source board updates; MCP fetch/redirect/public-destination/cache behavior; source tests and authoritative test registration; the 37-tool and skill guidance surfaces; board cache ignore policy; generated manual/plugin synchronization; and the FRD-027 traceability wording. It does not add GUI source editing, provider migration, external auto-trust, OAuth, remote transport redesign, or an unbounded crawler.

The generated manual and plugin bundle are derived outputs of the changed docs/source surface. Relative to the exact b5ae6f36 base, there are no unrelated GUI or user-owned source changes; the GUI path is the generated manual chapter only.

## Finding dispositions

1. Per-hop redirect validation — FIXED. Fetch now follows manual same-origin HTTPS redirects, validates each Location before issuing the next request, validates the response URL, and caps redirects.
2. set_sources board concurrency — FIXED. The core updateBoard seam reads and mutates board.yml while holding the shared exclusive board lock; set_sources uses that source patch rather than a stale whole-board object. Two concurrent-writer tests prove unrelated fields survive.
3. Cache atomicity — FIXED for the bounded contract. Cache writes use the core atomic writer under a cross-process exclusive lock; malformed/tampered derived cache bytes are discarded and rebuilt. A process killed at every OS write instruction remains INCONCLUSIVE and is explicitly parked.
4. Canonical tool roster — FIXED. AGENTS.md, the generated/manual references, and plugin synchronization report the 37-tool surface with source read/write entries.
5. Aggregate limit while downloading — FIXED. Root and linked reads receive the remaining aggregate allowance and stream/cancel at the limit.
6. Root credential-bearing query — FIXED. The shared declaration schema rejects HTTPS query strings, credentials, and fragments before board persistence or network access.
7. Linked credential-bearing query — FIXED. Markdown links clear fragments first, then reject query-bearing, cross-origin, non-HTTPS, and duplicate destinations before fetch/cache.
8. Root 304 linked freshness — FIXED within the bounded contract. A root 304 revalidates cached linked documents with their validators, retains explicit stale/failure state, and recomputes sha256 metadata.
9. Board Git cache leakage — FIXED for forward behavior. .kanmer/data/sources is ignored and cache remains derived local state. Existing user/history cleanup and retroactive history rewriting are operationally deferred, not claimed.
10. Remote SSRF — FIXED for the implemented boundary. Literal local/private/link-local/multicast/metadata targets are rejected; real fetch resolves hostnames and rejects private results before every hop. Live DNS rebinding and private-network reachability remain INCONCLUSIVE because no safe external fixture is authorized.
11. Empty selector arrays — FIXED. Explicit empty areas/labels selectors have global semantics in the shared core resolver.
12. Canonical URL identity — FIXED. Safe HTTPS hostname/default-port normalization drives duplicate identity and cache paths while preserving the declaration contract.
13. Redirect-relative links — FIXED. Relative links resolve from the validated final root response URL.
14. Image page-budget consumption — FIXED. Markdown image destinations are excluded before the direct-page cap.
15. Fragment links — FIXED. Fragments are removed before same-origin validation and deduplication.
16. Unavailable-source skill use — FIXED. Research/plan guidance consults only available declarations and records unknown/unavailable entries as skipped.
17. Source test rail — FIXED. sources.test.mjs is registered in the authoritative MCP test:http command and ran as part of the current 80/80 HTTP suite.
18. Duplicated MCP schema — FIXED. set_sources derives its input from SourceDeclarationArraySchema exported by core.
19. Missing content type — FIXED. Fetched documents require text/* or application/json content type before caching.
20. GUI acceptance ambiguity — RESOLVED BY GOVERNING-DOC TRACEABILITY. FRD-027 now states that set_sources is the shared headless declaration editor and GUI/setup preserves declarations; this ticket intentionally adds no GUI editor. No GUI-source-editor behavior is claimed.
21. Credential-bearing linked URL persistence — FIXED. Query-bearing linked destinations are rejected before fetch, diagnostics, returned documents, or cache persistence.

## Verification ledger

The first failures are preserved in scratch/execute.md and are not reclassified as passes:

- The initial focused core command with an incorrect workspace Vitest path exited 1 because no files matched. The corrected command npm run test -w @kanmer/core -- src/sources.test.ts src/store.test.ts exited 0: 91/91.
- The first source rail exposed a malformed Response 304 fixture and exited 1. The fixture was corrected; node --test packages/mcp-server/src/sources.test.mjs now exits 0 with 12/12.
- The first authoritative HTTP run after registration exposed malformed cache JSON handling and exited 1 at 79/80. After the derived-cache fix, the rail exited 0 at 80/80. The final current run after DNS/redirect hardening also exits 0 at 80/80.
- The first full npm test attempt exited 1 at generated manual freshness. After npm run build:manual, the next full attempt passed core 290/290 and GUI 382/382 but exited 1 at HTTP 78/80: project-resolution spawnSync timed out and tunnel readiness timed out in this shared environment. The targeted rerun node --test packages/mcp-server/src/http.test.mjs packages/mcp-server/src/tunnels/readiness.test.mjs exited 0 with 12/12. This full-rail result remains INCONCLUSIVE; it is not reported as a full npm test PASS.

Additional completed commands and exit codes:

- npm run typecheck: 0, all workspaces.
- npm run typecheck -w @kanmer/core: 0.
- npm run typecheck -w @kanmer/mcp-server: 0.
- npm run build:core: 0.
- npm run build:server and npm run build: 0.
- npm run test:scripts: 0, 88/88.
- npm run smoke:protocol: 0, 46/46 checks and 37 tools.
- npm run smoke:headless: 0.
- npm run smoke:discovery: 0, 13/13.
- npm run verify:docs: 0.
- npm run verify:skills: 0.
- npm run verify:agents-block: 0, 31/31.
- npm run plugin:check: 0 after plugin:build; 37 tools match, bundle bytes match, 12 skill frontmatters parse.
- git diff --check: 0.

## Evidence limits and follow-up

No live external llms.txt site, live DNS-rebinding/private-network probe, process-killed-at-rename harness, packaged installer/update run, or GUI source-editor interaction was available. These are recorded as INCONCLUSIVE or explicitly deferred in open-questions; none is fabricated as PASS. The independent reviewer should inspect the stacked diff against b5ae6f36, confirm PR #165 hosted checks, and decide whether the parked operational/cache and live-network limits are accepted for this remediation.

## Traceability

Base: b5ae6f36e007a05fffd9bb2f1c6ea4a87a860477 (CORE-026 PR #163).
Implementation: 33f32e3aae9819f1c2344863272dacb5c958fbac.
PR: #165, core-044-source-fetch-remediation -> core-026-project-declared-sources.


## Cumulative merge result

CORE-045's cumulative PR #166 was independently reviewed PASS and merged non-squash into this branch at `142af2f3b105b38b00d659019d1cfe99f3b50844` on 2026-08-22T12:55:09Z. CORE-044 now represents the exact cumulative CORE-026 remediation plus the CORE-045/051/053 source and lock chain; fresh independent review is required before PR #165 is merged into CORE-026. Live DNS/private-network, process-killed-at-rename, and broad HTTP timing evidence remain INCONCLUSIVE.


2026-08-22T13:22:00Z cumulative stack update: CORE-056 PR #179 independently passed at exact head 69860063 and merged non-squash into CORE-044 branch as 3c0706627cc73038d91a624e5d494d0148dce4c4. The source-refresh/304 completeness remediation is now part of the CORE-044 cumulative stack; CORE-056 moved to Verifying and its block edge was removed. Fresh CORE-044 review remains pending CORE-057/058.
