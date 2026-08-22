# Files — CORE-041

## Where the change lands

| Path | Why |
|---|---|
| `packages/mcp-server/src/smoke.mjs` | Replace the fixed Windows drive in the POSIX-vector expected values with a drive derived from the current Windows host; retain all canonical path and fingerprint assertions. |

## Context files

| Path | What it tells the implementer |
|---|---|
| `packages/mcp-server/src/project-identity.ts` | Defines native resolution for POSIX-looking inputs on Windows, lowercase-drive normalization, and the exact ordered fingerprint payload. |
| `packages/mcp-server/src/smoke.mjs` | Contains both the failing POSIX-vector expectation and the explicit Windows-path regression vectors that must stay strict. |
| `package.json` | Names the authoritative build, smoke, typecheck, and verify commands used by the PR rail. |
| `packages/mcp-server/package.json` | Shows the server build and HTTP test entry points; no dependency change is needed for this test-only correction. |

## Ripple effects

The standalone stdio smoke and the aggregate verify rail will exercise the corrected expectation on Linux and Windows. The source-only test change does not alter the built server API, project identity implementation, fingerprint format, package manifests, CI workflow, or committed plugin bundle.

## Out of scope

Do not change `canonicalProjectPath`, `projectIdentity`, fingerprint payload ordering, explicit Windows-vector assertions, CI runner configuration, dependencies, or unrelated smoke checks. Do not alter CORE-040 release-notes test behavior or MCP-041 supervisor timing logic.
