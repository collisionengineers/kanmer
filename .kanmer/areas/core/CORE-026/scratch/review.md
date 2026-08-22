---
kind: review-attestation
pr: "163"
head_sha: "453a92091d7a422a237996f024ab6940ea6fccfb"
base_sha: "34245be039e8fd8395b5e31835602c54e62e98a4"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "9916aa9641b6a15d"
ticket_updated: "2026-08-22T21:09:59.820Z"
findings:
  - id: F-001
    severity: blocker
    summary: "Prior redirect, credential, and destination safety findings"
    disposition: fixed
    reason: "Current head and exact-head source rails cover comments 3835667021, 3835667030, 3835667033, 3835696321, 3835679108, 3836536172, and 3836536177: per-hop same-origin/DNS checks, HTTPS pinning, credential rejection, redirected-root resolution, and identity encoding are present."
  - id: F-002
    severity: major
    summary: "Prior source schema, cache budget, validator, and mandatory-rail findings"
    disposition: fixed
    reason: "Current source/core implementation and 26/26 source tests cover comments 3835667024, 3835667026, 3835667029, 3835667031, 3835667035, 3835667037, 3835679111, 3835679113, 3835679116, 3835679120, 3835679122, 3835696322, 3836536166, 3836536170, 3836612410, 3836612417, 3836612420, 3836750326, and 3836804555."
  - id: F-003
    severity: major
    summary: "Prior lock ownership, stale recovery, and board-artifact isolation findings"
    disposition: fixed
    reason: "Current exact-head core IO tests pass 29/29 and the cumulative GUI ignore rules cover comments 3836536180, 3836536184, 3836536186, 3836612412, and 3836612414, including PID identity, malformed main records, orphan source-version checks, and lock/owner/quarantine ignores."
  - id: F-004
    severity: major
    summary: "Tool roster, cache-ignore, and unavailable-source guidance"
    disposition: fixed
    reason: "Comments 3835667028, 3835667032, and 3835679118 are covered by the current AGENTS/tool reference/skills and exact-head plugin check: 37 tools match and bundle bytes match."
  - id: F-005
    severity: minor
    summary: "GUI source editor wording"
    disposition: accepted-risk
    reason: "Comment 3835679125 is an explicit scope boundary: CORE-026 provides the shared MCP set_sources/fetch_source surface and does not claim a second GUI source editor. The FRD wording remains a follow-up concern, not evidence of an implemented GUI feature."
  - id: F-006
    severity: major
    summary: "Unresolved source-cache validation and refresh diagnostics"
    disposition: open
    reason: "Comments 3836750332, 3836804549, 3836804550, 3836804554, 3836901609, 3836901612, and 3836982836 remain valid on 453a9209: cache directories are not symlink-refused; empty/no-root cache representations are accepted; stale fallback drops prior linked failures; forced refresh does not recover after an active rejection; cache reads are unbounded; cached document origins are not validated; and replacement validators from 304 responses are not persisted."
  - id: F-007
    severity: major
    summary: "Unresolved lock-marker and error-preservation edges"
    disposition: open
    reason: "Comments 3836901611, 3836901614, and 3836982837 remain valid: malformed owner markers are treated as permanently active, callback errors can be masked by release failure, and dead locks with future timestamps can remain blocked until wall-clock catch-up."
  - id: F-008
    severity: blocker
    summary: "Pinned DNS lookup does not honor Node all-mode callback shape"
    disposition: open
    reason: "Comment 3836750328 remains valid at packages/mcp-server/src/sources.ts: pinnedFetch supplies a single-address callback but does not handle a Node all:true lookup request or disable automatic family selection. The source suite uses injected request seams and does not prove the real Node 24 hostname path."
  - id: F-009
    severity: blocker
    summary: "Orphan source cleanup is not an atomic fingerprint-and-delete operation"
    disposition: open
    reason: "Comment 3836982834 remains valid: resumeOrphanMigration fingerprints source .kanmer, then separately invokes git rm without a lock/quarantine transaction, leaving a race in which a concurrent source edit can be deleted."
  - id: F-010
    severity: blocker
    summary: "Cumulative branch is stale against requested main"
    disposition: open
    reason: "Against requested main 34245be039e8fd8395b5e31835602c54e62e98a4 (GUI-109), the exact diff deletes apps/gui/src/renderer/src/components/ContextMenu.test.tsx and apps/gui/src/renderer/src/lib/groupMenu.ts plus groupMenu.test.ts. This would regress the already-merged group-assignment surface; PR metadata still reports base 84a20f8414264f65f6d851ca51849af89c80acf9."
  - id: F-011
    severity: blocker
    summary: "Authoritative hosted verification is red"
    disposition: open
    reason: "Run 32598710721 is failed. Verify job 97093585268 reports core 304/307 with three Windows cleanup timeouts/ENOTEMPTY failures in io/docs/store temp data cleanup; kanmer-gate job 97093585402 reports the live CORE-087 dependency and the previously invalid review disposition. This failed evidence is preserved and prevents PASS."
  - id: F-012
    severity: blocker
    summary: "Generated plugin artifact dependency is not closed"
    disposition: deferred-to-ticket
    ticket: "CORE-087"
    reason: "CORE-087 is still Verifying with checklist 0/5 and remains the live dependency reported by kanmer-gate. The artifact itself is locally coherent: commit 4fee55cd is in 453a9209, plugin:check passes 37 tools/byte parity, and mcpb:check passes 3 files/1670291 bytes; the ticket still needs its own review/verification closeout."
  - id: F-013
    severity: major
    summary: "Prior review record syntax"
    disposition: fixed
    reason: "The stale prior attestation used non-canonical dispositions such as fixed-in-ticket/fixed-in-cumulative-stack. This replacement is the current SHA-bound attestation and uses only valid dispositions: fixed, open, accepted-risk, and deferred-to-ticket."
  - id: F-014
    severity: minor
    summary: "Local GUI focused rail did not complete in this audit"
    disposition: accepted-risk
    reason: "The exact-head kanmerGit focused process was bounded and interrupted with exit 1 after no result; no PASS is claimed. Hosted verify independently records the concrete Windows cleanup failure. Core/MCP/plugin/typecheck/scripts/diff evidence above is complete."
  - id: F-015
    severity: minor
    summary: "External/live evidence boundaries"
    disposition: accepted-risk
    reason: "Live DNS rebinding, external llms.txt, connected-provider, packaged Windows, and GUI visual evidence remain INCONCLUSIVE because no authorized external host/feed was exercised; no unsupported PASS is claimed."
