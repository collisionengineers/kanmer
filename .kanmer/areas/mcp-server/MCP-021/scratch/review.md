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

## Independent re-review — PR #113 at c94d0f765b7e04b80b56578def194aaf39e55834

### Changes checked

The PR adds the provider-neutral tunnel types/supervisor, the named-credentials Cloudflared adapter and strict ingress serializer/validator, loopback readiness/metrics reservation, bounded redacted diagnostics, direct process-tree lifecycle, authenticated local-first remote-host composition/CLI, fake-provider tests and remote smoke. The follow-up commits 88911daa, a02c1481, a23709b7, 97f626ec, c383e9ef and c94d0f76 were included in this review. No core/domain/tool/stdio/plugin/provider-account/DNS/Quick-Tunnel/public-acceptance scope drift was found.

### Findings and dispositions

1. **BLOCKING — provider-neutral public hostname validation still accepts bracketed IPv6 literals.** `packages/mcp-server/src/tunnels/types.ts:71` calls `isIP(hostname.hostname)` without removing URL IPv6 brackets. The generic validator therefore accepts `[2001:db8:1::1]`, despite FRD-025 RA-TUNNEL-3 / MCP-021 plan §§3.22–3.23 requiring IP literals to be rejected. Reproduction after the fresh build: `node --input-type=module -e "...validateTunnelStartInput(...hostname:'[2001:db8:1::1]'...)"` → `ACCEPT`. **Disposition: NEEDS CHANGES** — normalize/remove URL brackets before `isIP` and add IPv6 literal regression coverage in the provider-neutral validator (the Cloudflared-specific dotted-host check does not make the generic contract safe).

2. **BLOCKING — an explicitly supplied metrics port bypasses the collision/ownership strategy.** `packages/mcp-server/src/tunnels/cloudflared.ts:136` reserves only when `options.metricsPort` is absent; the public `CloudflaredAdapterOptions.metricsPort` path never probes/reserves the chosen port. With a listener already bound, an adapter configured with that port still reaches `spawnProcess` (reproduction output: `occupiedPort 50136 spawnReached true error SPAWN_REACHED`). MCP-021 research §Metrics and readiness and plan §§7.59–7.61/13.135 require bounded collision handling for fixed ports. **Disposition: NEEDS CHANGES** — either remove the production fixed-port option/mark it as a strictly test-only seam and ensure production cannot receive it, or reserve/check/retry the explicit port with the same bounded ownership semantics and regression tests.

3. **BLOCKING — production supervisor retries terminal provider exits.** `packages/mcp-server/src/tunnels/supervisor.ts:77` defaults an absent `classifyExit` to `transient`, while `remote-host.ts:43` constructs `TunnelSupervisor` without a classifier. Thus a Cloudflared exit such as a deterministic configuration/security failure (for example code 78) is restarted instead of terminally failing, contrary to MCP-021 research §§95–105 and plan §§11.105–11.106. Reproduction with the built RemoteHost/fake process: `startsAfterExit78 2 status running` after one code-78 exit. **Disposition: NEEDS CHANGES** — provide a provider-owned exit classification (or fail closed by default) and wire it through the production supervisor; retain the existing terminal-classification unit test and add an integrated RemoteHost/adapter regression.

4. **BLOCKING — adapter status does not expose provider readiness degradation.** `TunnelAdapter`/`TunnelStatus` advertise normalized `degraded` state, but `CloudflaredAdapter` only transitions validating/starting/connected/failed/stopped. The readiness callback is polled by `KanmerRemoteHost.monitorHealth`, which changes only `RemoteHostStatus.provider`; `CloudflaredAdapter.getStatus()` remains `connected` during readiness loss. This leaves the provider-neutral adapter contract inconsistent with FRD-025 RA-TUNNEL-2, ADR-0017's connected/degraded lifecycle, and MCP-021 research §§83–93. **Disposition: NEEDS CHANGES** — make the adapter's provider status/readiness event canonical (or explicitly extend the adapter seam so the orchestrator updates it) and add a direct adapter status regression for readiness loss/recovery.

5. **NON-BLOCKING evidence/documentation gap.** The author post-implementation report still records 47/47 as the final focused count and does not list c383e9ef/c94d0f76 details; the checklist retains stale unchecked entries for local handshake, allocator/collision, cleanup, and git-diff/evidence even though some are now implemented or independently checked. **Disposition: FIX IN PR** — refresh the report/checklist or record the final evidence in the next author update. This does not erase the code blockers above.

