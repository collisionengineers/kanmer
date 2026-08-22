# Post-implementation report — MCP-041

## Summary

The bounded tunnel-supervisor retry test now synchronizes on the second child
reaching `running` and the terminal `failed` lifecycle event, with a bounded
timeout, instead of assuming one `setImmediate` turn is enough for the
production zero-delay timer. The change is test-only; retry limits, backoff,
generation guards, stop ordering, and provider behavior are unchanged. The
triggering GitHub 60/61 failure (one child start where two were expected) is
preserved as historical evidence rather than overwritten by later passes.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/mcp-server/src/tunnels/supervisor.test.mjs` | Added bounded `waitFor` synchronization and lifecycle deferreds to the bounded-restart test; retained child-count, state-sequence, and stop assertions. | Wait for the behavior being asserted rather than an unrelated event-loop phase; this removes the CI timing race without weakening the retry/stop contract. |

No production source, build artifact, provider adapter, HTTP host, or retry
policy file changed.

## Governing docs

- **FRD-025 — Remote access:** The test continues to prove RA-TUNNEL-2's
  normalized lifecycle, RA-TUNNEL-3's bounded owned-child process boundary,
  RA-TUNNEL-5's bounded retry behavior, and RA-TUNNEL-6's safe stop ordering.
  No runtime behavior or governing document was modified.
- **ADR-0017 — Streamable HTTP remote access:** The accepted provider-neutral,
  parent-owned supervisor lifecycle remains intact. Only test synchronization
  changed; no alternate transport or provider behavior was introduced.

## Risks / follow-ups

- The prior GitHub supervisor failure remains a preserved baseline: verify
  reported 60/61, with the bounded-restart test observing one child start where
  two were expected. Local evidence does not erase that failure.
- The first post-change package `test:http` run was 59/61 due to unrelated
  `http.test.mjs` child-process `ETIMEDOUT` and `readiness.test.mjs`
  `TUNNEL_READINESS_TIMEOUT`. The second was 60/61 with only readiness timeout;
  isolated readiness then passed 7/7, and the third full package run passed
  61/61. These failures are retained as baseline/transient evidence.
- The shared `npm run verify` run passed core 263/263 and GUI 352/352, then
  failed in its MCP `test:http` phase at the unrelated `http.test.mjs`
  child-process `ETIMEDOUT`; no attempt was made to absorb or weaken that
  separate issue. If it recurs on merged main, file a separate remediation.
- No external provider or remote-host acceptance is claimed; those are outside
  this test-only ticket.

## Verification hand-off

On merged `main`, rebuild and run:

```text
npm run build -w @kanmer/mcp-server
node --test packages/mcp-server/src/tunnels/supervisor.test.mjs
npm run test:http -w @kanmer/mcp-server
npm run typecheck -w @kanmer/mcp-server
npm run verify
```

Expected focused and package outcomes are 7/7 and 61/61 respectively, with
the supervisor test passing inside the package rail. Preserve any unrelated
HTTP/readiness or shared-verify infrastructure failure with its exit code;
proof belongs to `kanmer-verify` after merge.

## Stacked dependency and verification rerun

After independent review identified that PR #145 needed CORE-037's already
reviewed path assertion to evaluate cleanly, the branch was updated with an
explicit merge commit `72da8d0769af830480e06d719c3081671dcd0be9` from
`origin/core-037-windows-path-identity`; original commit
`aac1e25243fe200cc936b31a1fe78e7d041cd08b` remains reachable as its ancestor.
No edits were made to the dependency. The stacked `npm run verify` rerun
passed core 263/263, GUI 352/352, MCP `test:http` 61/61, scripts 80/80, MCP
stdio smoke 224/224, and headless smoke. It then failed at `mcpb:check` because
the worktree lacks `node_modules/@anthropic-ai/mcpb/dist/cli/cli.js`
(`MODULE_NOT_FOUND`). This is an environment/dependency packaging failure
outside MCP-041; the earlier shared-verify HTTP `ETIMEDOUT` and package
transient failures remain preserved above.

## Merged-main verification

Proof was written after PR #145 merged at 8a9eee57. On merged main, the MCP server build, focused supervisor suite (7/7), complete package test:http rail (61/61), package typecheck, and diff-check all exited 0. Original MCP-041 99d3f259 and stack commits aac1e252/72da8d076 are reachable. Hosted run 32544808992 attempt 1's npm ci ECONNRESET/EPERM cleanup failure is retained as transient infrastructure evidence; attempt 2 job 96961421442 passed the authoritative verify rail in 2m17s. No MCPB/provider/remote acceptance is claimed.
