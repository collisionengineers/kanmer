# Post-implementation report — DOC-013

## Summary

Added the provider-neutral remote-access manual, a complete doctor troubleshooting matrix, and the Cloudflare named-tunnel appendix. Added the chapters to the compiled in-app manual and one deterministic offline docs verifier. The OpenAI Secure MCP Tunnel chapter remains separate. No remote implementation or provider infrastructure changed.

## Evidence sources

- GUI-095 merged at `3a90548662817dd17a8b5d079b0ebf4f48f989d1`; exact Settings labels, per-project state, token delivery, rotation, reconcile, remove, and doctor presentation were read from merged source/tests.
- MCP-027 merged proof at `765c3f6f3ef27ea8b7d7223267b181a19a7d0de6`; doctor schema-v1, 26-check registry, modes, statuses, repairs, redaction, and exit codes were used.
- MCP-028 is not merged; the manual explicitly treats public Worker success as downstream evidence and makes no public acceptance claim.

## Changes

- `docs/manual/remote-access.md`: provider-neutral HTTPS/bearer contract, prerequisites and ownership boundary, GUI/headless setup, lifecycle, safe stop/cleanup, generic client contract, recovery, and limitations.
- `docs/manual/remote-access-troubleshooting.md`: all 26 doctor ids exactly once in registry order, with mode/layer, pass condition, safe observed/expected fields, likely causes, ordered repairs, rerun mode, and stop/escalate condition.
- `docs/manual/providers/cloudflared.md`: supported locally managed named-tunnel boundary and provider-specific operations.
- `scripts/verify-docs.mjs` + root `verify:docs`: required chapters/headings, exact id coverage, provider separation, secret/insecure/path scans across provider-neutral chapters, relative-link and anchor validation, balanced code-fence validation, disposable canary isolation, and generated-manual freshness.
- `scripts/build-manual.mjs`, generated chapters, manual test order, `docs/README.md`, and one root README pointer.

## Command and platform evidence

On Windows PowerShell with Node 22 and a disposable package/token directory whose path contained spaces:

- `kanmer-mcp-token <protected-token-file>`: exit 0; second invocation against the same file: exit 1 (no overwrite).
- `kanmer-doctor bogus --json`: exit 2; `kanmer-doctor config --json`: exit 1 with no board configured.
- `kanmer-mcp-remote unexpected`: exit 1; `kanmer-mcp-remote` with missing configuration: exit 1.
- Disposable directory cleanup: PASS. No token, hostname, credential content, or machine-specific path was recorded.
- Built package source and tests also exercised protected token permissions, redaction, local start/readiness, provider failure, signal stop, ownership cleanup, and restart behavior with fake provider fixtures.

GUI/manual walkthrough used merged GUI-095 source/tests and the built GUI test rail to compare every documented Settings label, project-card state, token action, rotate/revoke behavior, reconcile/remove behavior, and doctor presentation. A live public route, external client, screenshot, or Worker acceptance run was not available and is not claimed.

## Verification

- `node scripts/build-manual.mjs --check` — PASS (22 chapters).
- `npm run verify:docs` — PASS (3 remote chapters, 26 doctor ids, links/fences/canary/provider boundaries).
- `npm test` — PASS after the documented build prerequisite: core 256, GUI 337, HTTP 61, scripts 66.
- `npm run build` — PASS.
- `npm run typecheck` — PASS for core, MCP server, UI, and GUI.
- `npm run build -w @kanmer/gui` — PASS.
- `git diff --check` — PASS.
- Secret-shaped-value, unsafe-flag, real-path, and canary scans — PASS; no secrets or internal test-injection variables are in authored docs.
- Scoped duplicate search — PASS; the existing Connect/OpenAI chapter remains a deliberate separate stdio path and is linked rather than duplicated.

## Review dispositions

The first independent review found three gaps: matrix detail fields/repair-stop guidance, missing packaged/path-with-spaces and walkthrough evidence, and a verifier that did not enforce links/fences/canary or scan beyond the overview. This revision addresses all three in the authored matrix, the evidence above, and `verify-docs.mjs`. A fresh independent review is required before merge.

## Limits

No live Cloudflare DNS/TLS route, public Worker interaction, or real external-client acceptance was available. Those claims remain deferred to MCP-028 or a separately tested client. No account ids, real hostnames, credential contents, raw tokens, or machine-specific paths are included.

## Traceability

- Branch/worktree: `doc-013-provider-neutral-manual` / `.worktrees/doc-013`.
- Original implementation commit: `d187200b`; this review-hardening revision follows it.
- Stop at Review pending fresh independent review; proof belongs on merged main.
