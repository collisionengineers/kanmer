---
kind: review-attestation
pr: "166"
head_sha: "1234264b292e574d38f276b91592ea0b8bef9361"
verdict: needs-changes
reviewer: "gui099-executor"
independent: true
plan_hash: "0b7d3955fc42a058"
ticket_updated: "2026-08-22T10:23:07.802Z"
findings:
  - id: F-003
    severity: blocker
    summary: "Stale-lock recovery"
    disposition: fixed
    reason: "Valid JSON dead/stale locks recover only after age and liveness checks; fresh, active, malformed, uncertain and racing records remain protected. Legacy PID-only records use mtime and recover only when stale/dead. Callback failure releases the claim. The inherited renameWithRetry/writeFileAtomic/TMP_FILE_RE tests remain unchanged and the IO suite is 15/15."
  - id: F-009
    severity: blocker
    summary: "Complete non-global IPv4/IPv6 destination policy"
    disposition: open
    reason: "The classifier still omits registered non-global special-use blocks, including IPv4 192.175.48.0/24 and IPv6 100:0:0:1::/64, 64:ff9b:1::/48, and 5f00::/16. The IANA registries mark these special-purpose ranges non-globally reachable; the plan requires complete known non-global coverage. DNS is called before current, response and redirect targets, but the new tests do not exercise lookup invocation on a redirect/linked hop."
---
# Independent review — CORE-045

## Verdict

NEEDS-CHANGES. CORE-045 correctly remediates stale-lock recovery for the requested valid, legacy, fresh, active, malformed-text, uncertain, callback-cleanup and race-recheck paths, but F-009 is not complete. The classifier and deterministic fixture list omit known non-global special-purpose ranges, so the remote SSRF boundary remains incomplete.

## Packet and stacked diff

I read the complete CORE-045 research, files, plan, checklist, open-questions, post-implementation report and execution scratch; HZN-007 context; FRD-027; ADR-0020; the linked CORE-044 review attestation; and the exact diff from CORE-044 head 33f32e3aae9819f1c2344863272dacb5c958fbac to 1234264b292e574d38f276b91592ea0b8bef9361. The five-file diff is scoped to core IO/tests, MCP source classifier/tests and the regenerated plugin bundle. Inherited IO tests are preserved unchanged; three lock tests bring that file to 15 tests.

## F-003 audit

- PASS: dead/stale JSON lock recovery requires both age and a demonstrably dead PID.
- PASS: fresh, active, malformed text, and liveness-uncertain records remain protected and surface bounded EEXIST.
- PASS: legacy PID-only records use mtime as the age source and recover only when stale/dead.
- PASS: callback failures unlink the claimed lock.
- PASS: the implementation re-reads contents and mtime before unlinking; a race after inspection must re-claim exclusively or surface contention.
- INCONCLUSIVE by design: PID reuse and exact process termination between inspection and unlink require an OS stress harness and remain parked as the ticket states.

## F-009 audit

The source code calls the destination check before each current request, after each response URL, and before each redirect target; lookup errors and empty results fail closed. The classifier covers the ranges exercised by the 13-test source suite and mapped IPv4 in dotted and hexadecimal forms. However, the complete special-use contract is not met: IANA IPv4 Special-Purpose Registry (https://www.iana.org/assignments/iana-ipv4-special-registry) includes 192.175.48.0/24, and IANA IPv6 Special-Purpose Registry (https://www.iana.org/assignments/iana-ipv6-special-registry) includes non-globally-reachable 100:0:0:1::/64, 64:ff9b:1::/48 and 5f00::/16, none of which the classifier rejects. The redirect/linked-hop lookup seam is present in code but is not directly asserted by the new fixture.

## Verification evidence

- PASS exit 0: npm run test -w @kanmer/core -- src/io.test.ts src/sources.test.ts src/store.test.ts — 106/106, including IO 15/15.
- PASS exit 0: node --test packages/mcp-server/src/sources.test.mjs — 13/13.
- PASS exit 0: npm run test:http -w @kanmer/mcp-server — 81/81.
- The report records PASS for typecheck/build/plugin/smoke/docs/skills/managed-block/diff rails; no associated hosted workflow runs were returned for head 1234264b292e574d38f276b91592ea0b8bef9361, and PR #166 has no review threads/comments. Live DNS rebinding, PID reuse and exact crash timing remain INCONCLUSIVE.

## Required remediation

Add the omitted non-global special-use ranges and deterministic tests, plus a redirect/linked-hop lookup invocation regression if the “before every hop” claim is retained. Re-run the source/HTTP and relevant workspace rails, update the report/checklist and this SHA-bound attestation, and request fresh independent review. No merge, move or cleanup was performed.
