# Research — MCP-045: protected remote verifier descriptor and result contract

## Question

Why does the canonical protected remote-public verifier reject the documented token-file descriptor, and what else prevents a real disposable Cloudflare run from producing an unambiguous PASS?

## Findings

- `packages/mcp-server/src/integration/remote-public-client.mjs` currently rejects any descriptor key matching `token|bearer|authorization|secret`; that pattern also matches the required reference key `tokenFile`. The same module then validates `tokenFile` as required, so every documented descriptor is rejected before the client starts.
- The remote client returns a boundary-check result but does not set a machine-readable top-level `outcome`. The CLI entry point exits 1 when any boundary fails, while `scripts/verify-remote-public.mjs` maps any child result without `outcome: "pass"` to `inconclusive`, hiding a real fail and making a successful run impossible to classify as PASS.
- The protected run's fixture doctor is designed for a loopback fixture. `runFixtureDoctor` uses its supplied `endpoint` as `localEndpoint`; with a public HTTPS endpoint this makes `LOCAL_BIND_LOOPBACK` fail even when the real local HTTP host is healthy. The public descriptor has no local endpoint reference, so the canonical run cannot prove the required local-doctor boundary without adding one.
- `remote-public.test.mjs` covers the loopback fixture and inline-credential rejection, but not a safe token-file descriptor, a public endpoint paired with a separate loopback endpoint, or CLI propagation of a PASS/FAIL outcome.
- FRD-025 RA-DOCTOR-1 and MCP-028's research require a sanitized public proof containing local doctor, public route, auth, project, tool policy, mutation/gate, lifecycle, and cleanup results. The fix must preserve the loopback-only and protected-reference boundaries; it must not accept inline bearer material or weaken a failed doctor check.

## Implications

The verifier will use an allowlisted descriptor schema containing `endpoint`, `tokenFile`, `expectedProject`, `localEndpoint`, and `mutate`; unknown/inline credential keys remain unsafe. Requiring `localEndpoint` makes the public proof's local-doctor claim explicit rather than silently binding the public URL. The client will pass that loopback endpoint to the fixture doctor and derive a top-level outcome from all boundary checks. The CLI wrapper will preserve explicit PASS, FAIL, and INCONCLUSIVE states. Tests will cover the safe reference path and retain the existing unsafe inline-credential assertion.

## Open questions

- None. The operator-run descriptor will carry the protected local loopback endpoint reference as a non-secret URL.
