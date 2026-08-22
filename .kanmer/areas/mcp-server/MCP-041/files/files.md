# Files — MCP-041

*The files document. Not the research — this is the **surface area** of the change, not the findings behind it.*

## Where the change lands

The intended implementation is a test-only synchronization correction. No
production tunnel code or retry policy is in scope unless reproduction proves
the implementation itself is faulty.

| Path | Why |
|---|---|
| `packages/mcp-server/src/tunnels/supervisor.test.mjs` | Replace event-loop-turn guesses in the bounded-restart scenario with an explicit completion condition for the second child and terminal failure, while retaining the bounded child-count and lifecycle-state assertions. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/mcp-server/src/tunnels/supervisor.ts` | The parent-owned retry state machine, zero-delay production timer path, generation/stop guards, and lifecycle states that the test must observe without changing. |
| `packages/mcp-server/src/tunnels/types.ts` | The bounded restart-policy defaults and validation contract; retry limits and stable-reset semantics are not to be weakened. |
| `packages/mcp-server/src/tunnels/cloudflared.test.mjs` | Provider-level lifecycle tests and existing readiness/cleanup synchronization patterns; this ticket must not absorb adapter behavior. |
| `packages/mcp-server/package.json` | The authoritative `test:http` command and its complete MCP server test surface, including the supervisor test. |
| `docs/functional/frd/FRD-025-remote-access.md` | Normative RA-TUNNEL lifecycle, bounded retry, safe shutdown, and provider-neutral requirements. |
| `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md` | Accepted decision that adapters own process lifecycle while the supervisor remains bounded and loopback-safe. |
| `CORE-037` | The triggering GitHub verify run and its preserved unrelated 60/61 failure; this remediation is separate and must not modify CORE-037. |

## Ripple effects

The modified test is imported from the built `dist/tunnels/supervisor.js`, so
the MCP server build must run before the focused test. The focused supervisor
suite, the package `test:http` rail (61 tests), typecheck, and the repository's
shared verification rail should be rerun. No committed build artifact or
runtime/provider behavior should change.

## Out of scope

- `packages/mcp-server/src/tunnels/supervisor.ts` and `types.ts` production
  behavior, retry limits, backoff, stop ordering, and generation guards.
- Cloudflared adapter, remote host, HTTP transport, provider credentials,
  external tunnel hosts, and live remote acceptance.
- CORE-037 implementation, PR #144, its merge/verification/cleanup, or any
  other ticket in HZN-005/HZN-007.
- Weakening assertions, increasing timing allowances without a causal
  synchronization condition, or masking a failed retry/stop transition.