### Checks

- `npm run test:http -w @kanmer/mcp-server` — PASS, 48/48.
- `npm test` — PASS: core 256/256, GUI 318/318, MCP HTTP/tunnel 48/48, scripts 66/66; manual check current.
- `npm run build` — PASS.
- `npm run typecheck` — PASS for core, mcp-server, ui and GUI.
- `node packages/mcp-server/src/smoke-remote.mjs` — PASS (fake provider, no public route).
- `npm run smoke:protocol` — PASS, 42/42.
- `node packages/mcp-server/src/smoke-discovery.mjs` — PASS, 13/13.
- `git diff --check origin/main...HEAD` — PASS; worktree clean.
- Concrete negative/edge probes reproduced the IPv6 acceptance, fixed-port spawn race, and terminal-exit restart above.

### Verdict

**NEEDS CHANGES** — do not merge PR #113 until findings 1–4 are remediated and re-reviewed.

## Independent re-review — PR #113 at f6c7d196c8a317f999850a4e0df40a5a5c32880a

### Changes checked

Reviewed the full MCP-021 packet and the cumulative PR diff through f6c7d196 against FRD-025, ADR-0017, MCP-025/026 contracts, and the provider-neutral Cloudflared scope. The latest commit closes the prior review gaps with bracket-aware public-IP validation, caller-selected loopback-port leases, production exit classification, and adapter readiness state transitions.

### Prior findings and dispositions

1. **Bracketed IPv6 public literals — FIXED IN PR.** `validateTunnelStartInput` and Cloudflared `exactHostname` strip URL brackets before `isIP`; the new provider-neutral and Cloudflared regressions reject `[2001:db8::1]`. A fresh built probe returns `TUNNEL_TARGET_INVALID`.

2. **Explicit metrics-port ownership/collision — FIXED IN PR.** `reserveSpecificLoopbackPort` validates, binds and holds caller-selected loopback ports through config/ingress validation until the spawn boundary, releases idempotently, and reports `TUNNEL_METRICS_PORT_IN_USE`. New tests cover lease ownership and occupied/invalid ports. A fresh occupied-port probe reports `spawnReached false error TUNNEL_METRICS_PORT_IN_USE`.

3. **Production terminal-exit retry — FIXED IN PR.** RemoteHost now classifies Cloudflared exit 78 as terminal before handing results to the bounded supervisor; the new integrated regression proves one code-78 exit yields one start and provider `failed`, with no retry. Transient exits retain bounded retry behavior.

4. **Adapter readiness degradation/recovery — FIXED IN PR.** Cloudflared's handle readiness check now transitions the active adapter status `connected → degraded` on failure and back to `connected` on recovery; the new direct adapter regression covers both transitions. RemoteHost health status remains separately tracked.

5. **Earlier local-first verifier, child settlement, and scope findings — FIXED/CONFIRMED.** `verifyLocal` is required at construction and runs before provider spawn; child error/forced shutdown paths remain bounded and clean runtime directories; the diff contains no core/domain/tool/stdio/plugin/provider-account/DNS/Quick-Tunnel/public-acceptance changes.

6. **NON-BLOCKING report freshness — ACCEPTED FOR THIS REVIEW RECORD.** The author post-implementation report still predates the final 52-test count and does not enumerate every c383/f6 follow-up. This review records the authoritative current evidence; no implementation blocker remains.

### Checks

- `npm run test:http -w @kanmer/mcp-server` — PASS, 52/52 (clean rerun at f6c7d196).
- `npm test` — first attempt failed because a shared-worktree build race removed five `dist` modules while the parallel MCP test rail loaded them; this was an environment/concurrency failure, not a test assertion. A clean immediate rerun passed: core 256/256, GUI 318/318, MCP HTTP/tunnel 52/52, scripts 66/66; manual check current.
- `npm run build` — PASS.
- `npm run typecheck` — PASS for core, mcp-server, ui and GUI.
- `node packages/mcp-server/src/smoke-remote.mjs` — PASS (fake provider, no public route).
- `npm run smoke:protocol` — PASS, 42/42.
- `node packages/mcp-server/src/smoke-discovery.mjs` — PASS, 13/13.
- `git diff --check origin/main...HEAD` — PASS; worktree clean.
- PR #113 remains OPEN and MERGEABLE at f6c7d196; no merge or stage/proof changes were performed.

### Verdict

**PASS** — all prior blocking findings are fixed and independently covered; PR #113 is suitable for the authorized next merge step.
