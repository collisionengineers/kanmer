# Plan — MCP-041: Stabilize tunnel supervisor retry test on CI

## Approach

Make the bounded-restart test synchronize on the lifecycle events it asserts,
not on one `setImmediate` turn. The test will await a bounded completion
condition tied to creation of the second child and the terminal `failed` state,
while retaining the exact child count and state sequence. This beats changing
the production supervisor or widening delays because the local and full-rail
experiments show no semantic implementation failure, and the existing
supervisor already exposes the relevant test seams.

## Governing docs

- **FRD-025 — Remote access:** The change preserves RA-TUNNEL-2's normalized
  lifecycle states, RA-TUNNEL-3's bounded owned-child process boundary,
  RA-TUNNEL-5's bounded retry/degraded behavior, and RA-TUNNEL-6's safe stop
  ordering. It changes only test synchronization; no runtime contract or
  provider behavior is modified.
- **ADR-0017 — Streamable HTTP remote access:** The accepted provider-neutral
  adapter/supervisor lifecycle remains unchanged. The test continues to prove
  bounded restart and terminal failure without changing the one-process,
  parent-owned lifecycle decision.

## Steps

1. In `supervisor.test.mjs`, replace the bounded-restart test's `setImmediate`
   assumptions with explicit bounded lifecycle synchronization for the second
   child and terminal failure; retain the child-count, state-sequence, and
   stop assertions.
2. Confirm the diff is test-only and that supervisor production sources,
   retry limits, backoff, generation guards, and stop ordering are unchanged.
3. Build `@kanmer/mcp-server` and run the focused supervisor test, including
   repeated runs sufficient to exercise the former timing boundary.
4. Run the complete package `test:http` rail (including the supervisor test),
   package typecheck, and the repository shared verification command when
   available; preserve any unrelated baseline failures verbatim.
5. Tick the checklist, write the post-implementation report with the prior
   GitHub 60/61 failure preserved as historical evidence, record commit/PR
   traceability, push the dedicated branch, open a PR naming MCP-041, and move
   the ticket to Review for independent review.

## Verification

On the dedicated worktree, rebuild before testing because the `.mjs` test
imports `dist/tunnels/supervisor.js`. Record exit codes and output for the
focused test, repeated focused runs, `npm run test:http -w @kanmer/mcp-server`,
`npm run typecheck -w @kanmer/mcp-server`, and the shared `npm run verify` rail
if it is runnable. Confirm `git diff --stat` and `git diff` show only the
intended test synchronization. The eventual merged-main proof belongs to
`kanmer-verify`, not this pre-merge report.

## Risks / open questions

- A promise tied to lifecycle callbacks could hang if the supervisor regresses;
  use a bounded test timeout/condition so the failure remains actionable.
- GitHub's prior 60/61 failure is preserved even if local and rerun rails pass;
  no production retry behavior is claimed by this ticket.
- No unresolved user decision remains. A future production retry race is
  explicitly deferred to a separate ticket if new evidence appears.
