# Checklist — CORE-044 source-fetch remediation

- [x] Derive the MCP source declaration input from the canonical core schema and add canonical HTTPS URL identity, duplicate, empty-selector, and query-bearing URL tests.
- [x] Add a serialized core/store board update lock and make set_sources patch sources under that lock without overwriting unrelated edits.
- [x] Replace automatic redirect following with bounded manual same-origin HTTPS redirects and validate every Location/final destination.
- [x] Add public-destination/SSRF policy checks for local, loopback, link-local, private, and redirected targets with deterministic policy tests.
- [x] Reject query-bearing linked URLs, redact any remaining diagnostic URL data, and require supported content types before caching.
- [x] Resolve links against the validated final root URL, strip fragments before dedupe, filter image destinations before the page cap, and test all cases.
- [x] Enforce one aggregate byte budget while reading and charge failed/aborted response bytes so oversized candidates cannot restart the budget.
- [x] Revalidate bounded linked documents after root 304 and preserve explicit stale/failure/sha256 metadata.
- [x] Replace process-local cache-only writes with the core atomic writer and cross-process coordination; add concurrent writer, malformed JSON, and cleanup tests.
- [x] Exclude .kanmer/data/sources from board Git synchronization; retained retired cache bytes remain non-authoritative and cleanup is explicitly deferred.
- [x] Update canonical AGENTS/tool-reference source roster and research guidance to consult only available declarations and record skipped unavailable/unknown entries.
- [x] Register packages/mcp-server/src/sources.test.mjs in test:http/verify and add a regression proving the authoritative rail executes it.
- [x] Run focused core and source tests with exact exits, preserving prior F-001/F-002 regressions and first failures.
- [x] Run full npm test, typecheck, core/server builds, protocol/headless smoke, docs/skills/manual/plugin-sync/diff rails, and record every exit; npm test's environment-sensitive 78/80 HTTP result is INCONCLUSIVE and its targeted rerun passed.
- [x] Reconcile FRD-027/ADR-0020 wording only if the final diff requires it; do not add GUI source editing or provider migration.
- [x] Write the post-implementation report mapping all 21 findings to fixed, rejected, parked, or INCONCLUSIVE evidence.
- [x] Confirm ticket-linked PR #165, commit reachability, expected-project annotations, hosted-check state, and final get_doc_gates readback before Review handoff.

## Verification / closeout

- [x] Merged-main verification at origin/main fdaededc completed; all recorded commits reachable.
- [x] Deterministic core/source/type/script/docs/skills/agents/diff rails recorded in proof.md; one HTTP child timeout preserved INCONCLUSIVE.
- [x] Independent re-review or new feature work is not part of verification. — reconciled against merged-main proof, review attestation, and exact cleanup evidence.

## Closeout

- [x] Proof written and read back for merged origin/main fdaededc.
- [x] PR #165 confirmed MERGED on 2026-08-22T16:51:48Z.
- [x] Worktree and branch cleanup pending; release_ticket follows cleanup. — reconciled against merged-main proof, review attestation, and exact cleanup evidence.

- [x] Exact .worktrees/core-044 and core-044-source-fetch-remediation removed; git worktree prune completed.


## 2026-08-23 Done reconciliation

All previously unticked items were reconciled against the ticket's merged-main proof, review/closeout records, or an explicit INCONCLUSIVE disposition already preserved there. No external or hosted limitation was upgraded to PASS by this edit.
