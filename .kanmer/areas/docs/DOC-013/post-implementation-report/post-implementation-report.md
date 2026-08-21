# Post-implementation report — DOC-013

## Summary

Added the provider-neutral remote-access manual, a complete doctor troubleshooting matrix, and the Cloudflare named-tunnel appendix. Added the chapters to the compiled in-app manual and one deterministic offline docs verifier. The OpenAI Secure MCP Tunnel chapter remains separate. No remote implementation or provider infrastructure changed.

## Evidence sources

- GUI-095 merged at `3a90548662817dd17a8b5d079b0ebf4f48f989d1`; exact Settings labels, per-project state, token delivery, rotation, reconcile, remove, and doctor presentation were read from merged source/tests.
- MCP-027 merged proof at `765c3f6f3ef27ea8b7d7223267b181a19a7d0de6`; doctor schema-v1, 26-check registry, modes, statuses, repairs, redaction, and exit codes were used.
- MCP-028 is not yet merged; the manual explicitly treats public Worker success as downstream evidence and makes no public acceptance claim.

## Changes

- `docs/manual/remote-access.md`: provider-neutral HTTPS/bearer contract, GUI/headless setup, lifecycle, ownership, rotation, recovery, client guidance, and limitations.
- `docs/manual/remote-access-troubleshooting.md`: all 26 doctor ids exactly once in registry order with safe repair guidance.
- `docs/manual/providers/cloudflared.md`: supported locally managed named-tunnel boundary and provider-specific operations.
- `scripts/verify-docs.mjs` + root `verify:docs`: required chapters/anchors, exact id coverage, provider separation, forbidden-pattern checks, and generated-manual freshness.
- `scripts/build-manual.mjs`, generated chapters, manual test order, `docs/README.md`, and one root README pointer.

## Verification

- `node scripts/build-manual.mjs --check` — PASS (22 chapters).
- `npm run verify:docs` — PASS (3 remote chapters, 26 doctor ids).
- `npm test` — first run failed on the old manual chapter-order assertion and a clean-checkout core-dist absence; after updating the assertion and running the documented build-first prerequisite, exact rerun exited 0: core 256, GUI 337, HTTP 61, scripts 66.
- `npm run build` — PASS.
- `npm run typecheck` — PASS for all workspaces.
- `npm run build -w @kanmer/gui` — PASS.
- `git diff --check` — PASS.

## Limits

No live Cloudflare DNS/TLS route, public Worker interaction, screenshot walkthrough, or real external-client acceptance was available. Those claims remain deferred to MCP-028 or a separately tested client. No secrets, real hostnames, account ids, credential contents, or machine-specific paths are included.

## Traceability

- Branch/worktree: `doc-013-provider-neutral-manual` / `.worktrees/doc-013`.
- Commit: `d187200b`.
- Stop at Review for independent review; proof belongs on merged main.
