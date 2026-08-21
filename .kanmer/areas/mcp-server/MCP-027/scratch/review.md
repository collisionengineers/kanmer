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

## Final review of 0719a399 + 91a0a64b

Final remediation covers the five previous gaps: packaged local/public DNS, TLS, fetch probes, local status, tunnel-status seams, localEndpoint; abort-aware probe/DNS; MCP setup cleanup; required-skip aggregation; injected deadline clock. 91a0a64b makes session closers idempotent and cleanup-registered.

Focused evidence: npm run test:http -w @kanmer/mcp-server PASS 59/59 (one earlier run hit the pre-existing 1 ms readiness timing race; clean rerun passed); MCP typecheck PASS; doctor build/tests PASS 7/7; doctor smoke PASS; diff check PASS. Built local/public CLI missing-config invocations now fail rather than silently succeeding.

### Remaining blocking finding

1. BLOCKING — timeout/cancellation reports still claim PASS with exit 2. Report status only considers failed checks, warnings, required skips, and cleanup errors. A cancelled run marks applicable checks skipped with severity info; a total-deadline run does the same. A real cancelled report is status=pass, exitCode=2, all 26 checks skipped. Reproduced against built doctor: already-aborted public run returned status pass, exit 2, counts pass 0/warn 0/fail 0/skipped 26. This contradicts the health status and documented exit-2 cancelled semantics. Disposition: aggregate cancellation/total-timeout into non-healthy status or add an explicit aborted/internal status, and assert status as well as exit in tests.

### Security observation

The packaged localStatus callback fetches KANMER_LOCAL_ENDPOINT before LOCAL_BIND_LOOPBACK validates it. An arbitrary environment endpoint can receive a doctor request before the loopback check. Validate localEndpoint before any fetch or derive it from canonical host status; add an unsafe-endpoint test.

### Verdict

NEEDS CHANGES — not safe to merge until cancellation/total-timeout status is corrected and tested.

Final re-review through 0552e6f7: NEEDS CHANGES; do not merge. The new probe/localStatus response-body cancellation is present and typecheck/build plus focused HTTP rail pass (59/59), doctor tests pass (7/7), and diff check is clean. However cancellation/total-timeout still produce a contradictory report: an already-aborted public run returns `status: "pass"`, `exitCode: 2`, counts `{pass:0,warn:0,fail:0,skipped:26}`; the cancellation skips are severity `info`, while aggregation only treats required skipped/fail/cleanup errors as unhealthy. Add an explicit cancelled/timeout status or count these as failure, and assert both status and exit code. Also, the CLI localStatus fetches `KANMER_LOCAL_ENDPOINT` before LOCAL_BIND_LOOPBACK validates it, so an unsafe env endpoint can receive a POST; validate/allowlist the endpoint before fetching and add a regression test.

Final re-review through e446f619: NEEDS CHANGES; do not merge yet. The two prior blockers are fixed: cancelled/total-timeout status now fails with exit 2, and packaged local CLI rejects non-canonical loopback endpoints before POST; the new disposable-listener test proves zero hits. Independent evidence: typecheck/build/doctor 7/7, HTTP rail 60/60, diff check clean. Remaining deadline edge: the overall timer is only checked before each check. If the last applicable check starts before the deadline and overruns it, the report can still return pass/exit 0. Reproduced with `runDoctor({mode:'config', totalTimeoutMs:100, dependencies:{checks: all pass except NO_BOARD_MUTATION sleeps 150ms}}`: elapsed 155ms, `durationMs:153`, `status:'pass'`, `exitCode:0`. This violates the plan requirement to bound the overall report and the post-report claim that total deadlines produce exit 2. Add a total deadline abort/timer or a post-loop deadline check, plus a regression test for an overrun on the final applicable check.

Final re-review through 32fb2f93: PASS; safe to merge. The run-level deadline timer now aborts/resolves an in-flight final check, marks timeout status fail/exit 2, and clears before cleanup; the regression covers a 200 ms final check against a 20 ms budget. Prior cancellation status, unsafe local endpoint, response-body cancellation, late-client cleanup, packaged local/public seams, redaction, canonical orientation/tool checks, and idempotent session cleanup remain covered. Independent evidence: MCP typecheck/build PASS; doctor tests 9/9 PASS; HTTP/auth/tunnel rail 61/61 PASS; doctor smoke PASS; `git diff --check` PASS; working tree clean. No remaining blocker found.

Authorized merge completed: PR #114 merged normally into main. Merge commit `765c3f6f3ef27ea8b7d7223267b181a19a7d0de6`; PR state MERGED at 2026-08-21T15:06:42Z.