---

## Fresh independent review — CORE-026 / PR #163

Reviewed exact cumulative head `453a92091d7a422a237996f024ab6940ea6fccfb` against requested main `34245be039e8fd8395b5e31835602c54e62e98a4`. The PR's GitHub base metadata is older (`84a20f8414264f65f6d851ca51849af89c80acf9`), so the deletion of GUI-109 group-menu files is a merge-blocking stale-base regression.

The cumulative source/cache/lock/orphan code was inspected. The exact-head local evidence is:

- PASS: core source/lock/store focus, 120/120.
- PASS: `npm run build`, exit 0.
- PASS: MCP source suite, 26/26 after build. The pre-build attempt exited 1 because `packages/mcp-server/dist/index.js` was absent; that failure is preserved.
- PASS: `npm run typecheck`, exit 0.
- PASS: `npm run test:scripts`, 88/88.
- PASS: `npm run plugin:check`, 37 tools and generated bundle bytes match.
- PASS: `npm run mcpb:check`, 3 files / 1,670,291 bytes; generated standalone SHA-256 `7298b5c268ac5995cadd56f6bbd4bcbe301f97a6a72eddd2f53d64a346158d75`.
- PASS: `git diff --check 34245be039e8fd8395b5e31835602c54e62e98a4..453a92091d7a422a237996f024ab6940ea6fccfb`, exit 0.
- INCONCLUSIVE/failed bounded attempt: exact-head GUI `kanmerGit.test.ts` process was interrupted with exit 1 without a result; no GUI PASS is claimed.

The hosted authoritative evidence remains failed: run `32598710721` verify job `97093585268` recorded 304/307 core tests with three Windows `ENOTEMPTY`/timeout cleanup failures, and kanmer-gate job `97093585402` rejected the live CORE-087 dependency plus the stale invalid review attestation. Therefore verdict is NEEDS-CHANGES. No source change, merge, board move, or ticket cleanup was performed.

--- Prior review history ---

---
kind: review-attestation
pr: "163"
head_sha: "a9833df28ddf6f91966be17a4eb7c06265e088ed"
base_sha: "34245be039e8fd8395b5e31835602c54e62e98a4"
verdict: needs-changes
reviewer: "codex-root-current-cumulative-audit"
independent: true
plan_hash: "2026-08-22T19:58:00Z"
ticket_updated: "2026-08-22T19:58:00Z"
findings:
  - id: F-029
    severity: blocker
    summary: "Lock ownership and board-artifact isolation"
    disposition: fixed-in-ticket
    ticket: "CORE-082"
    reason: "CORE-082 independently reviewed and merged as a9833df2; PID-reuse identity, malformed-lock recovery, and board lock/owner/quarantine ignore protections are present."
  - id: F-030
    severity: blocker
    summary: "Orphan migration preserves newer source-board state"
    disposition: deferred-to-ticket
    ticket: "CORE-083"
    reason: "CORE-083 remains the live blocker for source-version conflict protection and canonical board-root retention when source ignore reconciliation refuses."
  - id: F-031
    severity: minor
    summary: "Live external source/provider and packaged evidence"
    disposition: accepted-risk
    reason: "Live provider, network/DNS rebinding, packaged Windows, and external estate evidence remain explicitly INCONCLUSIVE; no external state was changed."
---

## Current cumulative review — NEEDS-CHANGES — 2026-08-22

