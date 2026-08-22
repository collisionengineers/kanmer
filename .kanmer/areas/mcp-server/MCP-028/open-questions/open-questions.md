# Open questions — MCP-028

## Resolved decisions

- **What environment is required?** A dedicated disposable Kanmer project plus a pre-provisioned named tunnel/test hostname and protected provider credential. Never a production board or endpoint.
- **Does the harness create Cloudflare account/tunnel/DNS resources?** No. It consumes operator/environment-owned resources and validates them.
- **What is the canonical execution path?** A repository operator script/library that runs locally or on an approved protected runner. A manual GitHub workflow is optional and may be added only when a protected environment and runner are confirmed.
- **Can the public test run on PRs, forks, pushes, normal `npm test`, or normal `npm run verify`?** No.
- **How many real public endpoints are required?** One real named-tunnel endpoint is required. GUI multi-project behavior is proven by GUI-095's deterministic local/fake integration; a second real tunnel is optional and must not block acceptance unless the FRD changes.
- **Which client proves interoperability?** The official MCP SDK Streamable HTTP client in a separate process. A physically separate host/network is preferred; when unavailable, the public DNS/TLS/provider route may be exercised from the same protected runner and the limitation must be recorded.
- **Can a hosts-file or local proxy substitute for public routing?** No. The endpoint must resolve through normal public DNS and validate standard public TLS.
- **What authentication probes are required?** Missing, independently generated wrong, query/cookie, and valid bearer behavior. No candidate or raw response containing secrets is retained.
- **Is a real remote mutation required?** Yes, exactly against a prepared disposable ticket/document using the correct expected project/version, followed by readback and a safe before/after hash or fixture id.
- **Which safety failures must be proven remotely?** Wrong `expected_project`, one deliberate workflow/document gate failure, background dispatch omission/unavailability, and inability to select another project through request data.
- **Can the mutation touch the integration ticket or source repository board?** No. Use only the disposable project.
- **What session behavior is required?** Public initialization/subsequent requests/close, wrong-token session rejection, process-restart invalidation, bounded concurrency, and fresh reinitialize.
- **What rotation behavior is required?** Persist a new ephemeral bearer through the shipped secure path, invalidate old sessions immediately, prove old bearer fails and new bearer initializes, then rerun public doctor. No grace period.
- **What tunnel failure is induced?** Terminate only the harness-owned cloudflared child, observe degraded/restart behavior, preserve local authenticated host, then verify recovery or exact bounded exhaustion. Never kill by process name.
- **What retries are allowed?** Only bounded retries for a specifically classified transient provider/DNS propagation event. Deterministic product, security, configuration, project, gate, redaction, and cleanup failures are never retried to green.
- **What makes the integration pass?** Every required check, secret scan, and cleanup check passes for the exact commit/artifact. Functional success with cleanup or redaction failure is overall failure.
- **What evidence is retained?** One schema-versioned sanitized JSON result and Markdown summary derived from it, plus optional existing test-report formats. No raw logs, environment dump, token, provider credential, full session id, document content, or unrestricted hostname/account data.
- **How is the endpoint represented?** Safely masked hostname or a SHA-256 endpoint fingerprint according to environment policy; the full URL is not required in ticket/PR evidence.
- **How is the controlled document represented?** Fixture/ticket/document ids and before/after hashes/versions; not the canary content.
- **Who owns provider-resource cleanup?** The configured environment policy. The harness always stops local owned processes and removes local fixtures; it deletes/revokes provider resources only when they were explicitly provisioned as disposable and the policy authorizes it.
- **What if environment provisioning/DNS/provider service fails?** Classify as environment failure with safe evidence; do not mislabel product code. The ticket cannot pass until a valid run completes.
- **What if the harness itself leaks/has an ambiguous assertion?** Classify as test-harness failure and fail the run.
- **Is GUI operation required in the real public run?** Link and require GUI-095's reviewed multi-project/rotation/quit integration evidence. The real public endpoint may be operated through the canonical headless harness unless the accepted FRD specifically requires a GUI-origin public run.
- **Does the harness merge or mutate branch protection/releases?** No.

## Deferred explicitly

- `[deferred]` Performance/load/soak benchmarking and high-availability certification.
- `[deferred]` A second simultaneous real public project/provider.
- `[deferred]` OAuth/per-user identity and additional tunnel providers.
- `[deferred]` Production endpoint monitoring or always-on service certification.
- `[deferred]` Automatic provider resource provisioning/deletion.

No unresolved implementation questions remain.

## Execution disposition

No new implementation question remains. The protected Cloudflare/Worker run is explicitly deferred to the existing parked environment question and is not represented as a local PASS.
