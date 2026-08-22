# Checklist — CORE-045 lock recovery and public destination classification

- [x] Add PID/timestamp lock metadata and bounded stale-lock options without changing normal lock callers.
- [x] Recover only old locks with demonstrably dead owners; preserve fresh, active, malformed, uncertain, and racing locks fail-closed.
- [x] Add deterministic core lock tests for stale recovery, active protection, callback cleanup, and bounded retries.
- [x] Complete non-global IPv4/IPv6 and IPv4-mapped destination classification without dependencies.
- [x] Add deterministic source lookup tests for special-use/documentation/benchmark/reserved/mapped/public ranges and redirect reuse.
- [x] Run focused source/core tests, typecheck/build, authoritative HTTP/source rail, and proportionate docs/plugin/diff checks; preserve first failures. Core 106/106, source 13/13, HTTP 81/81, scripts 88/88, protocol 46/46, discovery 13/13, typecheck/build/plugin/docs rails pass.
- [x] Write the post-implementation report mapping F-003/F-009, record commit/PR/base and evidence limits, and update scratch.
- [x] Re-read get_doc_gates, record traceability, push stacked PR #166, move Implementing → Review one boundary, and stop for independent review.

---

## Verification correction — CORE-045

The prior cumulative-only closeout was reversed after reachability audit. The exact branch proof is preserved, but it is not merged-main proof: origin/main is 34245be039e8fd8395b5e31835602c54e62e98a4 and does not contain the CORE-045 merge/cumulative lineage. Ticket remains Verifying; branch/worktree were restored. No closeout or release was authorized.

- [x] PR merge verified into its stated feature-branch base (PR #166)
- [ ] proof.md finalised for merged-main verification
- [ ] Moved to final stage
- [x] Outcome records the exact cumulative basis and no-origin-mainline claim
- [ ] worktree removed
- [ ] branch deleted
- [x] fetch/prune performed during correction
- [ ] take_ticket release

## Merged-main verification / closeout

- [x] Reverified all recorded commits reachable from origin/main fdaededc; exact merged-main proof replaces the old feature-branch-only proof.
- [x] IO 32/32, source 32/32, core/store 91/91, typecheck, scripts/docs/skills/agents/diff rails recorded; HTTP child timeout remains INCONCLUSIVE.
- [x] PR #166 was already merged into the reachable cumulative lineage.
- [ ] Worktree/branch cleanup and release pending.

## Final closeout

- [x] Proof rewritten against reachable origin/main fdaededc and merged-main deterministic rails read back.
- [x] PR #166 confirmed MERGED on 2026-08-22T12:55:09Z.
- [ ] Exact worktree/branch cleanup and release pending.

- [x] Removed .worktrees/core-045 and deleted core-045-lock-dns-remediation after merged PR confirmation; pruned worktrees.