Reviewed exact PR #163 cumulative head a9833df28ddf6f91966be17a4eb7c06265e088ed against main base 34245be039e8fd8395b5e31835602c54e62e98a4. CORE-081/085/086 and CORE-082 are independently reviewed and merged into the cumulative branch; their source/cache/artifact/lock rails pass. CORE-083 remains the only live blocking dependency. The machine attestation uses valid F-### identifiers and records that blocker explicitly.

Verdict: NEEDS-CHANGES. Do not merge or move CORE-026 while CORE-083 remains incomplete.

--- Prior review history ---

---
kind: review-attestation
pr: "163"
head_sha: "a1a4fe629d71d149b64fd3e57979a196176b875a"
base_sha: "34245be039e8fd8395b5e31835602c54e62e98a4"
verdict: needs-changes
reviewer: "codex-root-current-cumulative-audit"
independent: true
plan_hash: "2026-08-22T19:35:00Z"
ticket_updated: "2026-08-22T19:35:00Z"
findings:
  - id: F-029
    severity: blocker
    summary: "Lock ownership and board-artifact isolation remediation"
    disposition: deferred-to-ticket
    ticket: "CORE-082"
    reason: "CORE-082 remains a live blocker for CORE-026 and owns PID-reuse-safe ownership, malformed stale-lock recovery, and board lock/owner/quarantine ignore rules."
  - id: F-030
    severity: blocker
    summary: "Orphan migration preserves newer source-board state"
    disposition: deferred-to-ticket
    ticket: "CORE-083"
    reason: "CORE-083 remains a live blocker for CORE-026 and owns source-version conflict protection plus canonical board-root retention when source ignore reconciliation refuses."
  - id: F-031
    severity: minor
    summary: "Live external source/provider and packaged evidence"
    disposition: accepted-risk
    reason: "Live provider, network/DNS rebinding, packaged MCPB CLI, and external estate evidence remain explicitly INCONCLUSIVE; no external state was changed."
---

## Current cumulative review — NEEDS-CHANGES — 2026-08-22

Reviewed exact PR #163 cumulative head a1a4fe629d71d149b64fd3e57979a196176b875a against main base 34245be039e8fd8395b5e31835602c54e62e98a4. CORE-081/085 source lifecycle fixes and CORE-086 artifact refresh are present and independently reviewed; the authoritative source/core/typecheck/build/scripts rails pass in the cumulative packet and exact rebuild. CORE-082 and CORE-083 remain live blocking dependencies. The machine attestation now uses valid F-### identifiers and records those blockers explicitly; no source finding is silently accepted.

Verdict: NEEDS-CHANGES. Do not merge or move CORE-026 while CORE-082 and CORE-083 remain incomplete. Live provider/network/packaged boundaries remain accepted INCONCLUSIVE risk only.

--- Prior review history ---

