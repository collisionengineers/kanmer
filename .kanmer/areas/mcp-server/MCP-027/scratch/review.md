# Independent review — MCP-027 PR #114

Reviewer: independent reviewer (not the author). PR remains open.

## Changes inspected

The PR adds `doctor/types.ts`, `doctor/checks.ts`, `doctor/index.ts`, `doctor/render.ts`, a built `doctor-cli.ts` (plus a duplicate unused `doctor-cli.mjs`), `doctor.test.mjs`, `smoke-doctor.mjs`, and package/root build/test routing. It freezes the 26 ids and report shape, provides a generic injected dependency surface, a small set of default checks, a renderer, and a CLI.

## Blocking comments

1. **BLOCKING — the public doctor cannot complete a healthy real run.** `AUTH_VALID_ACCEPTED` is registered only for `local` mode, and the only path that creates an MCP client is that check. In `public` mode, `MCP_INITIALIZE_PUBLIC`, both public fingerprint/tool checks, and `SESSION_CLOSE_PUBLIC` therefore always return skipped unless every check is overridden through the test-only-looking `dependencies.checks` map. `LOCAL_PUBLIC_CONSISTENT` is also never implemented and always falls through to “check requires a local injected diagnostic dependency”. The public route probe is called without auth and the implementation rejects any non-2xx route result, so a normal bearer-protected `/mcp` returning 401 makes `PUBLIC_ROUTE_NO_REDIRECT` fail before the separate missing-auth check. This means the production library cannot produce the healthy public matrix required by RA-DOCTOR-1 / the ticket contract. **Disposition: needs a production public valid-token/MCP path, correct unauthenticated route semantics, and a real local/public consistency check; add a non-overridden public success test.**

2. **BLOCKING — required safety checks are not checks.** `DIAGNOSTIC_REDACTION` and `NO_BOARD_MUTATION` are in the required registry but have no default implementation; every normal run marks them `skipped`. There is no canary scan, board snapshot/no-mutation proof, or mutator-policy inspection. The smoke passes only because it overrides all 26 ids. This cannot substantiate the report’s safety claims or the acceptance requirement that redaction/no-mutation be proved. **Disposition: implement production-safe checks and test them without overriding the check registry.**

3. **BLOCKING — report sanitization is not fail-closed.** The final report only sanitizes `details`, while `runDoctor` spreads an injected/runtime result wholesale and accepts its `repair` unchanged. A dependency result with an unexpected top-level `token`/session/credential field is serialized verbatim; a secret embedded in an otherwise-allowed `reason` string (for example, “provider credential CANARY_SECRET…”) also survives because `safe()` only redacts a few key=value/Bearer patterns. I reproduced both with `runDoctor` against the built output: the canary remained in `JSON.stringify(report)`. This violates FRD-025’s no-credential diagnostics and the checklist’s all-surfaces canary requirement. **Disposition: construct an allowlisted result/report shape, sanitize repair/details/error text recursively, and add canary tests for JSON, human output, and thrown dependency errors.**

4. **BLOCKING — timeout/cancellation leaks resources and is not bounded.** The per-check timeout resolves a wrapper promise but does not abort or cancel `runOne`. If a delayed `mcp` dependency resolves after timeout, it adds a client to `clients` after the single cleanup pass has already run; its `close()` is never called. I reproduced this with a 5 ms timeout and a 50 ms MCP factory: the report failed but the delayed client close count remained zero. Network/probe dependencies have no signal/timeout contract either, and there is no total-run deadline. This violates cleanup-on-failure/cancel/timeout and bounded-resource requirements. **Disposition: make each dependency abort-aware, clean late resources, bound the whole run, and surface cleanup failures instead of swallowing them in the empty catch blocks.**

5. **BLOCKING — core project/config/tool checks are placeholders rather than canonical validations.** `PROJECT_CONFIG_VALID` only checks whether `projectRoot` or `expectedProject` is a non-empty string; it never resolves the selected board or computes the canonical project fingerprint. `REMOTE_CONFIG_VALID` only checks a dotted hostname, `SECRET_REFERENCE_VALID` only checks a string/path is present, and the tool-policy check trusts caller-provided `config.expectedTools`/dependency data rather than importing the canonical remote exposure set or performing the required read-only orientation call. A report can therefore say config/project/tool policy passed without checking the actual board, protected secret source, or registry policy. **Disposition: wire the existing root/project-identity/secret/remote exposure contracts into production defaults and test wrong-board, wrong-policy, and invalid-secret cases.**

## Non-blocking comments

- `src/doctor-cli.mjs` duplicates the built TypeScript CLI and has weaker argument validation/signal behavior; remove it or make it the single canonical entrypoint.
- Report timing uses `Date.now()` for per-check and finish timestamps even when `options.now` is injected, so the advertised deterministic clock seam is only partially honored.
- The CLI only reads environment references and does not currently construct real local/public dependencies; document this as an intentionally non-accepting CLI until the production wiring above exists.

