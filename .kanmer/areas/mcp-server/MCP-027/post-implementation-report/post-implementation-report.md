# Post-implementation report — MCP-027

## Outcome

Implemented the provider-neutral, read-only connector doctor library and local CLI. The built doctor emits one schema-v1 JSON report with the exact 26 checks in the accepted order, three modes (config/local/public), explicit pass/warn/fail/skipped statuses, repair catalog entries, prerequisite skips, safe redaction, bounded checks, cancellation, and exits 0 (healthy/warnings), 1 (required failure), or 2 (invalid/cancelled run).

## Implementation

- `packages/mcp-server/src/doctor/types.ts` freezes modes, statuses, severities, ids, report shape, safe details, repair entries, and injected dependency seams.
- `packages/mcp-server/src/doctor/checks.ts` owns the one ordered registry, mode applicability, prerequisite graph, and repair catalog.
- `packages/mcp-server/src/doctor/index.ts` runs checks without first-failure short-circuiting, emits explicit prerequisite skips, bounds each check, handles cancellation, sanitizes details, and closes registered MCP clients/cleanup callbacks.
- `packages/mcp-server/src/doctor/render.ts` renders the same report into grouped Configuration, Local MCP, Public endpoint, and Safety sections with counts, first blocking layer, and next repair.
- `packages/mcp-server/src/doctor-cli.ts` exposes config/local/public plus --json, rejects raw-token/URL/insecure/mutation/unknown flags, accepts only protected environment references, handles SIGINT/SIGTERM, and preserves JSON-only stdout.
- Package and root scripts expose the built `kanmer-doctor` entry and doctor smoke; no MCP tool or plugin reference changed.

Canonical MCP-021 tunnel status/config/executable validators are reused. Valid credential and MCP checks are dependency-injected so GUI-095 and MCP-028 can provide the existing protected secret provider, official Streamable HTTP client, local status, public DNS/TLS/route probes, and exact remote tool policy without duplicating transport/auth logic or requiring public credentials in CI.

## Verification

On the ticket worktree after the final implementation:

- `npm run typecheck -w @kanmer/mcp-server` — PASS.
- `npm run test:http -w @kanmer/mcp-server` — PASS, 55/55 (doctor + HTTP/auth/tunnel rails).
- `npm run smoke:doctor -w @kanmer/mcp-server` — PASS (built schema-v1, 26 checks, canary absent).
- Built CLI invalid invocation — exit 2, bounded error, no echoed secret.
- Built `doctor config --json` — one JSON report, required failure when no project reference is supplied, no prose on stdout.
- `git diff --check` — PASS.

## Safety and handoff

The report shape contains no token, credential bytes, body, document content, or full session id fields; arbitrary URL/raw-token/insecure/provider-mutation flags are rejected. Config mode performs only local validation. Public provider/DNS/TLS acceptance remains fixture/dependency-seam based here; MCP-028 owns controlled named-tunnel acceptance. GUI-095 consumes the exported report/check ids and renders the same JSON contract. No board mutation or new remote MCP tool was introduced.

## Known deferred scope

The real loopback disposable-board client/TLS fixture matrix and controlled public acceptance are intentionally downstream integration work (GUI-095/MCP-028), not fabricated as complete in this ticket. The existing canonical HTTP/auth/tunnel suites remain green.

## Review remediation — 2026-08-21

Independent review initially found five blockers. The follow-up implementation addresses each:

1. Public mode now creates a separate protected public MCP session, accepts the expected unauthenticated 401 as a reachable route, snapshots local/public fingerprint and tool policy before idempotent session close, and has a non-overridden healthy public test.
2. Redaction and no-mutation checks have production defaults; results and repairs are allowlisted before serialization, and canary/top-level-field tests prove no leakage.
3. Per-check timeout aborts the shared run signal, late MCP factories close clients after timeout, total-run deadlines produce exit 2, and cleanup failures are surfaced in the report.
4. Project, remote-config, protected-secret-reference, and canonical tool-policy callbacks are wired in the CLI/library seam; the CLI uses the official Streamable HTTP client and `get_status` orientation call.
5. The duplicate `.mjs` CLI was removed; `doctor-cli.ts` is the single packaged entry.

Additional focused evidence: `test:http` now passes 58/58, including public healthy matrix, redaction allowlist, cancellation, and late-client timeout cleanup; MCP typecheck passes.
