Checkpoint 2026-08-21: committed c85b3b6 (cloudflared tunnel foundation). Added provider-neutral tunnel types, strict exact HTTPS-host/loopback-origin config validation, protected temporary config generation, direct shell:false child boundary with no-autoupdate, credentials/executable file checks, bounded supervisor, remote host composition, and env-only remote CLI. Focused MCP typecheck and `npm run test:http -w @kanmer/mcp-server` pass (9 tests); `git diff --check` passed before commit. This is not Review-ready: documented readiness metrics/fake-provider lifecycle integration, full validation and smoke/report work remain.

Follow-up: committed f6dc9ea adding `npm run smoke:remote`, a built local-only remote-host smoke. It starts a bearer-protected loopback host, passes the resulting origin only to a fake tunnel adapter, proves an authenticated loopback response, and exits with no public route. Marked only evidenced checklist lines complete; readiness metrics/full fake-cloudflared lifecycle remain outstanding.

Readiness checkpoint: committed 5ff0fdc. Cloudflared startup now includes loopback-only `--metrics 127.0.0.1:<port>` and cannot return a tunnel process until bounded `/ready` polling succeeds; malformed/oversized/non-local responses fail closed. `remote-cli` requires the metrics port via environment. Tests/typecheck remain green (11 focused tests). Still not Review-ready: port allocation/collision policy, structured provider diagnostics, complete state machine/fake executable integration, and broader verification are pending.

Metrics allocation checkpoint: committed 8d9efc5. The adapter now allocates a fresh loopback-only metrics port itself, instead of accepting a port from environment/operator input. Focused typecheck and 12 tunnel/HTTP tests pass. The allocator releases its reservation before cloudflared binds, so collision/retry behavior remains explicitly pending rather than claimed complete.

Fake-provider checkpoint: commits 166cd1b and e9b273f add a deterministic injected Cloudflare-process fake. It binds only a local readiness server and proves exact no-autoupdate/metrics argv, `shell:false`, PATH-only environment, readiness gating, shutdown, and credential-content canary absence from argv. Focused suite now 13/13. This remains local-only and does not claim real cloudflared compatibility or public proof.

Lifecycle/status checkpoint: 4c72756 applies the documented 1s→30s ±20%, 5-attempt, 5-minute-stable-reset supervisor policy; 46bac90 separates local/provider/public-verification health and preserves local HTTP on provider failure; 6cd8e57 rejects control-character config injection. Focused typecheck/tests remain green (15/15).

Official-doc check (2026-08-21): Cloudflare's Run parameters page confirms `cloudflared tunnel --config <PATH> run <UUID>`, `cloudflared tunnel --metrics <IP:PORT> run <UUID>`, and `cloudflared tunnel --no-autoupdate run <UUID>`; its metrics docs confirm loopback metrics and `/ready` readiness. Quick Tunnels remain test-only and do not support SSE. Corrected our flag order accordingly in commit 353fd45; focused typecheck and 15 tests pass. Sources: developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/ and .../monitor-tunnels/metrics/.

Optional real-binary check: `Get-Command cloudflared` returned no executable in this controlled Windows environment. No binary was downloaded or a public tunnel started. The optional version/help/config smoke remains explicitly unrun; normal validation stays fake-provider-only.

Executable-validation checkpoint: commit 97974da adds bounded direct `cloudflared --version` and `cloudflared tunnel --help` validation before any tunnel spawn, with a PATH-only child environment and fail-closed version/help errors. Fake tests inject this boundary; real validation remains unavailable because no cloudflared binary is installed. Focused suite 17/17 and typecheck pass.

Shutdown checkpoint: commit 5158976 adds exact-child graceful SIGTERM with a bounded 5-second force fallback (Windows `taskkill /pid <owned pid> /T /F`, POSIX SIGKILL). It never enumerates or targets unrelated processes. Focused typecheck/tests pass.

Regression smoke evidence: `npm run smoke:http` passed HTTP initialize/tools/list/session/delete; `npm run smoke:protocol` passed 30/30 across four protocol versions. The existing MCP surface remains exactly 30 tools, so the tunnel modules did not alter stdio or tool registration.

Fixture checkpoint: commit e84f16e adds `tunnels/fixtures/fake-cloudflared.mjs`, a standalone no-network fake with direct version/help, loopback-only readiness, and termination behavior, plus direct fixture coverage. Focused suite is now 18/18; no real Cloudflare process/account/DNS is involved.

Startup-state checkpoint: commit ecb3460 ensures a pre-provider validation/spawn failure emits provider `failed` while preserving the authenticated local HTTP listener; remote-host integration test covers it. Typecheck and focused suite 19/19 pass.