## Checks run

- `npm run typecheck -w @kanmer/mcp-server` — PASS.
- `npm run test:http -w @kanmer/mcp-server` — PASS, 55/55.
- `git diff --check origin/main...HEAD` — PASS.
- Built CLI config JSON and invalid-flag invocations were exercised; invalid flags exit 2 and JSON stdout is clean, but the healthy public path and safety/timeout cases above fail or are unimplemented.

## Verdict

NEEDS CHANGES. PR #114 is not safe to merge until the five blocking findings are addressed and independently tested. No merge performed.

## Follow-up review of 12a22fab

Re-reviewer: independent reviewer (not the author). PR remains open.

The prior public-session, route-401, allowlist, late-client, total-deadline, canonical callback, and duplicate-CLI changes were inspected. Focused rails pass: npm run typecheck -w @kanmer/mcp-server, npm run test:http -w @kanmer/mcp-server (58/58), npm run smoke:doctor -w @kanmer/mcp-server, and git diff --check.

### Remaining blocking findings

1. BLOCKING — packaged local/public CLI still does not run the local/public diagnosis. doctor-cli.ts wires only project resolution, secret-reference validation, token loading, official MCP client, and canonical tool names. It supplies no localStatus, probe, tunnelStatus, resolveDns, or tls callbacks, and it does not copy KANMER_LOCAL_ENDPOINT to config.localEndpoint (only to tunnel.endpoint). Consequently kanmer-doctor local/public skips required listener, bearer, tunnel, DNS, TLS, and route checks. Reproduced the equivalent packaged dependency set: public report was warn, exit 0, with 5 pass / 2 warn / 19 skipped; LOCAL_STATUS_READY and PUBLIC_DNS_RESOLVES were skipped. The “healthy public” test injects all seams and therefore does not prove the packaged CLI. Disposition: wire bounded configured-host/local status, raw bearer probes, tunnel readiness, DNS/TLS/route dependencies (or make an explicit config-only CLI mode), pass localEndpoint, and add a built CLI local/public fixture smoke that asserts required checks are not skipped.

2. BLOCKING — injected clock is still incompatible with total timeout. started uses options.now(), but the deadline and per-check timings use Date.now(). With a valid deterministic clock such as () => 1000 and totalTimeoutMs: 120000, the run immediately marks every applicable check as “doctor total deadline exceeded”, returns exit 2, and reports status pass. This violates the planned deterministic clock/duration contract and produces contradictory status/exit output. Disposition: use one injected monotonic clock for deadline/timing and make timeout/cancellation status aggregate consistently; add a fake-clock test.

3. BLOCKING — bounded cancellation is incomplete for network seams. probe and resolveDns accept no AbortSignal, and the CLI has no implementations for them. A timed-out probe/DNS operation can continue after the doctor returns with no owned handle or cleanup path. The MCP/TLS callbacks are signal-aware now, but this does not cover the required HTTP/DNS resource boundary. Disposition: make all potentially blocking dependencies signal/timeout-aware and test delayed probe/DNS cleanup.

4. BLOCKING — official CLI MCP setup can leak its client on setup failure. The CLI mcp callback creates a Client/transport, then calls connect, get_status, parses the response, and calls listTools without a try/finally. Any failure after construction but before returning the client leaves the transport unclosed; runDoctor cannot clean it because it registers the client only after the callback resolves. This violates cleanup on internal exception. Disposition: close the client/transport on every setup failure and add a failing-orientation cleanup test.

5. BLOCKING — required-check skips can still produce a successful report. The aggregate exit only counts fail/warnings; missing required dependencies become skipped and can yield exit 0. The packaged CLI example above exits 0 with 19 required diagnostic checks skipped. A doctor report that claims a warning-only healthy result while it did not perform the requested local/public checks is unsafe and misleading. Disposition: distinguish non-applicable checks from unavailable required checks and make missing required dependencies fail or exit 2.

### Non-blocking observations

- LOCAL_STATUS_READY treats an omitted state as healthy (undefined or ready) instead of requiring observed ready state.
- PUBLIC_ROUTE_NO_REDIRECT only sees status/location; a 200 HTML/login intermediary can pass because the probe contract has no content-type/body-class signal.
- Session close removes the client from clients but leaves its cleanup closure in cleanups, so normal successful public runs close each client twice (observed 2 opens / 4 close calls with a counting fixture); make cleanup registration idempotent.
- Cleanup errors are included in cleanupErrors but do not affect exitCode, and human rendering omits them.

### Follow-up verdict

NEEDS CHANGES. The remediation is materially improved, but PR #114 is not safe to merge until the packaged local/public CLI cannot silently skip required checks, the clock/cancellation/cleanup paths are corrected, and the focused tests cover those production paths. No merge performed.
