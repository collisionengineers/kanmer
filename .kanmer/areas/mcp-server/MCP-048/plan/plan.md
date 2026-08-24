# Plan — MCP-048: Stabilize loopback tunnel-readiness test timing on Windows

## Objective

Make the loopback readiness policy robust to a valid local HTTP response that takes longer than its polling cadence, while retaining a finite total deadline, loopback-only endpoint validation, and `TUNNEL_READINESS_TIMEOUT` on genuine failure.

## Starting state

`waitForTunnelReadiness` in `packages/mcp-server/src/tunnels/readiness.ts` uses the default 100 ms polling interval as every fetch's abort deadline. The prior controlled provider diagnosis observed transient non-ready results followed by a valid local HTTP 200 once Cloudflare edge connections registered. Existing tests prove immediate success/timeout cases but not a delayed valid loopback response.

## Governing docs

- **Meets `docs/functional/frd/FRD-025-remote-access.md`:** preserves RA-TUNNEL-3 safe bounded process behavior and RA-TUNNEL-5 local-first loopback health checking. It changes neither authentication, endpoint routing, public exposure, nor provider configuration.

## Required changes

- Define a bounded readiness request budget independent of polling cadence, limited by the remaining total readiness deadline.
- Keep the existing finite total deadline and `TUNNEL_READINESS_TIMEOUT` failure code.
- Add a deterministic loopback HTTP test that serves a transient 503 then a delayed but bounded HTTP 200. It must fail under the prior cadence-coupled policy and pass under the corrected policy.
- Retain negative endpoint-validation and malformed-success timeout assertions unchanged.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `packages/mcp-server/src/tunnels/readiness.ts` | Implement the bounded decoupled request/deadline policy. No generated artifact is committed. |
| Modify | `packages/mcp-server/src/tunnels/readiness.test.mjs` | Exercise delayed local 200 and preserved timeout/validation behavior. No generated artifact is committed. |
| Inspect | `packages/mcp-server/src/tunnels/cloudflared.ts` | Confirm the unchanged production caller preserves local-first adapter lifecycle. |
| Inspect | `packages/mcp-server/src/tunnels/cloudflared.test.mjs` | Confirm adapter cleanup and lifecycle remain covered. |

## Do not modify

`cloudflared.ts`, public routes, tunnel configuration, GUI files, FRD/ADR documents, dependencies, package metadata, fixtures, or any MCP-028/GUI-129 scope.

## Constraints

- The endpoint remains exactly loopback HTTP `/ready`; validation is not weakened.
- The total and per-request budgets remain finite; the request timer never extend beyond the remaining total deadline.
- No catch-all suppression, no network/public-provider test, no secrets, and no dependency additions.
- Preserve `TUNNEL_READINESS_TIMEOUT` for invalid/malformed/non-ready responses after the total deadline.

## Ordered steps

1. Reproduce the current focused readiness rail on a fresh `origin/main` ticket worktree and record its exit.
2. Change only the readiness helper so a request has a bounded budget independent of `pollMs`, capped by remaining total deadline.
3. Add the deterministic local delayed-response test and retain the existing negative assertions.
4. Run focused readiness and Cloudflared adapter tests repeatedly, then the MCP package test rail, typecheck/build, and the authoritative repository rail as feasible from a normal checkout.
5. Update checklist and post-implementation report with exact command exits, commit, PR, and any inconclusive command; open a PR and move only to Review.

## Acceptance checks

- `CloudflaredAdapter.start` remains the named production caller and uses unchanged loopback `/ready` readiness.
- A valid delayed loopback HTTP 200 passes within the finite total deadline even when it exceeds the polling cadence.
- Invalid endpoints and malformed/non-ready results still reject with the current error contract; timeouts never count as success.
- No runtime dependency, packaging, schema, migration, grant, or generated-artifact change is introduced.

## Commands

- `npm run build -w @kanmer/mcp-server`
- `node --test packages/mcp-server/src/tunnels/readiness.test.mjs packages/mcp-server/src/tunnels/cloudflared.test.mjs`
- `npm test -w @kanmer/mcp-server`
- `npm run typecheck -w @kanmer/mcp-server`
- `npm run verify` from a normal checkout (or record an exact environmental limitation).

## Failure and deviation rules

Stop and record a failure if the focus test does not demonstrate the suspected coupling, the change requires a public provider/control-plane action, the plan's files are insufficient, a dependency is required, or a governing contract conflicts. Do not compensate by weakening assertions, extending unbounded waits, or modifying another ticket's files.

## Stop condition

Stop with an open `MCP-048` PR in Review after an independent reviewer is needed. Do not review, merge, verify, close out, or begin another ticket.
