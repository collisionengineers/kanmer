---
kind: review-attestation
pr: "166"
head_sha: "1234264b292e574d38f276b91592ea0b8bef9361"
base_sha: "33f32e3aae9819f1c2344863272dacb5c958fbac"
verdict: needs-changes
reviewer: "core041-executor"
independent: true
plan_hash: "0b7d3955fc42a058"
---
# Independent review — CORE-045

## Verdict

NEEDS-CHANGES. The stacked scope is correct and the author preserved the inherited IO assertions, but stale-lock recovery still has a concurrent reclaim race and the IPv6 policy omits documented non-global ranges. CORE-044 remains blocked. No merge, move, or cleanup was performed.

## Packet and diff read

I read the complete CORE-045 item and research, files, plan, checklist, open-questions, post-implementation-report, and `scratch/execute.md`; HZN-007 `context.md`; the linked CORE-044 review attestation; FRD-027; ADR-0020; and PR #166's diff at `1234264b292e574d38f276b91592ea0b8bef9361`, based exactly on CORE-044 head `33f32e3aae9819f1c2344863272dacb5c958fbac`. The diff is limited to `packages/core/src/io.ts`, its tests, `packages/mcp-server/src/sources.ts`, its tests, and the regenerated plugin bundle. Governing-doc intent remains preference-only, bounded HTTPS/same-origin retrieval, and fail-closed cache/destination boundaries.

## Findings

### F-001 — blocking: stale-lock recovery is not atomic against concurrent reclaimers

`recoverStaleLock` reads/stat-checks the stale record, rereads it, then calls `fs.rm(lockFile)`. The second read closes neither the TOCTOU gap nor the multi-reclaimer case: reclaimer A can finish its reread, reclaimer B can remove the old lock and claim a new lock, and A can then remove B's newly claimed lock before claiming it itself. The comment that a race after the check fails closed is not true for replacement between the reread and `fs.rm`; the next exclusive claim cannot detect that A already deleted B's lock. This can permit concurrent cache/board writers.

Disposition: open / blocking. Use an atomic compare-and-reclaim mechanism (for example, atomically rename the inspected stale lock to a unique tombstone before deleting it, with ownership of the tombstone determining who may remove it) or an equivalent OS-safe claim, and add a deterministic two-reclaimer race regression while retaining the inherited `renameWithRetry`, `writeFileAtomic`, and `TMP_FILE_RE` assertions.

### F-002 — blocking: IPv6 classifier misses documented non-global ranges

The new parser correctly handles hexadecimal and dotted IPv4-mapped forms and rejects the listed IPv6 examples, but `isPrivateAddress` still allows these current special-purpose non-global destinations:

- `64:ff9b:1::/48` (IPv4-IPv6 translation prefix with Globally Reachable false),
- `100:0:0:1::/64` (dummy IPv6 prefix), and
- `5f00::/16` (SRv6 SID space with Globally Reachable false).

Direct probes against the built head reached the injected fetch seam for representative addresses `64:ff9b:1::1`, `100:0:0:1::1`, and `5f00::1`, so this is not merely a missing assertion. Add these ranges (and any equivalent mapped representation required by the policy) and deterministic rejection tests. The authoritative IANA IPv6 registry records these non-global entries: https://www.iana.org/assignments/iana-ipv6-special-registry.

Disposition: open / blocking. Do not weaken the existing mapped/private checks; retain DNS lookup before every root, redirect, response hop, and linked request.

### Non-blocking verification note — DNS-before-every-hop

The control flow in `fetchText` calls `assertPublicDestination` before each request and again for response/redirect targets, so the code path retains the required per-hop preflight. The existing redirect test does not inject/count `lookupImpl`, so it does not independently prove that call ordering; add that regression with the range fixes rather than claiming an extra hosted proof.

## Evidence

- Independently rerun: `npm run test -w @kanmer/core -- src/io.test.ts` — exit 0, 15/15.
- Independently rerun: `node --test packages/mcp-server/src/sources.test.mjs` — exit 0, 13/13.
- Author-reported and packet-recorded: core focused 106/106; IO 15/15; source 13/13; HTTP 81/81; scripts 88/88; protocol 46/46; discovery 13/13; workspace typecheck/build/plugin/docs/skills/managed-block/diff rails pass.
- PR #166 is open at the exact head above with no hosted check rollup; no hosted PASS is claimed.
- Live DNS rebinding, PID reuse, exact crash timing, and packaged proof remain INCONCLUSIVE as the ticket states.
