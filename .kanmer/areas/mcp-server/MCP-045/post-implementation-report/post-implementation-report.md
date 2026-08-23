# Post-implementation report — MCP-045

## Summary

The protected remote-public verifier now accepts an allowlisted descriptor that references bearer material through `tokenFile` and the actual loopback origin through `localEndpoint`. The client emits truthful PASS/FAIL outcomes, and the operator wrapper preserves those outcomes instead of collapsing failures into inconclusive results. Inline credential descriptors remain rejected.

## Changes

| File | Change | Why |
|---|---|---|
| `packages/mcp-server/src/integration/remote-public-client.mjs` | Modified descriptor validation, local endpoint plumbing, outcome and CLI exit mapping | Make the protected proof safe and truthful across local/public boundaries. |
| `packages/mcp-server/src/integration/remote-public.test.mjs` | Added safe token-file descriptor and explicit outcome assertions | Prevent regressions while retaining the inline-secret rejection. |
| `scripts/verify-remote-public.mjs` | Preserved explicit child PASS/FAIL/INCONCLUSIVE outcomes | Ensure the canonical operator result reflects the actual protected client state. |

## Governing docs

- `docs/functional/frd/FRD-025-remote-access.md`: Meets RA-DOCTOR-1 and the loopback-first/protected-reference constraints; no FRD text was modified.
- `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md`: Meets the provider-neutral, redacted, loopback-only design; no ADR text was modified.

## Risks / follow-ups

- The full `npm run verify` rail had one transient GUI hook timeout on its first attempt. The exact file was rerun with a bounded 30-second hook timeout and all 11 tests passed. A second full-rail attempt completed core and GUI suites but the Vitest worker process remained alive after output, so the command was stopped; this is retained as runner/lifecycle evidence, not claimed as a full-rail PASS.
- `npm run typecheck` passed all four workspaces; `npm run test:scripts` passed 94/94; focused remote tests passed 2/2; build and plugin parity passed.
- Post-merge verification must run the canonical protected verifier against a disposable named Cloudflare tunnel and remove every owned process, token/config file, board fixture, and provider resource.

## Verification hand-off

On merged `main`, run:

1. `node --test packages/mcp-server/src/integration/remote-public.test.mjs`
2. `npm run build`
3. `npm run plugin:check`
4. `npm run typecheck`
5. `npm run test:scripts`
6. `node scripts/verify-remote-public.mjs --acknowledge-protected-environment --sha <merged-sha> --descriptor <protected-reference> --output <sanitized-output>`

Expected protected result: exit 0 with `outcome: "pass"`, including local loopback doctor, public DNS/TLS/route, bearer negatives, MCP initialize, project fingerprint, remote tool policy/dispatch exclusion, controlled mutation/readback, gate refusal, lifecycle, and cleanup checks.