---
kind: review-attestation
pr: "163"
head_sha: "3a05ab7a21f55152a4f493169300ac9e622baab7"
base_sha: "84a20f8414264f65f6d851ca51849af89c80acf9"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "9916aa9641b6a15d"
ticket_updated: "2026-08-22T17:30:26.490Z"
findings:
  - id: C-3835667028
    severity: blocker
    disposition: fixed-in-current-head
    reason: "AGENTS.md and the canonical tool reference now describe 37 tools, including get_sources/set_sources/fetch_source; smoke.mjs asserts 37 and the generated/plugin rails were recorded PASS."
  - id: C-3835667032
    severity: major
    disposition: fixed-in-cumulative-stack
    reason: "CORE-058 and CORE-062..076 add .kanmer/data/sources/ to BOARD_WORKTREE_IGNORE and preserve effective ignore reconciliation; the current head contains that rule."
  - id: C-3835667033
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "CORE-044/057 add public-destination checks, DNS-before-every-hop, pinned HTTPS requests, redirect limits and deadlines; the current source path rejects private/link-local destinations before remote fetch."
  - id: C-3835667037
    severity: major
    disposition: fixed-in-current-head
    reason: "SourceDeclarationArraySchema canonicalizes HTTPS host/port identities before duplicate detection, and the source cache key uses the canonical URL."
  - id: C-3835679125
    severity: major
    disposition: accepted-risk-out-of-scope
    reason: "FRD-027/ADR-0020 explicitly choose the shared MCP set_sources declaration surface and forbid a second GUI-only source store/editor; no GUI source editor is claimed by CORE-026."
  - id: C-3836536186
    severity: major
    disposition: needs-remediation-CORE-082
    reason: "ownerMarkerActive validates only PID liveness; a reused PID is treated as the crashed owner's active process despite the UUID token. CORE-045..050 add token/reclaim races but do not bind the marker to process-start identity."
  - id: C-3836536184
    severity: blocker
    disposition: needs-remediation-CORE-083
    reason: "ensureIgnore(repoRoot/.gitignore) still runs outside the boardRoot-preserving inner catches; a source-root symlink refusal can fall through the outer catch and return empty() without boardRoot after attachment/rename."
  - id: C-3836536180
    severity: blocker
    disposition: needs-remediation-CORE-083
    reason: "resumeOrphanMigration removes source .kanmer after pushing the copied board without recording/verifying the copied source version, so newer source-board edits can be deleted on retry. CORE-072/076 only make cleanup retryable/idempotent."
  - id: C-3836536172
    severity: major
    disposition: needs-remediation-CORE-081
    reason: "fetchText clears validators on a redirect and CacheFile retains the declared URL, so a redirected manifest's final ETag/Last-Modified is not reused on the next refresh."
  - id: C-3836536170
    severity: major
    disposition: needs-remediation-CORE-081
    reason: "fetchText leaves response bodies unread on redirect, HTTP-error, unsupported-content-type and content-length rejection paths; pinnedFetch wraps live IncomingMessage streams."
  - id: C-3836536166
    severity: major
    disposition: needs-remediation-CORE-081
    reason: "withExclusiveFileLock retries EEXIST for about 2.1 seconds while a legal source refresh may run for 10 seconds per request and multiple pages; a concurrent fetch can fail instead of waiting/reusing."
  - id: C-3836536177
    severity: major
    disposition: needs-remediation-CORE-081
    reason: "pinnedFetch does not request identity encoding or decode Content-Encoding, so a compressed text response can be cached as corrupted UTF-8."
  - id: C-3836612410
    severity: major
    disposition: needs-remediation-CORE-081
    reason: "Only ResponseTooLargeError reports consumedBytes; generic stream reset/timeout after partial reads leaves the aggregate byte counter unchanged and permits another allowance."
  - id: C-3836612412
    severity: major
    disposition: needs-remediation-CORE-082
    reason: "recoverStaleLock returns false for malformed/empty stale records, so an old fallback O_EXCL record can remain permanently unrecoverable without an active owner."
  - id: C-3836612414
    severity: major
    disposition: needs-remediation-CORE-082
    reason: "BOARD_WORKTREE_IGNORE excludes activity, sources and temp files but not board.yml.lock, owner markers or stale/quarantine records; syncBoard stages .kanmer and can commit live lock artifacts."
  - id: C-3836612417
    severity: major
    disposition: needs-remediation-CORE-081
    reason: "markdownLinks collects every valid link before callers apply slice(0, maxLinkedPages), so a huge short-link manifest can exceed the advertised memory/CPU bound."
  - id: C-3836612420
    severity: major
    disposition: needs-remediation-CORE-081
    reason: "The fresh-root linked-page loop appends asDocument(response) for status 304 without a cached representation, yielding an empty successful document instead of a surfaced failure."
  - id: C-3835667021
    severity: blocker
    disposition: stale-fixed-in-cumulative-stack
    reason: "CORE-044/057 replaced follow redirects with per-hop same-origin validation and pinned requests."
  - id: C-3835667024
    severity: blocker
    disposition: stale-fixed-in-cumulative-stack
    reason: "CORE-044 moved set_sources to the core updateBoard lock/re-read mutation path."
  - id: C-3835667026
    severity: blocker
    disposition: stale-fixed-in-cumulative-stack
    reason: "CORE-044 uses writeFileAtomic under the source cache lock; later CORE-045..050 harden ownership/recovery."
  - id: C-3835667029
    severity: major
    disposition: stale-fixed-in-cumulative-stack
    reason: "CORE-044 streams with remaining aggregate bytes and charges oversize consumption."
  - id: C-3835667030
    severity: blocker
    disposition: stale-fixed-in-cumulative-stack
    reason: "Core source schema rejects root query-bearing/credential-bearing/fragment URLs before board persistence."
  - id: C-3835667031
    severity: major
    disposition: stale-fixed-in-cumulative-stack
    reason: "CORE-056 revalidates retained linked documents on root 304; C-3836612420 records the separate uncached-304 residual."
  - id: C-3835667035
    severity: major
    disposition: stale-fixed-in-cumulative-stack
    reason: "Core selector matching now treats empty selector arrays as global with regression coverage."
  - id: C-3835679108
    severity: major
    disposition: stale-fixed-in-cumulative-stack
    reason: "Validated final response URL is used as the redirected-root markdown base."
  - id: C-3835679111
    severity: major
    disposition: stale-fixed-in-cumulative-stack
    reason: "Markdown image syntax is excluded before the direct-page cap."
  - id: C-3835679113
    severity: major
    disposition: stale-fixed-in-cumulative-stack
    reason: "The source suite is registered in the authoritative MCP test rail."
  - id: C-3835679116
    severity: major
    disposition: stale-fixed-in-cumulative-stack
    reason: "Fragments are cleared before same-origin validation and deduplication."
  - id: C-3835679118
    severity: major
    disposition: stale-fixed-in-cumulative-stack
    reason: "Research skill guidance records unknown/unavailable declarations as skipped."
  - id: C-3835679120
    severity: major
    disposition: stale-fixed-in-cumulative-stack
    reason: "MCP set_sources uses the exported core SourceDeclarationArraySchema."
  - id: C-3835696321
    severity: blocker
    disposition: stale-fixed-in-cumulative-stack
    reason: "Linked query-bearing URLs are rejected before fetch/cache persistence."
  - id: C-3835696322
    severity: major
    disposition: stale-fixed-in-cumulative-stack
    reason: "Oversize linked downloads charge consumed bytes; C-3836612410 covers the distinct generic partial-read failure path."
