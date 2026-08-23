# Checklist — CORE-049

- [x] Read complete CORE-046/047 packets and identify existing retry helper.
- [x] Route stale quarantine rename through bounded retry.
- [x] Add EPERM/EBUSY/EACCES deterministic regression coverage.
- [x] Preserve ownership/concurrency/source tests.
- [x] Regenerate plugin artifact and run parity checks if source changes.
- [x] Refresh cumulative CORE-046 report and exact traceability.
- [x] Disposition fixed PR thread with evidence.
- [x] Request independent cumulative review.

---

## Verification correction — CORE-049

The prior cumulative-only closeout was reversed after reachability audit. The exact branch proof is preserved, but it is not merged-main proof: origin/main is 34245be039e8fd8395b5e31835602c54e62e98a4 and does not contain the CORE-049 merge/cumulative lineage. Ticket remains Verifying; branch/worktree were restored. No closeout or release was authorized.

- [x] PR merges verified into stated feature-branch bases (PRs #171 and #172)
- [ ] proof.md finalised for merged-main verification
- [ ] Moved to final stage
- [x] Outcome records the exact cumulative basis and inherited/hosted/live INCONCLUSIVE boundaries
- [ ] worktree removed
- [ ] branch deleted
- [x] fetch/prune performed during correction
- [ ] take_ticket release

---

## Closeout — CORE-049

- [x] PR merge verified (`gh pr view --json state,mergedAt`)
- [x] proof.md finalised (merged-main reachability, evidence, PR URL and merge date recorded)
- [x] Moved to final stage
- [x] Outcome recorded in ticket body (PR link, follow-ups)
- [x] cd out of worktree; exact recorded worktree removal completed
- [x] exact recorded branch deletion completed locally and remotely
- [x] git fetch --prune + git worktree prune completed
- [x] take_ticket action: "release" completed
