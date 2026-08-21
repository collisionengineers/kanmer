# Plan — DOC-013: provider-neutral remote-access manual

## Approach

Publish one provider-neutral, secret-safe manual for the shipped Streamable HTTP remote-access path. Keep Cloudflare named-tunnel instructions in a separate appendix, derive troubleshooting from the merged MCP-027 doctor registry, and compile authored chapters through the existing in-app manual generator. This ticket documents behavior; it does not implement remote access, GUI lifecycle, tunnel provisioning, or public infrastructure.

The implementation plan is intentionally evidence-gated:

1. **MCP-027 gate — satisfied.** The merged implementation is PR #114 at `765c3f6f3ef27ea8b7d7223267b181a19a7d0de6`. Its merged-main proof records build/plugin/typecheck/test, doctor schema-v1/26-check smoke, HTTP/protocol/discovery smoke, and no real public-provider acceptance; re-read the merged source before writing.
2. **GUI-095 gate — blocking.** Do not start manual implementation or invent UI wording until GUI-095 has been independently reviewed, merged to main, and has its post-implementation report/proof. Then re-read the shipped labels and behavior for storage backend, owner conflict, auto-start, true quit, rotate/revoke, status, and doctor presentation. The current GUI-095 worktree files are provisional evidence only.
3. **MCP-028 gate — downstream.** Do not state public-provider success, Worker/client proof, or provider limitations beyond the accepted boundary until MCP-028 has merged proof. Incorporate only redacted, explicitly supported evidence.

## Governing docs

- `docs/functional/frd/FRD-025-remote-access.md`
- `docs/architecture/adr/ADR-0017-streamable-http-remote-access.md`
- [[MCP-021]], [[MCP-025]], [[MCP-026]], [[MCP-027]], [[GUI-095]], [[MCP-028]]
- [[DOC-010]] for the separate OpenAI Secure MCP Tunnel stdio path
- [[GUI-104]] for the future OpenAI GUI lifecycle

## Evidence and current contract

- The current manual is authored under `docs/manual/`, has 19 chapters, and is compiled by `scripts/build-manual.mjs` into `apps/gui/src/renderer/src/manual/chapters.generated.ts`. Extend `CHAPTERS`; do not create `docs/manual/README.md` or edit the generated file by hand.
- The separate `docs/manual/connect.md` OpenAI/stdio instructions remain separate from this ticket.
- MCP-027's canonical source is `packages/mcp-server/src/doctor-cli.ts` plus `doctor/types.ts`, `doctor/checks.ts`, `doctor/index.ts`, and `doctor/render.ts`. The registry has exactly 26 ids and report schema version 1; use the registry as the source of truth.
- The packaged doctor entry point is the `kanmer-doctor` bin (`dist/doctor-cli.js`); its modes are `config`, `local`, and `public`, with optional `--json`. It rejects raw-token, arbitrary-URL, insecure, and mutation flags and exits 0/1/2.
- The shipped headless remote host is `kanmer-mcp-remote`; it accepts no arguments and uses protected configuration including `KANMER_TUNNEL_PROVIDER=cloudflared`, `KANMER_HTTP_TOKEN_FILE`, `KANMER_TUNNEL_HOSTNAME`, `KANMER_CLOUDFLARED_EXECUTABLE`, `KANMER_CLOUDFLARED_TUNNEL_ID`, and `KANMER_CLOUDFLARED_CREDENTIALS_FILE`. Document only values confirmed from built help/source and disposable runs.
- There is currently no `scripts/verify-docs.mjs`, `verify:docs` script, or shared root `verify` command. DOC-013 may add exactly one docs-specific verifier and `verify:docs`; it must not redefine or absorb the shared root verification surface.

## Steps

### 1. Freeze evidence after the gates

- Re-read the merged MCP-027 report/proof and the five doctor source files; copy the exact 26 ids, modes, statuses, exit semantics, safe-detail policy, repair codes/actions, and remote tool policy into a traceability worksheet.
- After GUI-095 merges, re-read its final diff, tests, post-implementation report, and proof. Record exact navigation labels, field names, storage/permission behavior, owner conflict and resolution, auto-start/stop/quit semantics, rotation/revoke consequences, status vocabulary, and doctor UI mapping.
- When MCP-028 merges, re-read its proof and known limitations; update only claims directly supported there. If any implementation conflicts with FRD/ADR, stop and escalate instead of documenting a workaround.

### 2. Create the canonical manual surface

Create only the authored files needed by this ticket:

- `docs/manual/remote-access.md` — provider-neutral overview, security model, architecture, prerequisites, GUI path, headless path, generic client contract, lifecycle, and limitations.
- `docs/manual/remote-access-troubleshooting.md` — the complete doctor matrix and safe repair guidance.
- `docs/manual/providers/cloudflared.md` — the locally managed named-tunnel appendix.
- `scripts/verify-docs.mjs` and root `verify:docs` — deterministic docs-only validation if no other ticket supplies them.

Add the three authored chapters to `scripts/build-manual.mjs` in reading order and regenerate the committed artifact. Add at most one concise root README pointer, coordinated with DOC-008; do not duplicate setup instructions.

### 3. Write the provider-neutral chapter

