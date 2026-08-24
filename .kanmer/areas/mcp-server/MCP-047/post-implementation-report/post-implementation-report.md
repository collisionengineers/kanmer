# Post-implementation report — MCP-047

## Delivered

- Changed the generated cloudflared ingress `service` from the full loopback MCP endpoint to the validated URL origin.
- Preserved the strict requirement that the local target itself is loopback HTTP with exact `/mcp`; only the provider representation removes the path.
- Updated the adapter’s generated-config expectation and added IPv6 loopback coverage.
- Clarified the path-preserving Cloudflare behavior in the provider manual.

## Governing-doc coverage

- **FRD-025 RA-TRANSPORT-1:** The public MCP endpoint stays `/mcp`.
- **FRD-025 RA-TUNNEL-1/3/4:** The same validated loopback target and named-tunnel process boundary remain in place; no provider API or secret behavior changed.
- **ADR-0017:** The adapter-only design, bearer authentication, and one-project transport remain unchanged.

## Validation

- Commit: `ca6b3c0caff614d4ff57a908634fd5c0e4ba4328`.
- Focused tunnel rail: `node --test cloudflared-config.test.mjs cloudflared-validate.test.mjs cloudflared.test.mjs` — PASS, 17/17.
- MCP server typecheck — PASS, exit 0.
- MCP server build, including standalone artifacts — PASS, exit 0.
- Real installed cloudflared 2026.8.2 with a synthetic nonsecret config: `tunnel ingress validate` — PASS, exit 0; `tunnel ingress rule https://kanmer.example.test/mcp` — PASS, exit 0 and matched the origin-only route.
- `git diff --check` — PASS before commit.

## Limits and hand-off

- No Cloudflare account, DNS, tunnel, Worker, bearer, or credential JSON was changed by this code ticket.
- A disposable locally managed tunnel test against the approved domain is intentionally deferred to post-merge verification, so proof can exercise merged main rather than a branch artifact.
- The real CLI validation remains a protected/manual verification command; it is not an ordinary test because this Windows host can exceed the existing bounded CLI validation window and must not make CI depend on an installed provider executable.

## Reviewer focus

Confirm that deriving `new URL(valid.endpoint).origin` cannot weaken strict endpoint validation, and that the generated service no longer includes `/mcp` while public routing and manual wording retain it.

## CI remediation update — 2026-08-24

- Regenerated `apps/gui/src/renderer/src/manual/chapters.generated.ts` with `npm run build:manual` after the Cloudflared manual source edit; `npm run check:manual` now passes.
- `git diff --check` — PASS, exit 0.
- Cloudflared focused rail (`node --test cloudflared-config.test.mjs cloudflared-validate.test.mjs cloudflared.test.mjs`) — PASS, 17/17.
- `npm run typecheck -w @kanmer/mcp-server` — PASS, exit 0.
- Full `npm run verify` rebuilt successfully and passed the manual guard, then ended non-zero only because four untouched core tests timed out at Vitest's fixed 5s limit on this Windows host (306/310 tests passed). Rerunning each named test alone passed: profile default/override 1/1 (4.84s), stale-lock recovery 1/1, migration folded-block relation 1/1, and area-based ticket placement 1/1. No test assertion or timeout was changed.
- The follow-up commit is pushed to PR #232 for hosted CI, which remains the merge authority.

## Final rebase CI — 2026-08-24

- Rebasing onto merged `main` produced `e779c4a26e8ea68114774332a1a3f7f5972d6f7f` and `98c625139f3502f4862e68e8a0f8aa4b1ac0c6d0`.
- Focused Cloudflared rail remained PASS, 17/17.
- GitHub Actions run `32721382841`: `kanmer-gate` PASS (54s); `verify` PASS (3m14s).
