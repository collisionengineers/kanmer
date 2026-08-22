# Independent review — CORE-051 / PR #173

- Reviewer: independent reviewer (not `codex-core051-executor`).
- Exact reviewed head: `67a066d351e3f7924f87f7580a74c98e7b94cbb2`.
- Exact PR/base: PR #173, `core-051-destination-error-remediation` → `core-045-lock-dns-remediation`; base `0f9af92ba7bf332a3fffbc49b3273bd71b59c49a`.
- GitHub state at review: OPEN, CLEAN, MERGEABLE; `gh pr checks` reports no checks on the branch.
- Scope diff: `packages/core/src/io.ts`, `packages/core/src/io.test.ts`, `packages/mcp-server/src/sources.ts`, `packages/mcp-server/src/sources.test.mjs`, and regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs`. No unrelated source/provider/editor changes observed.

## Findings and dispositions

1. CORE-045 P1 stale-lock atomic reclaim (PR166 thread 3835806972): fixed in inherited CORE-046/047 lineage; exact cumulative base includes the tokenized ownership/quarantine regressions.
2. CORE-045 P2 public IPv4 exceptions (3835806975): fixed in this head. 192.0.0.9/.10, 192.31.196/24, 192.52.193/24, and 192.175.48/24 are allowed while actual non-global subranges remain rejected.
3. CORE-045 P2 IPv6 documentation boundary (3835806976): fixed in this head; `3fff::/20` rejects `3fff:0fff::` and permits `3fff:1000::`.
4. CORE-045 P2 actionable final claim error (3835806978): fixed in this head; a post-recovery EACCES is preserved instead of the obsolete EEXIST.
5. CORE-045 P1 remaining local IPv6 ranges (3835806979): fixed in this head; `64:ff9b:1::/48` and `fec0::/10` are rejected.
6. CORE-045 P2 released quarantine ENOENT race (3836028223): fixed in inherited CORE-049 lineage.
7. CORE-045 P2 public 2001:20::/28 exception (3836028224): fixed in this head.
8. CORE-045 P1 NAT64 embedded IPv4 (3836028225): fixed in this head; `64:ff9b::/96` derives and classifies the embedded IPv4.
9. CORE-045 P1 claimant marker cleanup (3836028226): the marker is attempted in a finally path in this head, but the current PR173 finding remains valid: when lock inspection fails and marker removal also fails, the nested finally rethrows only the inspection error and suppresses the cleanup error. Current thread/comment: PR173 review comment 3836046591 / thread `PRRT_kwDOT2PEds6bYwu4`. This is not fixed by PR173 and is tracked by linked blocking CORE-053 (`core-053-marker-cleanup-error`, implementing, blocks CORE-051).

## Evidence

- Focused core IO: `npm test -w @kanmer/core -- src/io.test.ts` — exit 0, 24/24.
- Focused source rail: `node --test packages/mcp-server/src/sources.test.mjs` — exit 0, 14/14.
- Full @kanmer/core suite: exit 0, 302/302.
- @kanmer/core and @kanmer/mcp-server typechecks: exit 0.
- `git diff --check`: exit 0.
- `npm run plugin:check`: exit 0; 37 tools, byte parity, 12 skill frontmatters, isolated MCP handshake.
- Author-reported build/plugin/script rails remain consistent with the packet; first linked-worktree standalone-build failure is retained as INCONCLUSIVE rather than erased.
- Broad HTTP readiness and live Windows/DNS/provider evidence remain INCONCLUSIVE per CORE-045; no external claim is made.

## Verdict

NEEDS-CHANGES. PR #173 is not merge-ready because the cleanup-error finding is substantive and has a linked blocking remediation ticket CORE-053. No merge, move, source edit, or worktree cleanup performed. Re-review the exact new CORE-053-inclusive head after its deterministic cleanup-error regression and cumulative traceability land.

# Fresh cumulative independent review — CORE-051 / PR #173

- Reviewer: independent reviewer (not `codex-core051-executor`).
- Exact reviewed PR head: `36b57a93b6b22f10672d571fb68c160d4766cfc5` (non-squash merge of child PR #174).
- Exact base: `core-045-lock-dns-remediation` at `0f9af92ba7bf332a3fffbc49b3273bd71b59c49a`.
- PR #173 is OPEN, CLEAN, and MERGEABLE; no hosted checks are reported.
- The PR head tree exactly matches independently reviewed child commit `695e12ee659b927513c7e0190a81d5ecb9e8c513`; the child is an ancestor of the cumulative head.
- Refreshed CORE-051 report/item records child implementation `695e12ee`, child merge `36b57a93`, PRs #173/#174, and the cumulative evidence.

## Findings and dispositions

- CORE-045 stale-lock atomic reclaim P1 (3835806972): fixed in inherited CORE-046/047 tokenized ownership/quarantine lineage.
- CORE-045 public IPv4 exceptions P2 (3835806975): fixed; 192.0.0.9/.10 and globally reachable 192.31.196/24, 192.52.193/24, 192.175.48/24 are retained.
- CORE-045 3fff IPv6 boundary P2 (3835806976): fixed as `3fff::/20`.
- CORE-045 final recovery claim error P2 (3835806978): fixed; actionable post-recovery errors are preserved.
- CORE-045 remaining local IPv6 P1 (3835806979): fixed for `64:ff9b:1::/48` and `fec0::/10`.
- CORE-045 released-quarantine ENOENT P2 (3836028223): fixed in CORE-049 lineage.
- CORE-045 public 2001:20::/28 P2 (3836028224): fixed.
- CORE-045 NAT64 embedded IPv4 P1 (3836028225): fixed for `64:ff9b::/96`.
- PR173 claimant-marker cleanup P2 (comment 3836046591, thread `PRRT_kwDOT2PEds6bYwu4`): fixed by CORE-053/PR #174. Cleanup now attempts lock and marker removal independently and surfaces all failures in AggregateError; deterministic child regression asserts EEXIST/EACCES/EBUSY. Thread is ready to resolve after this PASS.

## Evidence

- Focused IO: 25/25.
- Full @kanmer/core: 303/303.
- Source rail: 14/14.
- Core typecheck/build: PASS.
- Plugin build/check and standalone byte parity: PASS.
- Diff check: PASS.
- Child CORE-053 received an independent PASS at exact commit `695e12ee` and was merged non-squash at `36b57a93`.
- Live Windows EBUSY, live DNS/rebinding, and broad HTTP readiness remain explicitly INCONCLUSIVE; no external claim is fabricated.

## Verdict

PASS, SHA-bound to `36b57a93b6b22f10672d571fb68c160d4766cfc5`. Resolve the fixed PR173 cleanup thread, revalidate exact head/base/merge state, then merge PR #173 non-squash into CORE-045. Do not move or merge CORE-045, and do not verify or clean up.

## Merge result

After resolving the fixed PR173 cleanup thread, final state validation matched head `36b57a93b6b22f10672d571fb68c160d4766cfc5`, base `0f9af92ba7bf332a3fffbc49b3273bd71b59c49a`, OPEN/CLEAN/MERGEABLE. PR #173 was merged non-squash into `core-045-lock-dns-remediation` at merge SHA `02389045b7d26ad46e470af1d96a3084b486bf68` on 2026-08-22T12:51:54Z. CORE-051 moved Review → Verifying. CORE-045 was not moved or merged; no verification or cleanup performed.