- Define project fingerprint, remote host, loopback origin, public endpoint, adapter/provider, bearer token, provider credential, session, connected, verified/stale verification, GUI owner, and headless owner.
- State mandatory HTTPS plus Kanmer bearer authentication, one project/fingerprint per endpoint/process, normal Kanmer workflow gates, and the possession/one-active-token/no-per-user-identity limits.
- Explain provider-neutral local/tunnel/public health dimensions and the connector doctor modes.
- Document exact GUI steps and states only after GUI-095 evidence is merged; document the headless path from actual packaged commands/env only.
- Explain setup, start/stop, auto-start, owner conflict, rotation/lost-token recovery, project reconciliation, true application quit, and safe diagnostics using shipped behavior.
- Use generic HTTPS `/mcp` plus `Authorization: Bearer <token>` guidance; add client-specific recipes only when a current disposable test is recorded.

### 4. Write troubleshooting from the registry

Include each of these 26 ids exactly once, in registry/execution order, with mode, layer, pass condition, safe expected/observed details, likely causes, ordered repair actions, rerun mode, and stop/escalate condition:

`PROJECT_CONFIG_VALID`, `REMOTE_CONFIG_VALID`, `SECRET_REFERENCE_VALID`, `TUNNEL_EXECUTABLE_VALID`, `TUNNEL_CONFIG_VALID`, `LOCAL_STATUS_READY`, `LOCAL_BIND_LOOPBACK`, `AUTH_MISSING_REJECTED`, `AUTH_WRONG_REJECTED`, `AUTH_VALID_ACCEPTED`, `MCP_INITIALIZE_LOCAL`, `PROJECT_FINGERPRINT_LOCAL`, `REMOTE_TOOL_POLICY_LOCAL`, `SESSION_CLOSE_LOCAL`, `TUNNEL_PROCESS_READY`, `PUBLIC_DNS_RESOLVES`, `PUBLIC_TLS_VALID`, `PUBLIC_ROUTE_NO_REDIRECT`, `AUTH_MISSING_PUBLIC_REJECTED`, `MCP_INITIALIZE_PUBLIC`, `PROJECT_FINGERPRINT_PUBLIC`, `REMOTE_TOOL_POLICY_PUBLIC`, `SESSION_CLOSE_PUBLIC`, `LOCAL_PUBLIC_CONSISTENT`, `DIAGNOSTIC_REDACTION`, `NO_BOARD_MUTATION`.

Explain prerequisite-driven `skipped` results, report schema v1, JSON/human output, and exit codes 0/1/2. Link provider-specific repairs to the appendix. Prohibit TLS bypass, wildcard bind, token-in-URL, raw-log sharing, blind retries, force takeover, and Quick Tunnel production.

### 5. Write the cloudflared appendix

Document only the first shipped adapter: externally installed supported `cloudflared`, operator-created named tunnel, stable HTTPS hostname/DNS route, protected credential reference, exact confirmed GUI/headless fields, readiness/update/replacement/rollback, and doctor interpretation. State that Access does not replace the Kanmer bearer, Kanmer does not create account/DNS resources or download executables, and Quick Tunnels are not the production path. Include no account ids, real hostnames, credential JSON, or provider secrets.

### 6. Add deterministic documentation verification

The new verifier must assert required files/headings/anchors, exact 26-id coverage with no unknown/duplicate ids, provider-neutral separation (no cloudflared commands/account setup in the main chapter), forbidden secret/insecure/wildcard/Quick-Tunnel/real-path/real-host/session patterns, valid relative links and fences, and generated-manual freshness via the existing builder. Use a unique canary in disposable verification input and prove it cannot reach docs/output. Keep the verifier offline/deterministic; public checks belong to MCP-028.

### 7. Verify with real evidence and hand off

After GUI-095 and any required MCP-028 evidence are merged:

- Run `npm run check:manual`, `npm run verify:docs`, `npm test`, `npm run typecheck`, and `git diff --check`; use the actual repository commands and record exit codes.
- Execute the packaged token/remote/doctor commands in disposable fixtures, including a path with spaces, and record redacted outputs/exits. Do not publish internal test-injection env such as `KANMER_TUNNEL_STATUS_JSON`.
- Walk GUI and headless flows using only the draft manual; compare every UI label/status/action and doctor id/repair with merged implementations.
- Run secret/canary scans and search for duplicate/stale remote instructions within scope.
- Record traceability, command/platform, UI, review, link/anchor, and security results in the post-implementation report. Leave the ticket in Preparing now; implementation and later stage moves are owned by the executor.

## Verification

The final implementation must pass the exact commands above plus the generated-manual freshness check. A command, UI state, client recipe, or public claim without a merged source/proof reference is a stop condition, not an assumption.

## Risks / open questions

No design questions remain unresolved; the workflow dependencies are explicit gates in the Approach. GUI-095 merged evidence is the blocking precondition for user-visible GUI wording and lifecycle claims. MCP-028 merged proof is the precondition for final public-provider/Worker claims. Unverified provider/client variants remain deferred.

## Stop condition

Stop at a review-ready documentation change only after all evidence gates, command/UI walkthroughs, doctor-id coverage, secret scans, generated artifact checks, and link/anchor checks pass. Do not take or move DOC-013, edit implementation code, or write proof from this preparation pass.
