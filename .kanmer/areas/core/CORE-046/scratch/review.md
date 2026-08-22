---
kind: review-attestation
pr: "167"
head_sha: "54651a3c77b8ca8d02d9d309e36baf9b62ebca3c"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "ace33284bd12be7c"
ticket_updated: "2026-08-22T10:50:37.878Z"
findings:
  - id: F-003
    severity: blocker
    summary: "Stale-lock quarantine still has a TOCTOU ownership race"
    disposition: open
    reason: "The implementation rechecks the stale inode before fs.rename, but that is not an atomic compare-and-swap. If reclaimer B quarantines the old inode, claims the original path, and recreates a fresh lock before reclaimer A executes its already-authorized rename, A can move B's fresh lock into A's quarantine. A deterministic injected ordering reached both rename callbacks and both withExclusiveFileLock promises fulfilled; the existing regression only covers A winning before B attempts the rename and does not cover B winning before A's rename."
  - id: F-009
    severity: blocker
    summary: "Complete non-global IPv4/IPv6 destination policy and per-hop DNS checks"
    disposition: fixed
    reason: "The classifier now rejects IPv4 192.175.48.0/24, IPv6 64:ff9b:1::/48, 100:0:0:1::/64 and 5f00::/16, while retaining mapped handling. The source regression covers each range, and the redirect/linked-hop fixture asserts seven DNS lookups across root, redirect and linked requests."
---
# Independent review — CORE-046

## Verdict

NEEDS-CHANGES. CORE-046 fixes the missing F-009 ranges and adds the requested redirect/linked-hop DNS invocation proof, but the stale-lock remediation still has a true ownership race in F-003. The branch must not merge until the quarantine claim is atomic with respect to replacement locks and the reversed-order race is tested.

## Packet and stacked diff

I read the complete CORE-046 research, files, plan, checklist, open-questions, post-implementation report and execution scratch; HZN-007 context; FRD-027; ADR-0020; both CORE-045 independent NEEDS-CHANGES attestations; and the exact five-file diff from CORE-045 head 1234264b292e574d38f276b91592ea0b8bef9361 to PR #167 head 54651a3c77b8ca8d02d9d309e36baf9b62ebca3c. The diff is scoped to core IO/recovery tests, MCP source classification/tests and the regenerated plugin bundle. Inherited IO atomic-write/rename/TMP_FILE_RE tests remain present.

## F-003 audit

PASS for the ordinary paths: valid JSON stale/dead records, fresh records, active records, malformed records, liveness uncertainty, legacy PID-only records, callback cleanup, and the original race ordering. The new IPv4/IPv6 work does not affect this code.

BLOCKER: recoverStaleLock performs a read/stat identity check and then independently calls fs.rename(lockFile, quarantineFile). That sequence cannot guarantee ownership of the identity just checked. I reproduced the missing ordering with an injected renameStaleLock callback: both reclaimers entered their callbacks, B moved and removed the stale inode and claimed the original path, then A moved B's fresh replacement into A's quarantine; both withExclusiveFileLock calls fulfilled. The output was "both callbacks entered { aEntered: true, bEntered: true }" followed by both promises fulfilled. The current regression coordinates A to rename first, so B receives ENOENT; it does not exercise B winning and A renaming after the replacement claim.

The remediation must use an atomic ownership-safe quarantine protocol that cannot rename a fresh replacement after the stale identity has changed, and must add the reversed-order regression. PID reuse, process termination between inspection and reclaim, and host crash timing remain INCONCLUSIVE as the ticket states.

## F-009 audit

PASS. The source classifier rejects IPv4 192.175.48.0/24 and IPv6 64:ff9b:1::/48, 100:0:0:1::/64 and 5f00::/16, with prior special-use and mapped IPv4 coverage retained. The source fixture covers the ranges. The HTTP source test rechecks DNS before every request and asserts seven lookups over the root, redirect target and linked documents; redirect and linked-hop lookup assertions are therefore present.

## Verification evidence

- PASS exit 0: npm run test -w @kanmer/core -- src/io.test.ts src/sources.test.ts src/store.test.ts — 107/107, including IO 16/16.
- PASS exit 0: node --test packages/mcp-server/src/sources.test.mjs — 14/14.
- PASS exit 0: npm run test:http -w @kanmer/mcp-server — 82/82.
- The report records PASS for the broader core 294/294, scripts 88/88, protocol 46/46, discovery 13/13, typecheck/build/plugin/docs/skills/managed-block/diff rails. The report also preserves the initial IO timeout and stale root-core build/junction setup failure before successful reruns. No hosted workflow runs were returned for PR #167 head 54651a3c77b8ca8d02d9d309e36baf9b62ebca3c; live DNS rebinding, PID reuse and exact crash timing remain INCONCLUSIVE.

## Required remediation

Fix the stale-lock quarantine ownership race, add the reversed-order concurrent regression, rerun the IO and relevant workspace rails, update the report/checklist and request fresh independent review. No merge, move or cleanup was performed.