Typed-contract checkpoint: commit da879de adds a provider-discriminated named-credentials config, opaque credential reference, generic start input, and non-secret project/auth status fields. MCP typecheck and focused 19-test suite pass.

## Readiness health checkpoint — 2026-08-21

Commit `1ba3b91` adds optional provider-owned local readiness checks to `TunnelProcess` and a low-frequency remote-host monitor. A running provider transitions to `degraded` when its local `/ready` check fails and back to `running` on recovery, without treating child output or a public request as proof and without restarting the same valid child.

Evidence: `npm run typecheck -w @kanmer/mcp-server` passed; `npm run test:http -w @kanmer/mcp-server` passed 20/20 (including the new loss/recovery test); `git diff --check` passed. This remains Implementing: generic handle/events, bounded allocator/retry, structured redacted logs, origin/auth invalidation, complete lifecycle integration, and full fake-provider smoke remain.

Amendment: the readiness-monitor commit was amended to `b32281b` to cancel any prior monitor on restart and ignore stale process probes. Focused remote-host tests passed 3/3 and MCP typecheck remained green.

Final amendment for this checkpoint: commit is `26a7253`; terminal supervisor states now stop and discard health monitoring too, preventing a failed/exhausted child from leaving a poller behind.

## Spawned fake-provider checkpoint — 2026-08-21

Commit `fea8b28` makes the existing fake-cloudflared fixture an actual adapter child in the integration test. The test validates local readiness through the real child, calls the handle’s repeated readiness check, terminates it, and proves the credentials canary is absent from surfaced diagnostics. It also fixes the Windows minimal allowlist to retain only `PATH` plus the platform-essential `SystemRoot`; bearer/provider secret environment values remain excluded.

Evidence: MCP build passed; `cloudflared.test.mjs` passed 3/3; MCP typecheck and diff check passed. The fixture path is now anchored to `import.meta.url`, so it works from either root or workspace test cwd. Still Implementing; no real cloudflared binary was installed or invoked.

Regression checkpoint after `fea8b28`: `npm run test:http -w @kanmer/mcp-server` passed 21/21; `npm run smoke:remote` passed (fake provider/no public route); `npm run smoke:http` passed; `npm run smoke:protocol` passed 30/30; `npm run smoke:discovery` passed 13/13; scoped `git diff --check` and worktree status are clean. This is pre-review evidence only, not merged-main proof.

## Provider logging documentation re-check — 2026-08-21

Current official Cloudflare run/monitoring docs enumerate `--loglevel`, `--logfile`, and loopback `--metrics`; they do not document a local `tunnel run --logformat json` flag. Therefore this implementation does **not** add an unverified JSON flag. Provider stdout/stderr remains untrusted and is collapsed to the fixed `provider output received` diagnostic; readiness remains the loopback `/ready` endpoint. The plan’s wording is interpreted as structured JSON only where the selected provider/version documents it.

Commit `fdec4e0` replaces the readiness test’s timing sleeps with an injected monitor scheduler; the loss/recovery sequence now runs deterministically (remote-host tests 3/3, MCP typecheck pass, clean diff).

## Bounded diagnostics checkpoint — 2026-08-21

Commit `a67d5ac` adds a 32-event, 4 KiB-line provider diagnostic buffer. It classifies JSON/plain/oversize output using fixed codes, coalesces repeats, drains a final partial line on process exit, and never stores or emits provider text. The direct adapter now exposes only redacted snapshots/callbacks. Tests prove bearer/credential/query canaries never surface, repeated output coalesces, oversized input is bounded, and partial output is safe. `npm run test:http -w @kanmer/mcp-server` passed 23/23; MCP typecheck and diff check passed.

Current Cloudflare docs support `--loglevel`/`--logfile` and metrics but do not document an unverified local JSON flag, so no guessed process argument was added.

Commit `1d580c7` closes the post-spawn readiness-failure cleanup gap: the adapter now awaits its owned child’s bounded shutdown before removing the private runtime directory. A regression test verifies this sequence. Focused tunnel/HTTP suite passed 24/24, MCP typecheck and diff check passed.

Commit `78625d7` adds explicit terminal-vs-transient exit classification to the bounded supervisor. The default remains backward-compatible transient behavior, while callers can fail terminal configuration/security/origin-class exits immediately without scheduling a retry. Regression suite passed 25/25 plus MCP typecheck/diff check.

Commit `1391a00` runs direct executable validation from the system temporary directory and retains only `PATH` plus Windows `SystemRoot`, matching child launch safety. Suite passed 25/25, typecheck/diff clean.

