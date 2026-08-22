test

## Independent review — NEEDS-CHANGES

- Reviewed SHA: `13b6ce22a8363c0f467e96c775eb9a09891b7bb2`
- Base: `3a05ab7a21f55152a4f493169300ac9e622baab7` (`core-026-project-declared-sources`)
- PR: #202
- Review date: 2026-08-22

### Evidence

- `node --test packages/mcp-server/src/sources.test.mjs` — exit 0, 24/24 passed.
- `git diff --check 3a05ab7a21f55152a4f493169300ac9e622baab7..13b6ce22a8363c0f467e96c775eb9a09891b7bb2` — exit 0.
- The packet's recorded core/server typecheck, builds, scripts (88/88), and aggregate source evidence were inspected; live external-provider/network behavior remains INCONCLUSIVE as documented.

### Required changes

1. **P2 — validator scope across redirects (automated finding #3836700730).** `fetchText` initializes `requestHeaders` with the cached manifest validators and carries them through every redirect hop. A same-origin intermediate redirect can evaluate the final document's `If-None-Match`/`If-Modified-Since` and return 304; the implementation then treats that as the cached representation's response before reaching the final target. Scope validators to the cached final URL: do not send them on redirect hops, and attach them only when requesting the final cached document (or otherwise prove the redirect chain cannot consume them).

2. **P2 — preserve concurrent `force` semantics (automated finding #3836700726).** `fetchLlmsTxt` joins any existing `activeRefreshes` promise before considering `options.force`. A normal fetch that is checking a fresh cache can therefore cause a concurrent `force: true` caller to receive the ordinary cached result without performing the promised forced revalidation. Check `options.force` before coalescing, or await the active request and then run a forced refresh; add a deterministic concurrency regression.

### Dispositions for the seven CORE-081 findings

- Same-origin manifest redirect validator handling: **NEEDS-CHANGES** — the two-hop validator bug above remains.
- Cancel response bodies on every early abandon: **PASS** — 24/24 includes the early-abandon cancellation regression.
- Wait/reuse active refresh beyond the short lock retry: **PASS** — deterministic concurrent refresh test passes.
- Explicit request identity/content encoding behavior: **PASS for the current documented identity contract** — `Accept-Encoding: identity` is asserted; no external compressed-provider claim made.
- Charge partial read failures to aggregate budget: **PASS** — deterministic partial-read test passes.
- Bound linked-page discovery at 32: **PASS** — hard page cap test passes.
- Surface uncached linked 304 and avoid empty cache writes: **PASS** — root/linked 304 tests pass.

### Scope / lineage

Diff is limited to `packages/mcp-server/src/sources.ts` and `packages/mcp-server/src/sources.test.mjs`; no unrelated changes found. No merge or Review→Verifying move performed. CORE-085 is the linked blocking remediation for these findings; CORE-081 remains open for remediation and independent re-review.

Review scratch integrity note: the initial `test` line was a transport probe before the attestation was appended; it is non-evidence and is superseded by the SHA-bound review below.

Additional command record: the packet-suggested `npm test -w @kanmer/mcp-server -- --run src/sources.test.mjs` was attempted and exited 1 because this workspace has no `test` script; the package's declared deterministic rail is `node --test src/sources.test.mjs`, which exited 0 with 24/24 passing. This does not alter the implementation verdict.
