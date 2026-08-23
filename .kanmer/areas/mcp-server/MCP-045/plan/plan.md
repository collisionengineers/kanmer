# Plan — MCP-045: Allow safe token-file references in the remote verifier descriptor

## Objective

Make the protected remote-public verifier accept only a safe, explicit descriptor reference, run local-doctor checks against the loopback origin, and emit truthful PASS/FAIL/INCONCLUSIVE results for the disposable public proof.

## Starting state

The live Cloudflare proof reached the public authenticated MCP endpoint, but the canonical verifier stopped before the client because its unsafe-key check rejects the required `tokenFile` key. Direct client evidence also exposed two contract defects: the client has no top-level outcome, and public runs feed the HTTPS endpoint into the loopback doctor check. The deterministic loopback fixture currently passes its focused tests.

## Governing docs

- `docs/functional/frd/FRD-025-remote-access.md`: Meets RA-DOCTOR-1 by preserving local loopback, public route, auth, project, tool-policy, gate, mutation, lifecycle, and cleanup checks; no transport or credential boundary changes.
- `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md`: Meets the protected-reference, loopback-only, redacted-diagnostics, and provider-neutral integration decisions; no architecture decision is modified.

## Required changes

1. Replace the descriptor key-pattern rejection with a strict allowlist. Permit only `endpoint`, `tokenFile`, `expectedProject`, `localEndpoint`, and `mutate`; require the four string references and keep inline credential keys unsafe.
2. Thread `localEndpoint` through `runRemotePublicDescriptor` and `runRemotePublicClient` into `runFixtureDoctor`, so public proof checks the actual loopback `/mcp` origin.
3. Add a top-level client `outcome` derived from every boundary check, with PASS only when all checks pass.
4. Update the operator wrapper to preserve child PASS, FAIL, and INCONCLUSIVE outcomes and corresponding exit codes.
5. Add focused tests for safe file references, local/public endpoint separation, explicit outcome, and continued inline-credential rejection.

## Expected files

| Action | Repo-root-relative path | Responsibility |
|---|---|---|
| Modify | `packages/mcp-server/src/integration/remote-public-client.mjs` | Descriptor schema, local endpoint plumbing, outcome emission. |
| Modify | `packages/mcp-server/src/integration/remote-public.test.mjs` | Focused regression coverage. |
| Modify | `scripts/verify-remote-public.mjs` | Truthful protected-client result mapping. |
| Regenerate | `packages/mcp-server/dist/**`, `plugins/kanmer/mcp/kanmer-mcp.cjs` | Generated artifacts from the server build; commit only through the normal build/plugin flow. |

## Do not modify

Do not change the HTTP transport, bearer verifier, Cloudflare adapter, GUI, board/store, descriptor secret storage, or protected provider resources. Do not log or embed bearer/provider values. Do not weaken or skip doctor, mutation, gate, project, dispatch, lifecycle, or cleanup assertions.

## Constraints

Use the existing Node/MCP SDK and no new dependencies. Keep paths repo-relative or supplied through protected references. Tests must preserve exact assertions and sanitize evidence. The operator descriptor must contain a non-secret loopback URL; the token remains in the protected token file.

## Ordered steps

1. Take MCP-045 into its own worktree/branch and inspect the current client, wrapper, doctor, and test contracts.
2. Implement the allowlisted descriptor and explicit local endpoint/outcome plumbing.
3. Add focused regression tests, including a temporary protected token-file descriptor against the deterministic loopback fixture and an unsafe inline-token rejection.
4. Run focused tests, type/build/plugin checks, and the full verification rail named below; stop on any failure.
5. Record the implementation report and open the PR for independent review; do not merge it as author.
6. After merge, rerun the canonical protected verifier with the disposable Cloudflare tunnel and descriptor containing the loopback ready endpoint. Preserve all attempts and sanitized results in MCP-028.

## Acceptance checks

- A descriptor containing `tokenFile` and `localEndpoint` runs without unsafe-descriptor rejection; a descriptor containing inline `token`, `secret`, or `authorization` is rejected.
- Public proof's `LOCAL_BIND_LOOPBACK` check evaluates the local HTTP origin, not the public hostname.
- `runRemotePublicClient` emits `outcome: "pass"` only when every boundary check passes and emits `outcome: "fail"` when any check fails.
- The wrapper maps child PASS to exit 0, FAIL to exit 1, and unavailable/inconclusive to exit 2.
- Existing deterministic remote tests remain green without weakened assertions.
- The merged commit's canonical public run proves the required public route and leaves no disposable board, process, secret, or Cloudflare resource residue.

## Commands

From the ticket worktree:

- `node --test packages/mcp-server/src/integration/remote-public.test.mjs`
- `npm run build`
- `npm run plugin:check`
- `npm run verify`

After merge, from the exact merged checkout with protected environment references:

- `node scripts/verify-remote-public.mjs --acknowledge-protected-environment --sha <full-merged-sha> --descriptor <protected-json-reference> --output <sanitized-output>`

## Failure and deviation rules

Stop and report any test/build/verification failure, unsafe descriptor ambiguity, missing loopback endpoint, unexpected public response, cleanup failure, generated-artifact drift, or scope expansion. Do not bypass the canonical verifier or convert a fail to inconclusive. File a follow-up ticket for any unrelated defect.

## Stop condition

Stop after the reviewed PR is merged and MCP-028 has a truthful post-merge protected result; do not merge the PR yourself or start another ticket.