## FRD shutdown-order correction — 2026-08-21

FRD-025 RA-TUNNEL-6 is authoritative over the prior plan wording: remote shutdown must stop accepting requests and close sessions/listener **before** stopping the tunnel child. Commit `a43df73` implements and tests that order; the test verifies the loopback endpoint refuses connections inside the child’s stop callback. Updated plan/checklist wording to the governing contract. Focused suite passed 26/26 with MCP typecheck and diff check clean.

Commit `fc4d076` hardens generated cloudflared runtime files: private directory mode, exclusive config creation, and a read-back test that asserts exact ingress/catch-all semantics and protected POSIX file mode. Focused suite passed 26/26, typecheck/diff clean.

Commit `4dfa576` gives `CloudflaredAdapter` a provider-neutral observable lifecycle: immutable status snapshots and subscription callbacks cover stopped → validating → starting → connected → stopping → stopped, with redacted metadata and failed terminal status. It rejects a concurrent second start and records non-secret public endpoint/PID/project metadata. The standalone fake-provider test asserts the full sequence. Focused suite passed 26/26, MCP typecheck/diff clean.

Commit `c30324a` makes intentional stop await protected runtime-directory cleanup and proves the generated config is absent afterward. Focused suite passed 26/26, MCP typecheck/diff clean.

Commit `d1ff45e` allowlists status failure codes to exact `TUNNEL_*` identifiers; arbitrary startup exception text (including paths/bearer canaries) becomes `TUNNEL_START_FAILED`. Regression suite passed 27/27, MCP typecheck/diff clean.

Checkpoint 2026-08-21: merged main at 0e448e8d to consume final MCP-026 bearer/session lifecycle fixes. Added optional authenticated local verification callback and strict project-fingerprint readiness validation before provider spawn; hardened supervisor against overlapping starts, stale retry generations, and stop-during-start late children; added documented local cloudflared ingress validation plus exact-host rule check against generated config (injected seam for deterministic fixtures); fixed intentional-stop status redaction. Added regression tests. Focused @kanmer/mcp-server suite passed 41/41, typecheck passed, diff-check passed. No real cloudflared/public account invoked.

Verification checkpoint 2026-08-21: built fake-provider remote smoke passed; HTTP smoke passed; protocol smoke passed 42/42; discovery smoke passed 13/13. Focused suite now 41/41 after supervisor/process-tree tests. No real cloudflared executable found, so optional real-binary validation remains intentionally not run; public HTTPS proof remains MCP-028.

Repository rail checkpoint: npm run build PASS; npm run typecheck PASS all workspaces; npm test PASS (core 256/256, GUI 318/318, MCP focused 43/43, scripts 66/66; manual current). plugin:check was intentionally INCONCLUSIVE in linked worktree because workspace @kanmer/core resolves the main checkout; AGENTS.md requires plugin byte comparison from main, and no stdio source changed. Direct smoke-remote/http/protocol/discovery all passed earlier. No public route or real provider process.

Review follow-up 2026-08-21: commit 88911daa wires the headless remote CLI to verify the authenticated local MCP initialize/DELETE handshake before starting cloudflared. Token material is read from the protected file only for that in-process local check; the adapter receives only verifier fingerprint/project/origin metadata. Build/typecheck and 10 targeted HTTP/auth/remote tests passed.

Final focused verification after review follow-ups: npm run test:http -w @kanmer/mcp-server PASS 44/44. Includes local authenticated handshake wiring, exact ingress checks, provider version capture, process-tree stop, supervisor overlap/late-child/retry-cap tests.

Independent review initially NEEDS CHANGES (reviewer): verifyLocal optional; adapter interface lacked doctor/stop/diagnostics contract; public IP hostname accepted; child error/forced-silent shutdown could hang; metrics reservation had no ownership. Remediation commit 97f626ec: require verifyLocal at exported boundary; complete TunnelAdapter doctor/start/status/stop/diagnostics surface and Cloudflared doctor; reject IP literals; settle child error and bounded forced shutdown; add loopback port lease retained through spawn boundary and idempotent lease test. Focused suite 47/47, build/typecheck pass. Awaiting independent re-review.

Additional hardening c383e9ef: early mkdtemp/chmod/lease failures now remove runtime directories and release leases; constructor rejects missing local verifier deterministically. Targeted build/typecheck and 17 cloudflared/remote tests pass. Awaiting re-review of 97f626ec+c383e9ef.

Final port hardening c94d0f76: reserveLoopbackPort now retries allocation at most three times with explicit policy validation; lease remains owned until spawn boundary and release is idempotent. Readiness suite 5/5, build/typecheck pass. Awaiting final independent re-review.
