# Proof — MCP-026

## Verified merge

- PR: #93 — https://github.com/collisionengineers/kanmer/pull/93
- Confirmed `MERGED` at 2026-08-21T00:25:35Z.
- Merged main commit verified from the main checkout: `62939b7fb6ae8d763014137f68718079eaeb9732`.
- Main was fast-forwarded to `origin/main` before the evidence below; no feature-branch output is used as proof.

## Passed evidence

| Command | Result |
|---|---|
| `npm run typecheck -w @kanmer/mcp-server` | Pass. |
| `npm test` | Pass: manual check current; core 255/255; GUI 300/300; MCP bearer/secret-file rail 3/3; scripts 55/55. |
| `npm run build` | Pass: core and MCP ESM/standalone outputs built. |
| `node packages/mcp-server/src/smoke.mjs` | Pass: **175/175**; stdio remains unchanged and self-identifying. |
| `node packages/mcp-server/src/smoke-http.mjs` | Pass: built authenticated loopback HTTP smoke, including protected token-file setup, generic pre-parse unauthorized handling, rotation/revocation, session invalidation, and secret-redaction checks. |
| `npm run smoke:protocol` | Pass: **30/30** across supported protocol versions. |
| `npm run smoke:discovery` | Pass: **13/13** discovery cases. |
| `git diff --check` and `git status --short` | Pass: clean main checkout with no generated debris. |

## Security and scope confirmation

- Bearer verification accepts only the standard Authorization Bearer form and runs before JSON body parsing/session access; the auth/file rail and built smoke cover unsafe files, malformed/wrong credentials, rotation/revocation, and no-secret output.
- Existing stdio behavior remains unauthenticated and unaffected; normal stdio smoke passes in full.
- No tunnel lifecycle, OAuth, GUI credential-store delivery, remote dispatch, or multi-token grace lifecycle was introduced; those remain explicitly deferred to [[MCP-021]], GUI-095, and [[MCP-028]].

## Repository-wide typecheck note

`npm run typecheck` remains non-green outside MCP-026 scope because `packages/ui/src/demo.tsx` supplies a `TicketDocsInfo` mock missing `documentPaths` and `scratch`. Core, MCP server, and GUI workspace checks run; the MCP server check passes. This proof does not claim that unrelated UI demo failure as a pass.
