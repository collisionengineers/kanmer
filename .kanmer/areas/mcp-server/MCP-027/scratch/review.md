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
