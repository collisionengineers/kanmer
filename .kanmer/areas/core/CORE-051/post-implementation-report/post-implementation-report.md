# Post-implementation report — CORE-051

## Scope delivered

- Narrowed IPv4 destination policy to actual non-global ranges, retaining the public 192.0.0.9/.10 protocol-anycast exceptions and globally reachable 192.31.196/24, 192.52.193/24, and 192.175.48/24 ranges.
- Corrected the 3fff::/20 boundary, retained 2001:20::/28 as public, rejected deprecated fec0::/10 site-local space, and validated embedded IPv4 in NAT64 64:ff9b::/96 while retaining 64:ff9b:1::/48 rejection.
- Preserved the actionable final post-recovery claim error, handled released-quarantine ENOENT as a retryable race, and guaranteed claimant-marker cleanup when lock inspection fails.
- Regenerated `plugins/kanmer/mcp/kanmer-mcp.cjs` and retained all inherited IO/source assertions.

## Traceability

- Base: CORE-045 cumulative head `0f9af92ba7bf332a3fffbc49b3273bd71b59c49a`.
- Implementation commits: `5cd42532`, `6f206ae3`, `67a066d3`, and child `695e12ee` (full SHAs recorded on the ticket).
- PRs: #173 and child #174. Child #174 was independently reviewed PASS and merged non-squash into this branch at `36b57a93b6b22f10672d571fb68c160d4766cfc5`.
- The child remediation is complete; CORE-051 now awaits a fresh cumulative review at the merged branch head before its own merge.

## Verification (exact exits)

- `npm test -w @kanmer/core -- src/io.test.ts`: exit 0, 25/25 after child.
- `npm test -w @kanmer/core`: exit 0, 303/303 after child.
- `node --test packages/mcp-server/src/sources.test.mjs`: exit 0, 14/14.
- `npm run build -w @kanmer/core`: exit 0.
- `npm run build -w @kanmer/mcp-server`: exit 0 after worktree-local core resolution.
- `npm run typecheck -w @kanmer/core`: exit 0.
- `npm run typecheck -w @kanmer/mcp-server`: exit 0.
- `npm run plugin:build`: exit 0.
- `npm run plugin:check`: exit 0 (37 tools, byte parity).
- `npm run test:scripts`: exit 0, 88/88.
- First standalone MCP build attempt exited 1 because linked-worktree resolution used stale main-checkout `@kanmer/core` dist; the corrected worktree-local resolution rerun passed. The first environment-sensitive failure is preserved as INCONCLUSIVE, not erased.
- CORE-053 independent review evidence: IO 25/25, core 303/303, typecheck/build/plugin parity/diff PASS; live Windows EBUSY remains INCONCLUSIVE.

## Boundaries

Broad HTTP readiness and live Windows/DNS/provider evidence remain INCONCLUSIVE as inherited from CORE-045. No new source kinds, transports, providers, or external-network claims were introduced.

## Review stop

The child remediation is merged into the CORE-051 branch. A fresh independent cumulative review is required before CORE-051 itself is merged; the author will not self-review, merge, verify, or clean up.