---

## Current-head independent audit — CORE-026 / PR #163

Exact PR head is 3a05ab7a21f55152a4f493169300ac9e622baab7; base is 84a20f8414264f65f6d851ca51849af89c80acf9. GitHub reports 33 inline comments: 16 stale/outdated comments from earlier cumulative commits and 17 current-head comments. The current-head review found five already fixed/out-of-scope dispositions, three linked blocking remediation tickets for the twelve residual valid findings, and no source modification, ticket move, or merge.

Blocking remediations created and linked with blocks: [CORE-026]:

- CORE-081 — source transport/cache lifecycle: validators across redirects, response-body cancellation, active-refresh wait, content encoding, generic partial-read byte accounting, bounded link collection, and uncached linked-page 304 handling. Findings: #3836536172, #3836536170, #3836536166, #3836536177, #3836612410, #3836612417, #3836612420.
- CORE-082 — lock ownership/artifact isolation: PID-reuse identity, malformed stale-lock recovery, and board lock/owner/quarantine ignore rules. Findings: #3836536186, #3836612412, #3836612414.
- CORE-083 — orphan migration/source-board safety: source-ignore symlink board-root retention and source-version/concurrent-edit verification before cleanup. Findings: #3836536184, #3836536180.

Evidence and boundaries:

- Hosted run 32587889875 reports both verify and kanmer-gate PASS for the exact head.
- Existing cumulative packets record core 303/303, MCP source 19/19, GUI 404/404, scripts 88/88, build/typecheck/docs/skills/plugin/diff rails PASS, with their earlier failed attempts preserved in the respective scratch/report documents. This audit did not rerun those rails; it inspected the exact current source and packet evidence.
- The current source inspection confirmed the residual findings above; the prior PASS attestation is superseded by this needs-changes audit. Live DNS rebinding/private-network, Windows race timing, packaged/external fetch, and GUI visual/provider evidence remain INCONCLUSIVE where not directly exercised.
- CORE-026 remains Review and is now blocked by CORE-081/082/083. No stage transition or merge was performed.

HZN-007 durable run/current were updated before this audit assignment and after the result with the exact head, comment count, and remediation IDs. The prior failed/stale evidence was preserved; no unsupported item was ticked.

--- Prior review history ---

---
kind: review-attestation
pr: "163"
head_sha: "3a05ab7a21f55152a4f493169300ac9e622baab7"
base_sha: "84a20f8414264f65f6d851ca51849af89c80acf9"
verdict: pass
reviewer: "codex-gui082-executor"
independent: true
plan_hash: "9916aa9641b6a15d"
ticket_updated: "2026-08-22T17:30:26.490Z"
findings:
  - id: F-001
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "Redirect destination and same-origin controls are present and covered by the cumulative source regressions."
  - id: F-002
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "Board/source concurrency handling is covered by the cumulative remediation and core rails."
  - id: F-003
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "Atomic cache writes and stale-lock recovery are present in the cumulative remediation chain."
  - id: F-004
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "AGENTS, skills, tool reference, generated plugin, and roster synchronization are green."
  - id: F-005
    severity: major
    disposition: fixed-in-cumulative-stack
    reason: "Streaming aggregate-byte enforcement is covered by the 19/19 MCP source suite."
  - id: F-006
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "Root and linked credential-bearing URLs are rejected or stripped by the cumulative fetch implementation."
  - id: F-007
    severity: minor
    disposition: accepted-risk
    reason: "Separate linked-page freshness on a root 304 remains the documented bounded first-release risk."
  - id: F-008
    severity: minor
    disposition: accepted-risk
    reason: "Project-local bounded cache persistence is specified by FRD-027 and ADR-0020."
  - id: F-009
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "DNS destination checks, request pinning, hop limits, and deadlines are covered by source regressions."
  - id: F-010
    severity: minor
    disposition: fixed-in-cumulative-stack
    reason: "Empty selector/global semantics are covered by the source contract and tests."
  - id: F-011
    severity: minor
    disposition: fixed-in-cumulative-stack
    reason: "Canonical source identity and duplicate handling are covered by the source contract."
  - id: F-012
    severity: minor
    disposition: fixed-in-cumulative-stack
    reason: "Redirected-root relative-link resolution is covered by the fetch regressions."
  - id: F-013
    severity: minor
    disposition: fixed-in-cumulative-stack
    reason: "Direct documentation-page budgeting and non-document link filtering are covered by source tests."
  - id: F-014
    severity: major
    disposition: fixed-in-cumulative-stack
    reason: "The MCP source suite is explicitly run and passed 19/19."
  - id: F-015
    severity: minor
    disposition: fixed-in-cumulative-stack
    reason: "Fragment normalization is covered by the fetch remediation."
  - id: F-016
    severity: minor
    disposition: fixed-in-cumulative-stack
    reason: "Unavailable declared sources are represented and skipped by refreshed guidance."
  - id: F-017
    severity: major
    disposition: fixed-in-cumulative-stack
    reason: "MCP source inputs reuse the core schema authority."
  - id: F-018
    severity: major
    disposition: fixed-in-cumulative-stack
    reason: "Missing and unsupported content types are rejected by the bounded fetch contract."
  - id: F-019
    severity: minor
    disposition: accepted-risk
    reason: "GUI source editing/discovery is explicitly deferred by the plan; this PR does not claim it."
  - id: F-020
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "Linked query credentials are rejected or stripped by the cumulative source fetch implementation."
  - id: F-021
    severity: major
    disposition: fixed-in-cumulative-stack
    reason: "Failed oversized linked downloads charge aggregate bytes and are covered by source regressions."
  - id: F-022
    severity: blocker
    disposition: fixed-in-PR
    reason: "PR #200 merged into this head and normalizes the three Windows board-root assertions through the existing pathIdentity helper."
