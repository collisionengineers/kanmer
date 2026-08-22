# Research — MCP-041: stabilize tunnel supervisor retry test on CI

## Question

Why does the bounded-restart supervisor test report 60/61 on GitHub with only
one child started, while the retry contract and local rail appear healthy, and
what is the smallest deterministic correction that preserves the supervisor's
bounded retry/stop behavior?

## Findings

- The reported failure is in `packages/mcp-server/src/tunnels/supervisor.test.mjs`, whose first test resolves the first child's `exited` promise and then waits for one `setImmediate` before asserting `exits.length === 2`.
  - The test uses the production timer path because it does not inject the existing `wait` seam; `TunnelSupervisor.delay(0)` schedules a `setTimeout(..., 0)` in `packages/mcp-server/src/tunnels/supervisor.ts`.
  - A `setImmediate` callback is not a completion signal for a zero-delay timer plus the asynchronous `start()` call. Under a different event-loop phase ordering, the assertion can observe one child before the retry timer fires, matching the GitHub symptom exactly.
- The supervisor implementation keeps the retry contract bounded and parent-owned: it increments `restarts`, refuses values above 10 at construction, emits `restarting`, waits with bounded jitter/backoff, checks generation/stop state before launching, and emits `failed` after the configured maximum (`packages/mcp-server/src/tunnels/supervisor.ts`, `packages/mcp-server/src/tunnels/types.ts`). No implementation failure was reproduced locally.
- The test suite already exposes deterministic seams for this concern: `wait` is injected in the delay/jitter test, and `start()`/`onState` callbacks expose child creation and lifecycle states (`packages/mcp-server/src/tunnels/supervisor.test.mjs`). The bounded-restart test can await an explicit second-start/terminal-state condition rather than guessing from one event-loop turn.
- Baseline experiments on the current main checkout: the focused supervisor suite passed 7/7; `npm run test:http -w @kanmer/mcp-server` built and passed 61/61; 100 repeated focused supervisor runs passed. These passes do not erase the recorded GitHub 60/61 failure; they establish that the defect is test synchronization or environment-sensitive timing, not a currently reproducible local semantic failure.
- The governing contract requires a provider-neutral tunnel lifecycle, bounded retry/backoff, safe stop ordering, and no orphan child (`docs/functional/frd/FRD-025-remote-access.md`, RA-TUNNEL-1 through RA-TUNNEL-6; `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md`, Tunnel architecture and lifecycle decisions). A test-only synchronization change preserves those requirements and does not widen retry counts or alter production timing.

## Implications

The fix should remain test-only unless a focused reproduction demonstrates a
production race. Replace the first test's single `setImmediate` assumptions
with an explicit bounded condition tied to the second child being created and
the terminal `failed` transition (or use the existing injected wait seam),
while retaining the exact child count and state-sequence assertions. The
implementation and retry limits stay unchanged. The full MCP HTTP rail and
shared verification rail must be rerun after the change; the prior GitHub
60/61 failure remains historical evidence in the report.

## Open questions

- No user decision is required: the recommended default is a deterministic
  test synchronization fix, with no production behavior change. Any future
  production retry race would require a separate ticket and evidence.
