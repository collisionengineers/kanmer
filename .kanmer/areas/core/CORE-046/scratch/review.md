---
kind: review-attestation
pr: "167"
head_sha: "0f7ccc4efad0aeae2295f3ba08e0b6e886356679"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "ace33284bd12be7c"
ticket_updated: "2026-08-22T10:50:37.878Z"
findings:
  - id: F-003
    severity: blocker
    summary: "Fixed by merged CORE-047"
    disposition: fixed-in-child
    reason: "Cumulative head has tokenized owner markers, token-aware release with the second sweep, active-owner quarantine retention, and deterministic release-order/third-claimant regressions. CORE-047 latest PASS is bound to 67e2be792e8480d29df7ff13128fb8c7886056a9 and reports IO18/18, focused core 109/109, full core 296/296, and plugin parity PASS."
  - id: F-009
    severity: blocker
    summary: "All inherited destination requirements remain closed"
    disposition: fixed-in-parent
    reason: "Cumulative source retains mapped/prior special-use handling, adds 192.175.48.0/24, 64:ff9b:1::/48, 100:0:0:1::/64, and 5f00::/16, and retains the redirect/linked-hop DNS regression. Source is 14/14 and HTTP is 82/82."
  - id: PR-167-P2
    severity: major
    summary: "Transient quarantine rename errors bypass bounded retry"
    disposition: open
    reason: "recoverStaleLock calls options.renameStaleLock directly and only treats ENOENT as a race. Default fs.rename rethrows Windows EPERM/EBUSY/EACCES instead of using existing renameWithRetry. This remains an unresolved PR #167 thread and conflicts with the plan/files bounded-retry requirement."
  - id: REPORT-TRACE
    severity: major
    summary: "Report and board traceability predate the CORE-047 merge"
    disposition: open
    reason: "PR head is 0f7ccc4efad0aeae2295f3ba08e0b6e886356679, but item commits only contain 54651a3c77b8ca8d02d9d309e36baf9b62ebca3c and report claims pre-child 294/294 and IO16/16. Refresh current-head traceability/evidence before merge."
  - id: PR-167-P1-thread
    severity: major
    summary: "Original quarantined-inode thread is fixed but unresolved"
    disposition: fixed-in-head-awaiting-thread-resolution
    reason: "Current code and CORE-047 adversarial evidence close the P1 finding, but GitHub still reports the old inline thread unresolved; disposition it before the hosted merge gate."
---
# Independent review — CORE-046

## Scope

I independently read the complete CORE-046 packet, HZN-007 context, FRD-027, ADR-0020, prior CORE-046 NEEDS-CHANGES review, and latest CORE-047 PASS. PR #167 is open at exact cumulative head 0f7ccc4efad0aeae2295f3ba08e0b6e886356679, based on CORE-045 1234264b292e574d38f276b91592ea0b8bef9361. The four-commit compare is scoped to the five planned files (core IO/tests, MCP source/tests, regenerated plugin); this head merges CORE-047 PR #169 into CORE-046.

## F-003

PASS for the prior blocker. The cumulative IO implementation carries unique owner tokens/marker leases, token-aware release, second cleanup sweep, active-owner quarantine retention, and release-order/third-claimant regressions. Child probes reported no leftover lock/quarantine and preserved a third claimant until release. Inherited IO assertions remain. Genuine Windows crash/PID-reuse/process-termination timing remains INCONCLUSIVE.

## F-009

PASS. The classifier rejects 192.175.48.0/24, 64:ff9b:1::/48, 100:0:0:1::/64, and 5f00::/16 while retaining mapped IPv4 and prior special-use ranges. The source fixture proves DNS before each redirect/linked request (seven lookups for the three-hop fixture). FRD-027 HTTPS/same-origin/bounded retrieval and ADR-0020 preference-not-authority remain intact.

## Remaining blockers

Raw quarantine rename does not use the existing bounded retry helper for Windows EPERM/EBUSY/EACCES. Fix it or explicitly amend and accept the fail-closed contract, with a regression. Refresh the post-child report and item commit list to the cumulative head; the old SHA is reachable but does not identify the reviewed head. The original P1 GitHub thread is code-fixed but unresolved.

## Evidence and limits

- CORE-047 latest PASS: IO18/18; focused core 109/109; full core 296/296; core typecheck/build, source14/14, plugin parity/handshake, and diff-check PASS.
- CORE-046 recorded parent evidence: HTTP82/82, scripts88/88, protocol46/46, discovery13/13, all-workspace typecheck/build, plugin/docs/skills/agents/diff PASS. These pre-child figures must be distinguished in the refreshed report.
- No hosted workflow run is associated with exact head 0f7ccc4efad0aeae2295f3ba08e0b6e886356679.
- Live DNS rebinding, PID reuse, process termination, exact crash timing, and genuine Windows-host evidence are explicitly INCONCLUSIVE.

## Verdict

NEEDS-CHANGES. F-003 and all inherited F-009 acceptance requirements are closed in code, but unresolved transient-rename handling and stale post-child report/traceability prevent a clean independent PASS. No source change, merge, stage move, or cleanup was performed.