---

## Independent cumulative review — CORE-026 / PR #163

The exact cumulative head is 3a05ab7a21f55152a4f493169300ac9e622baab7, including the non-squash PR #200 merge 3a05ab7a. The PR #200 diff is limited to the three Windows path-spelling assertions in apps/gui/src/main/kanmerGit.test.ts, all now comparing filesystem identity through the existing helper. The cumulative source/MCP/core remediation remains bounded to the ticket and its linked review remediations; no GUI production behavior or unrelated provider surface was added.

Exact-head evidence:

- focused GUI kanmerGit.test.ts: exit 0, 27/27;
- core suite: exit 0, 303/303;
- MCP source suite: first pre-build attempt exit 1 because packages/mcp-server/dist/index.js was absent; after the prescribed build, exit 0, 19/19;
- npm run build: exit 0 for core/browser and MCP server/standalone;
- npm run test:scripts: exit 0, 88/88;
- git diff --check: exit 0;
- hosted run 32587889875: kanmer-gate and authoritative verify both PASS.

The first pre-build failure is preserved and not erased by the successful rerun. Connected-provider, live external llms.txt, packaged-update, and live DNS/rebinding evidence remain INCONCLUSIVE where not directly exercised. Verdict: PASS; merge PR #163 non-squash into main, then move CORE-026 to Verifying.

--- Prior review history ---

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

---
kind: review-attestation
pr: "163"
head_sha: "e794cbf742f6103cee015d11ef51b867915445a1"
base_sha: "84a20f8414264f65f6d851ca51849af89c80acf9"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "9916aa9641b6a15d"
ticket_updated: "2026-08-22T16:52:34.040Z"
findings:
  - id: F-001
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "CORE-044/045/046/047/049/050 redirect validation and DNS-before-every-hop controls are present; source and HTTP regressions pass."
  - id: F-002
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "Board/source configuration concurrency handling is covered by the cumulative remediation and inherited core rails pass."
  - id: F-003
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "Atomic cache writes and cross-process lock/recovery behavior are covered by CORE-044/045/046/047/049/050."
  - id: F-004
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "AGENTS, skills, tool-reference, generated plugin, and roster were refreshed; docs/skills/plugin rails pass."
  - id: F-005
    severity: major
    disposition: fixed-in-cumulative-stack
    reason: "Aggregate byte enforcement remains covered by source regressions and the 19/19 MCP source suite."
  - id: F-006
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "Root and linked query-credential handling is covered by the cumulative source/HTTP remediation."
  - id: F-007
    severity: minor
    disposition: accepted-risk
    reason: "Linked-page freshness on a root 304 remains bounded by the documented cache policy and is outside the first-release separate revalidation guarantee."
  - id: F-008
    severity: minor
    disposition: accepted-risk
    reason: "The bounded project-local source cache is specified by FRD-027/ADR-0020; cumulative board-ignore work now protects its derived files."
  - id: F-009
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "Remote source fetch applies HTTPS destination policy, DNS revalidation, pinned requests, hop limits, and deadlines; source rails pass."
  - id: F-010
    severity: minor
    disposition: fixed-in-cumulative-stack
    reason: "Empty selector/global semantics are covered by the cumulative source contract and tests."
  - id: F-011
    severity: minor
    disposition: fixed-in-cumulative-stack
    reason: "Canonical source identity and duplicate handling are covered by the cumulative source contract."
  - id: F-012
    severity: minor
    disposition: fixed-in-cumulative-stack
    reason: "Redirected-root relative-link resolution is covered by the source fetch remediation."
  - id: F-013
    severity: minor
    disposition: fixed-in-cumulative-stack
    reason: "Direct documentation-page budgeting and non-document links are covered by source regressions."
  - id: F-014
    severity: major
    disposition: fixed-in-cumulative-stack
    reason: "The MCP source suite is explicitly run and passed 19/19 in this review; the broader local rails also pass."
  - id: F-015
    severity: minor
    disposition: fixed-in-cumulative-stack
    reason: "Fragment normalization is covered by the source fetch remediation."
  - id: F-016
    severity: minor
    disposition: fixed-in-cumulative-stack
    reason: "Unavailable declared sources are represented and skipped by the refreshed skill guidance."
  - id: F-017
    severity: major
    disposition: fixed-in-cumulative-stack
    reason: "MCP source inputs reuse the core schema authority; typecheck/source rails pass."
  - id: F-018
    severity: major
    disposition: fixed-in-cumulative-stack
    reason: "Missing/unsupported content types are handled by the bounded fetch contract and 19/19 source tests."
  - id: F-019
    severity: minor
    disposition: accepted-risk
    reason: "GUI source editing/discovery remains explicitly deferred by the plan; no GUI source editor is claimed in this review."
  - id: F-020
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "Linked query credentials are rejected or stripped by the cumulative source fetch implementation."
  - id: F-021
    severity: major
    disposition: fixed-in-cumulative-stack
    reason: "Failed oversized linked downloads charge aggregate bytes and are covered by source regressions."
  - id: F-022
    severity: blocker
    disposition: needs-changes
    reason: "Hosted verify run 32585991850/job 97062323619 is red: apps/gui kanmerGit.test.ts reports 409/412 with three failures in orphan cleanup and first-time local/remote attachment tests. Expected paths use the Windows 8.3 spelling C:\Users\RUNNER~1\AppData\Local\Temp\..., while the implementation returns the canonical long spelling C:\Users\runneradmin\AppData\Local\Temp\.... The test file already defines pathIdentity but these assertions compare path spellings directly. This is a deterministic Windows CI portability failure; the authoritative verify rail is not green until the assertions compare filesystem identity or the contract is otherwise made explicit."
