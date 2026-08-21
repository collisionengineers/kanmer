# Independent review — PR #113

Date: 2026-08-21
Reviewed current head a23709b7eb71c92744ccee4c70116c6d50652ebb on mcp-021-cloudflared-adapter, including 54e5fa20, 88911daa, and a02c1481; against the full MCP-021 packet, EPIC-010/HZN-005/HZN-007 context, FRD-025, and ADR-0017.

## Verdict

**NEEDS CHANGES — do not merge PR #113.**

The diff is otherwise appropriately scoped: named locally managed Cloudflared credentials only; no Access, Quick Tunnel, remote-managed token mode, account/DNS automation, Worker-hosted Kanmer, public acceptance, board mutation, tool registry, stdio, or plugin source changes. Ingress serialization/catch-all, bearer separation, bounded redacted provider logs, local-only fake provider, lifecycle status, and shutdown ordering are present.

## Blocking findings

1. **Authenticated local MCP verification is not mandatory at the remote-host boundary.**

remote-cli now supplies a protected-token local initialize/DELETE callback (88911daa), but RemoteHostOptions.verifyLocal remains optional and KanmerRemoteHost calls options.verifyLocal?.(ready). Any caller of the exported remote-host composition, including a future GUI/doctor caller, can therefore bind the authenticated HTTP listener and start the tunnel after only authRequired/project-fingerprint metadata checks, without an authenticated MCP initialize. This violates MCP-021's prerequisite contract and plan §12.115 / FRD-025 RA-TUNNEL-5's local-first boundary. The callback must be required for a tunnel-start path (or the host must provide a mandatory equivalent handshake seam); add a regression proving omission cannot spawn the provider.

Disposition: NEEDS CHANGES.

2. **The provider-neutral adapter/handle interface does not implement the contracted surface.**

TunnelAdapter in packages/mcp-server/src/tunnels/types.ts only requires start(target) and makes getStatus/subscribe optional; it has no validate/doctor, stop, or redacted-log/event contract. The returned TunnelProcess has only pid, exited, optional checkReadiness, and stop, rather than the planned provider-neutral handle with public URL/status/subscribe/getStatus/stop/waitForExit. CloudflaredAdapter has ad hoc methods, but a consumer typed against TunnelAdapter cannot use the RA-TUNNEL-1/ADR-0017 validate/start/status/stop/log boundary or reliably consume provider-neutral lifecycle diagnostics. This also leaves the GUI-095/MCP-027 contract underspecified.

Disposition: NEEDS CHANGES. Align the generic interfaces with the accepted contract, or explicitly narrow/update the governing ticket contract before merge; add a compile/use test through the generic interface, not only the concrete Cloudflared class.

3. **Public IP literals are accepted as configured hostnames.**

Both validateTunnelStartInput() and exactHostname()/validateCloudflaredTunnel() validate the public target through URL shape and a dot check, but never reject IP literals. Reproducible built output: validateCloudflaredTunnel({hostname:'192.0.2.10', ...}, {hostname:'192.0.2.10', endpoint:'http://127.0.0.1:43123/mcp'}) returned success, and validateTunnelStartInput accepted the same target without project/auth metadata. MCP-021 plan §§3.22/5.43 and the research contract require one valid public HTTPS hostname and reject an IP literal unless explicitly approved. This can produce a non-DNS public endpoint contrary to the release contract.

Disposition: NEEDS CHANGES. Reject IPv4/IPv6 literals (and test canonical hostname-label/IDNA boundaries) before config generation or spawn.

4. **Owned-child shutdown can remain unbounded on spawn/error paths.**

CloudflaredAdapter's childExited promise resolves only from the ChildProcess exit event. If spawn emits error without exit, the catch path calls stopOwnedChild(), which waits for childExited; after the five-second graceful wait and taskkill/SIGKILL fallback it awaits the same unresolved promise indefinitely. The Windows taskkill path likewise awaits exit without a final bounded timeout if the child ignores/does not emit exit. This violates FRD-025 RA-TUNNEL-3 and the MCP-021 process-tree bounded-shutdown contract, and the tests only cover normal signal termination. Settle owned lifecycle on error/close and retain a bounded final wait after forced termination; add spawn-error and non-exiting-child tests.

Disposition: NEEDS CHANGES.

5. **Metrics-port allocation has no collision/ownership retry.**

allocateLoopbackPort() binds an ephemeral loopback socket and immediately closes it; CloudflaredAdapter then launches using that number with no reservation, retry, or bounded collision handling. A competing process can claim the port in the gap, yielding a startup failure; an explicitly supplied metricsPort has no collision check at all. MCP-021 plan §§7.59–7.61/13.135 and the checklist require bounded collision handling and cleanup. The current allocator test proves only that a port can be obtained.

Disposition: NEEDS CHANGES (reliability). Add bounded bind/ownership collision handling and a regression for a claimed port; ensure startup/retry cannot leave a stale metrics resource.

## Non-blocking observations

- Optional real cloudflared validation was not run because no executable is installed; this is explicitly allowed by the ticket and report. No public Cloudflare route/account/DNS was used.
- The new remote-cli handshake holds the token only in-process for local initialize/DELETE and does not pass it to adapter target/status/argv/config; add direct CLI integration coverage when fixing the mandatory callback.
- The supervisor retry cap and provider-version status additions are safe and targeted; provider exit diagnostics now use redacted fixed codes.

## Checks

- npm run test:http -w @kanmer/mcp-server — PASS, 44/44 at a02c1481 (the subsequent a23709b status-only change passed targeted typecheck).
- npm run build — PASS.
- npm run typecheck — PASS all workspaces.
- npm run typecheck -w @kanmer/mcp-server — PASS at a23709b.
- npm test — PASS in this review run: core 256/256, GUI 318/318, MCP 43/43, scripts 66/66 (before the final provider-version-only a23709b change).
- node packages/mcp-server/src/smoke-remote.mjs — PASS (fake provider, no public route).
- node packages/mcp-server/src/smoke-protocol.mjs — PASS, 42/42.
- node packages/mcp-server/src/smoke-discovery.mjs — PASS, 13/13.
- git diff --check origin/main...HEAD — PASS.

No merge performed; no proof or ticket stage changes.
