---
kind: review-attestation
pr: "166"
head_sha: "0f9af92ba7bf332a3fffbc49b3273bd71b59c49a"
base_sha: "33f32e3aae9819f1c2344863272dacb5c958fbac"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "0b7d3955fc42a058"
ticket_updated: "2026-08-22T10:23:07.802Z"
findings:
  - id: F-003
    severity: blocker
    summary: "Stale-lock ownership race is fixed by the merged CORE-046/047/049/050 stack"
    disposition: fixed-in-child
    reason: "The cumulative head carries exact-inode quarantine, owner tokens, per-attempt revalidation, active replacement protection, cleanup-error propagation, and deterministic adversarial regressions. The cumulative IO rail is 22/22."
  - id: F-009-MISSING-RANGES
    severity: blocker
    summary: "Previously missing non-global ranges are fixed in the cumulative stack"
    disposition: fixed-in-child
    reason: "The cumulative classifier adds 192.175.48.0/24, 64:ff9b:1::/48, 100:0:0:1::/64, and 5f00::/16 while retaining mapped and prior special-use handling; source evidence is 14/14."
  - id: PR-166-IPV4-WIDE
    severity: major
    summary: "IPv4 classifier still rejects globally reachable exceptions"
    disposition: open
    reason: "packages/mcp-server/src/sources.ts still uses (a === 192 && b === 0), (a === 192 && b === 31 && c === 196), and (a === 192 && b === 52 && c === 193), which reject the complete blocks rather than only their non-global subranges. This still rejects documented protocol-anycast exceptions such as 192.0.0.9/.10 and preserves the original PR #166 P2 finding."
  - id: PR-166-IPV6-WIDE
    severity: major
    summary: "IPv6 documentation classifier still matches 3fff/16 instead of 3fff/20"
    disposition: open
    reason: "The cumulative sources.ts still contains first === 0x3fff, rejecting all of 3fff::/16, including public addresses from 3fff:1000:: through 3fff:ffff::. The original PR #166 P2 finding remains open."
  - id: PR-166-RECOVERY-ERROR
    severity: major
    summary: "Final recovery claim still rethrows the original EEXIST"
    disposition: open
    reason: "withExclusiveFileLock records retryError after a successful stale recovery followed by a failed claim, but the final attempt still executes throw error rather than propagating the actionable retry error. This preserves the original PR #166 P2 error-surfacing finding."
  - id: PR-166-TRACE
    severity: major
    summary: "Parent report and item traceability are stale for the cumulative head"
    disposition: open
    reason: "PR #166 now points at 0f9af92b after merged CORE-046/047/049/050, but CORE-045 item metadata and post-implementation report still record only implementation 1234264b and pre-child evidence. Child reports are readable, but the parent packet must record the cumulative head/lineage before merge."
  - id: PR-166-THREADS
    severity: major
    summary: "Parent PR threads remain unresolved while three findings are still open"
    disposition: open
    reason: "GitHub still shows the inherited PR #166 inline findings. The stale-lock P1 and missing-range P1 are fixed by child work, but the over-broad IPv4/IPv6 and recovery-error threads are not closed by the cumulative diff."
  - id: HTTP-BOUNDARY
    severity: minor
    summary: "Broad HTTP readiness timing remains an inherited boundary"
    disposition: preserved-inconclusive
    reason: "The cumulative packet preserves the broad MCP HTTP 81/82 readiness timing and isolated readiness 7/7; no assertion was weakened."
  - id: HOSTED-LIVE
    severity: minor
    summary: "Hosted and live external evidence is unavailable"
    disposition: inconclusive
    reason: "No hosted workflow run is claimed for the cumulative head. Live Windows handle/crash/PID-reuse/process-termination, DNS-rebinding, and packaged/live-host evidence remain INCONCLUSIVE."
---
# Independent review - CORE-045 cumulative head

## Verdict

NEEDS-CHANGES for PR #166 at exact cumulative head 0f9af92ba7bf332a3fffbc49b3273bd71b59c49a, based on 33f32e3aae9819f1c2344863272dacb5c958fbac. The merged CORE-046/047/049/050 stack closes the stale-lock ownership and previously missing destination-range findings, but the inherited parent code still has three concrete correctness blockers and stale parent traceability. No source, merge, move, or cleanup was performed.

## Scope and lineage

The exact PR compare is ten commits and five planned files: packages/core/src/io.ts, packages/core/src/io.test.ts, packages/mcp-server/src/sources.ts, packages/mcp-server/src/sources.test.mjs, and the regenerated standalone plugin artifact. The cumulative head is the non-squash merge of PR #167 into CORE-045. I read the complete CORE-045 packet, HZN-007 context, FRD-027, ADR-0020, CORE-046/049/050 reports and independent attestations, and the current PR #166 thread set.

## Finding audit

- F-003 stale-lock ownership is closed by the child stack: tokenized ownership, exact identity checks, retry revalidation, active-marker claimant protection, and cleanup error propagation are covered by IO 22/22.
- The added 192.175.48.0/24, 64:ff9b:1::/48, 100:0:0:1::/64, and 5f00::/16 checks close the originally missing ranges.
- The original PR #166 IPv4 exception finding remains: 192.0.0.0/24 and the 192.31.196.0/24 and 192.52.193.0/24 matches are broader than the non-global subranges requested.
- The original PR #166 IPv6 documentation finding remains: first === 0x3fff is /16, not the required 3fff::/20.
- The original PR #166 recovery-error finding remains: final contention throws the earlier EEXIST instead of a subsequent non-EEXIST claim error.

## Evidence and limits

- Cumulative IO: 22/22 PASS.
- Combined child core IO/source/store: 113/113 PASS.
- Source: 14/14 PASS; typecheck/build/plugin parity PASS.
- Inherited CORE-045 evidence: core 106/106, source 13/13, scripts 88/88, protocol 46/46, discovery 13/13, and HTTP 81/81 before the child stack.
- Cumulative broad HTTP remains 81/82 due unchanged readiness timing; isolated readiness is 7/7.
- No hosted workflow run is claimed for this exact head. Live Windows and DNS-rebinding limits remain INCONCLUSIVE.

## Required disposition

Narrow the over-broad IPv4 and IPv6 predicates, propagate the final recovery claim error, refresh CORE-045 report/item traceability to the cumulative head and child lineage, then request fresh independent review. No merge or cleanup was performed.