---

# Independent review — CORE-026 cumulative PR #163

## Verdict

NEEDS-CHANGES. The exact cumulative PR head is e794cbf742f6103cee015d11ef51b867915445a1, based on main 84a20f8414264f65f6d851ca51849af89c80acf9. The prior CORE-026 source/security findings are reconciled by the merged CORE-044 remediation and its descendants: no new source trust, redirect/SSRF/DNS, credential, bounded-fetch, cache-lock, schema, or documentation/roster blocker was found. However, the current authoritative hosted verify rail is red on three deterministic Windows path-spelling assertions, so this PR is not review-passable until F-022 is fixed or explicitly remediated and re-verified.

## Exact cumulative scope and lineage

The current tree contains the CORE-026 implementation plus the reachable CORE-044 merge e794cbf742f6103cee015d11ef51b867915445a1. The content tree is unchanged from the independently reviewed CORE-044 cumulative head 5053af23b87fe591015b14042b920c4cf41259b4 except for merge metadata; the generated plugin artifact is unchanged. The cumulative diff is confined to the declared source/MCP/core/GUI synchronization, lock/DNS/HTTP hardening, board-ignore recovery, generated plugin, governing docs, AGENTS/skills/tool-reference, and their tests.

## Hosted evidence

- PR #163 head: e794cbf742f6103cee015d11ef51b867915445a1; base: 84a20f8414264f65f6d851ca51849af89c80acf9.
- Run 32585991850, kanmer-gate job 97062323501: PASS.
- Run 32585991850, verify job 97062323619: FAILURE.
- Failure detail: apps/gui had 46 passed files and 1 failed file, 409 passed tests and 3 failed tests out of 412. The failing tests are retries source cleanup after the orphan board commit succeeds, preserves the root when first-time local attachment ignore fails, and preserves the root when first-time remote attachment ignore fails. Each expected C:\Users\RUNNER~1\AppData\Local\Temp\... and received C:\Users\runneradmin\AppData\Local\Temp\....
- This is a hosted CI/test portability failure, not evidence of a source-trust bypass; it remains merge-blocking until corrected because npm run verify is the authoritative rail.

## Local exact-head evidence

All commands ran from detached worktree .worktrees/review-core026-e794 at the exact head:

- npm install --ignore-scripts --no-audit --no-fund --prefer-offline: exit 0.
- npm run build: exit 0.
- npm run test -w @kanmer/core: exit 0, 303/303.
- node --test packages/mcp-server/src/sources.test.mjs: exit 0, 19/19.
- npm run typecheck: exit 0.
- npm run test:scripts: exit 0, 88/88.
- npm run verify:docs: exit 0.
- npm run check:manual: exit 0.
- git diff --check 84a20f8414264f65f6d851ca51849af89c80acf9..e794cbf742f6103cee015d11ef51b867915445a1: exit 0.
- Normal non-linked checkout plugin parity at the unchanged CORE-044 content tree: npm install, build, and npm run plugin:check exit 0; 37 tools and generated artifact byte parity verified. The current e794 merge adds no plugin content delta.

No source, ticket stage, merge, or cleanup was performed. Hosted/live external provider, live DNS rebinding, Windows filesystem race timing beyond deterministic fixtures, packaged app, and GUI visual evidence remain INCONCLUSIVE where not directly exercised.

