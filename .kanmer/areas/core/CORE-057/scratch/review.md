## Independent review — CORE-057 / PR #178

### Exact head and changes

Reviewed PR #178 at exact head a3bd18897a536153050f7196e5b6e1460d946235 against parent CORE-044 cumulative head 142af2f3b105b38b00d659019d1cfe99f3b50844. The two-file diff is limited to packages/mcp-server/src/sources.ts and packages/mcp-server/src/sources.test.mjs.

The source change carries the public-destination lookup result into the production request seam and uses Node https.request with a validated-address lookup callback, while preserving the original hostname for HTTPS/SNI. The same AbortSignal starts before resolution and covers resolver waiting, redirects, transport, and body reads. Injected lookup/request seams make the binding and timeout behavior deterministic; existing redirect, public-destination, cache, content-type, and aggregate-byte behavior remains intact.

### Checks

- PASS: node --test packages/mcp-server/src/sources.test.mjs — 16/16.
- PASS: npm run test -w @kanmer/core -- src/io.test.ts src/sources.test.ts src/store.test.ts — 116/116.
- PASS: npm run build:core, npm run build:server, focused core/server typechecks, npm run test:scripts — 88/88, npm run check:manual, npm run verify:docs, and git diff --check.
- PASS: targeted node --test packages/mcp-server/src/tunnels/readiness.test.mjs — 7/7.
- INCONCLUSIVE baseline: the full npm run test:http -w @kanmer/mcp-server rail ran 83/84 because the inherited tunnel-readiness success test timed out once; all source tests passed and the targeted readiness rerun passed 7/7. No touched-suite failure was observed.
- INCONCLUSIVE by design: live DNS rebinding/private-network, Windows/package, hosted CI, and external network evidence are unavailable and are not claimed.

### Dispositions

- DNS-to-request rebinding gap — fixed in PR; validated-address request seam and regression pass.
- Resolver deadline gap — fixed in PR; shared signal/deadline and resolver-timeout regression pass.
- Committed plugin artifact parity — deferred to existing CORE-058, whose explicit scope is regenerating the standalone artifact from a normal checkout and proving plugin parity. The linked-worktree plugin:check failure/stale artifact is recorded as a follow-up boundary, not silently claimed as PASS by this source-only ticket.

### Verdict

PASS — independent review at exact SHA. Merge PR #178 non-squash into core-044-source-fetch-remediation, then move CORE-057 Review -> Verifying. Do not verify or clean up in this review step.

## Merge handoff blocker

PASS review was recorded at exact head a3bd18897a536153050f7196e5b6e1460d946235, but `gh pr merge 178 --merge --delete-branch=false` exited 1: `GraphQL: Pull Request has merge conflicts (mergePullRequest)`. The base core-044-source-fetch-remediation advanced to 3c070662 (CORE-056 non-squash merge), and merge-tree reports a content conflict in packages/mcp-server/src/sources.ts. No branch, source, board stage, or block edge was changed; a new conflict-resolved PR head requires fresh review before merge.

## Fresh-review requirement — 2026-08-22

The prior independent PASS was bound to a3bd1889 and is superseded for merge purposes by the conflict-resolved head 5f63571ecc7d71c102fc134b72d065207b11eae9. No author review or merge was performed; a fresh independent review must inspect the cumulative CORE-056 + CORE-057 diff and the post-sync rails above.