## Disposition

F-001..F-006 and F-009..F-018/F-020/F-021 are fixed in the cumulative CORE-044 remediation chain and are supported by the exact-head source/core/MCP/docs/plugin rails above. F-007, F-008, and F-019 remain explicit accepted scope/cache risks from the prior review. F-022 is the sole current blocker: normalize the three expected board-root assertions through the existing pathIdentity helper (or otherwise assert the product's canonical path contract), then rerun the hosted verify rail and replace this attestation.

---
kind: review-attestation
pr: "163"
head_sha: "e794cbf742f6103cee015d11ef51b867915445a1"
base_sha: "84a20f8414264f65f6d851ca51849af89c80acf9"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "9916aa9641b6a15d"
ticket_updated: "2026-08-22T16:52:34.040Z"
findings:
  - id: F-001..F-006
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "Prior source trust, concurrency, atomicity, roster, aggregate, and credential findings are fixed by the cumulative CORE-044 remediation chain."
  - id: F-007
    severity: minor
    disposition: accepted-risk
    reason: "Linked-page freshness on root 304 remains bounded by the documented cache policy."
  - id: F-008
    severity: minor
    disposition: accepted-risk
    reason: "The bounded project-local source cache is specified by FRD-027 and ADR-0020; cumulative board-ignore work protects derived files."
  - id: F-009..F-018
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "Prior SSRF, selector, canonical identity, redirect-relative, page-budget, fragment, guidance, schema, test-rail, and content-type findings are fixed and covered by current source/core/MCP/docs/plugin rails."
  - id: F-019
    severity: minor
    disposition: accepted-risk
    reason: "GUI source editing/discovery remains explicitly deferred by the plan; no GUI source editor is claimed."
  - id: F-020..F-021
    severity: blocker
    disposition: fixed-in-cumulative-stack
    reason: "Linked credential persistence and failed oversized-download accounting are fixed and covered by source regressions."
  - id: F-022
    severity: blocker
    disposition: needs-changes
    reason: 'Hosted verify is red on three Windows GUI assertions comparing path spelling rather than filesystem identity: expected short RUNNER~1 path, received canonical runneradmin path. The authoritative verify rail must be green before merge.'
---

# Independent review — CORE-026 cumulative PR #163

## Verdict

NEEDS-CHANGES. Exact head e794cbf742f6103cee015d11ef51b867915445a1 is based on main 84a20f8414264f65f6d851ca51849af89c80acf9. The prior CORE-026 source/security findings are reconciled by the merged CORE-044 remediation and descendants; no new source-trust, redirect/SSRF/DNS, credential, bounded-fetch, cache-lock, schema, or documentation/roster blocker was found. The authoritative hosted verify rail is nevertheless red on F-022, so this PR is not review-passable.

## Hosted evidence

- Run 32585991850, kanmer-gate job 97062323501: PASS.
- Run 32585991850, verify job 97062323619: FAILURE.
- Verify reports 46 files with 409 passed and 3 failed tests out of 412. Failures: retries source cleanup after the orphan board commit succeeds; preserves root when first-time local attachment ignore fails; preserves root when first-time remote attachment ignore fails.
- All three compare Windows short-path spelling RUNNER~1 under the expected value with canonical long-path spelling runneradmin in the received value. The test file defines pathIdentity but these assertions compare strings directly. This is a deterministic Windows CI portability failure, not a source-trust bypass, but it blocks the authoritative verify rail.

## Exact-head local evidence

From detached .worktrees/review-core026-e794 at e794cbf742f6103cee015d11ef51b867915445a1:

- npm install --ignore-scripts --no-audit --no-fund --prefer-offline: exit 0.
- npm run build: exit 0.
- npm run test -w @kanmer/core: exit 0, 303/303.
- node --test packages/mcp-server/src/sources.test.mjs: exit 0, 19/19.
- npm run typecheck: exit 0.
- npm run test:scripts: exit 0, 88/88.
- npm run verify:docs: exit 0.
- npm run check:manual: exit 0.
- git diff --check against main 84a20f8414264f65f6d851ca51849af89c80acf9: exit 0.
- Normal non-linked checkout plugin parity on unchanged CORE-044 content tree: install, build, and plugin:check exit 0; 37 tools and generated artifact byte parity verified. The e794 merge adds no plugin content delta.

The prior CORE-044 PASS evidence applies to the current content tree because e794 is the non-content merge of 5053af23. Live provider, DNS rebinding, Windows race timing beyond deterministic fixtures, packaged app, and GUI visual evidence remain INCONCLUSIVE where not exercised. No source, board stage, merge, or ticket cleanup was performed.

## Required disposition

F-022 is the sole current blocker: normalize the three expected board-root assertions through the existing pathIdentity helper, or otherwise assert the product's canonical path contract; rerun hosted verify and replace this attestation. Prior F-001..F-021 dispositions are preserved above and in the preceding attestation.
